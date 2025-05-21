import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { Jimp, JimpMime  } from 'jimp';          // 👈  NUEVA forma
import { s3 } from './s3Client';
import { prisma } from './prisma';
import { verifyGoogleToken } from './verifyGoogleToken';
import { Image } from '@prisma/client';
import OpenAI from "openai";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

const openai = new OpenAI();

// Función para moderar una imagen por URL
async function moderateImageUrl(imageUrl: string): Promise<any> {
  const moderation = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: [
      {
        type: "image_url",
        image_url: { url: imageUrl }
      }
    ]
  });
  // Devuelve true si está flaggeada (no pasa la moderación)
  return moderation.results?.[0];
}

async function convertTo7ColorDitheredBMP(
  inputBuffer: Buffer,
  width = 800,
  height = 480
): Promise<Buffer> {
  // 1) Redimensiona y extrae raw RGB
  const { data, info } = await sharp(inputBuffer)
    .resize(width, height, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const pixels = new Uint8ClampedArray(data); // [R,G,B, R,G,B, …]

  // 2) Define paleta de 7 colores + blanco
  const PALETTE: [number, number, number][] = [
    [255, 255, 255], // blanco
    [0,   0,   0  ], // negro
    [255, 0,   0  ], // rojo
    [255, 165, 0  ], // naranja
    [255, 255, 0  ], // amarillo
    [0,   128, 0  ], // verde
    [0,   0,   255]  // azul
  ];

  // auxiliar: encuentra índice del color más cercano
  function closestColorIndex(r: number, g: number, b: number): number {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const [pr, pg, pb] = PALETTE[i];
      const dr = r - pr, dg = g - pg, db = b - pb;
      const dist = dr*dr + dg*dg + db*db;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  // 3) Floyd–Steinberg dithering
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      const oldR = pixels[idx];
      const oldG = pixels[idx+1];
      const oldB = pixels[idx+2];

      const ci = closestColorIndex(oldR, oldG, oldB);
      const [newR, newG, newB] = PALETTE[ci];

      // establece nuevo color
      pixels[idx]   = newR;
      pixels[idx+1] = newG;
      pixels[idx+2] = newB;

      // error
      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      // difundir
      const diffuse = (dx: number, dy: number, factor: number) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
        const nidx = (ny * w + nx) * 3;
        pixels[nidx  ] = Math.max(0, Math.min(255, pixels[nidx  ] + errR * factor));
        pixels[nidx+1] = Math.max(0, Math.min(255, pixels[nidx+1] + errG * factor));
        pixels[nidx+2] = Math.max(0, Math.min(255, pixels[nidx+2] + errB * factor));
      };

      diffuse( 1,  0, 7/16);
      diffuse(-1,  1, 3/16);
      diffuse( 0,  1, 5/16);
      diffuse( 1,  1, 1/16);
    }
  }

  // 4) Reconstruye BMP desde raw RGB
  const pngBuffer = await sharp(Buffer.from(pixels), {
    raw: { width: w, height: h, channels: 3 }
  })
    .toFormat('png')
    .toBuffer();

  const outBuffer = await (await Jimp.read(pngBuffer)).getBuffer(JimpMime.bmp);

  return outBuffer;
}

// GET /images
// Devuelve lista de imágenes con URL firmada y email del usuario
router.get('/', async (_req: Request, res: Response) => {
  try {
    const images = await prisma.image.findMany({
      where: { isVisible: true },
      orderBy: { lastQueuedAt: 'asc' }
    });

    const signed = await Promise.all(
      images.map(async (img:Image) => {
        const cmd = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: img.key
        });
        const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
        return {
          id: img.id,
          name: img.name,
          url,
          createdAt: img.createdAt,
          userName: img.userName,
          userEmail: img.userEmail
        };
      })
    );

    res.json(signed);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Error fetching images' });
  }
});

// POST /images
// Requiere token en Authorization Bearer o en body.token
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Extrae token
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ')
      ? auth.slice(7)
      : req.body.token;
    if (!token) {
      res.status(401).json({ error: 'Token faltante' });
      return 
    }

    // Verifica Google token
    let payload: { email?: string; name?: string };
    try {
      const result = await verifyGoogleToken(token);
      if (!result) {
        res.status(401).json({ error: 'Token inválido o no contiene datos' });
        return;
      }
      payload = result;
    } catch (err) {
      console.error('Token inválido:', err);
      res.status(401).json({ error: 'Token inválido' });
      return 
    }

    if (!req.file) {
      res.status(400).json({ error: 'Se debe subir un archivo bajo el campo "file"' });
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Cuenta subidas hoy por este usuario
    const uploadsToday = await prisma.image.count({
      where: {
        userEmail: payload.email!,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (uploadsToday >= 1) {
      res.status(429).json({ error: 'Solo puedes subir una imagen al día' });
      return 
    }

    // Procesa imagen
    const processed = await sharp(req.file.buffer)
      .resize(800, 480, { fit: 'cover' })
      .toFormat('webp')
      .toBuffer();

    const bmpBuffer = await convertTo7ColorDitheredBMP(processed)

    const baseName = req.file.originalname.replace(/\.[^/.]+$/, '');
    const fileKey = `${Date.now()}-${baseName}.webp`;
    const bmpKey = `${Date.now()}-${baseName}.bmp`;

    // Sube imagen webp
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
      Body: processed,
      ContentType: 'image/webp'
    }));

    // Sube imagen bmp
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: bmpKey,
      Body: bmpBuffer,
      ContentType: 'image/bmp'
    }));

    // Guarda en BD incluyendo ambos keys
    const image = await prisma.image.create({
      data: {
        key: fileKey,
        bmpKey: bmpKey,
        name: req.body.name || req.file.originalname,
        userName: payload.name!,
        userEmail: payload.email!
      }
    });

    // Genera URL firmada para la imagen webp
    const getCmd = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: image.key
    });
    const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 });

    // MODERACIÓN: verifica la imagen subida
    const moderation = await moderateImageUrl(signedUrl);
    if (moderation.flagged) {
      // Obtiene las categorías que son true
      const categories = moderation.categories || {};
      const flaggedCategories = Object.entries(categories)
        .filter(([_, value]) => value === true)
        .map(([key]) => key)
        .join(', ');

      console.log('Imagen flaggeada:', image.id, 'Categorías:', flaggedCategories);

      await prisma.image.update({
        where: { id: image.id },
        data: { 
          isVisible: false,
          flagged: flaggedCategories || 'true',
        }
      });
      res.status(422).json({ error: 'Imagen no permitida', categories: flaggedCategories });
      return;
    }

    res.status(201).json({
      id: image.id,
      name: image.name,
      url: signedUrl,
      createdAt: image.createdAt,
      userEmail: image.userEmail,
      userName: image.userName
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Error uploading image' });
  }
});

// DELETE /images/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return 
    }

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) {
      res.status(404).json({ error: 'Imagen no encontrada' });
      return 
    }

    const current = await prisma.image.findFirst({
      where: { isVisible: true },
      orderBy: { lastQueuedAt: 'asc' }
    });

    if (current && current.id === id) {
      res.status(409).json({ error: 'No se puede eliminar la imagen actual' });
      return 
    }

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: image.key
    }));

    await prisma.image.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Error deleting image' });
  }
});

// GET /images/time
router.get('/time', async (req: Request, res: Response) => {
  try {
    // Extrae token
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ')
      ? auth.slice(7)
      : req.query.token || req.body?.token;

    if (!token || typeof token !== 'string') {
      res.status(401).json({ error: 'Token faltante' });
      return;
    }

    // Verifica Google token
    let payload: { email?: string };
    try {
      const result = await verifyGoogleToken(token);
      if (!result || !result.email) {
        res.status(401).json({ error: 'Token inválido o no contiene email' });
        return;
      }
      payload = result;
    } catch (err) {
      console.error('Token inválido:', err);
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    // Busca la última imagen subida hoy por este usuario
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const lastImage = await prisma.image.findFirst({
      where: {
        userEmail: payload.email,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!lastImage) {
      // Puede subir inmediatamente
      res.json({ remainingMs: 0 });
      return;
    }

    // Calcula cuánto falta para el próximo día
    const now = new Date();
    const msToNextDay = endOfDay.getTime() - now.getTime();
    res.json({ remainingMs: msToNextDay });
  } catch (error) {
    console.error('Error checking user upload time:', error);
    res.status(500).json({ error: 'Error checking user upload time' });
  }
});



export default router;
