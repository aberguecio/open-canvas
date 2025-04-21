import { Router } from 'express';
import multer from 'multer';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { s3 } from './s3Client';
import { prisma } from './prisma';
import { verifyGoogleToken } from './verifyGoogleToken';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'), false);
  }
});

// GET /api/images
// Devuelve lista de imágenes con URL firmada y email del usuario
router.get('/', async (_req, res) => {
  const images = await prisma.image.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const signed = await Promise.all(
    images.map(async (img) => {
      const cmd = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: img.key
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
      return {
        id:        img.id,
        name:      img.name,
        url,
        createdAt: img.createdAt,
        userEmail: img.userEmail    // agregamos email
      };
    })
  );

  res.json(signed);
});

// POST /api/images
// Requiere token en Authorization Bearer o en body.token
router.post('/', upload.single('file'), async (req, res) => {
  // Extrae token
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ')
    ? auth.slice(7)
    : req.body.token;
  if (!token) {
    return res.status(401).json({ error: 'Token faltante' });
  }

  // Verifica Google token
  let payload;
  try {
    payload = await verifyGoogleToken(token);
  } catch (err) {
    console.error('Token inválido:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Se debe subir un archivo bajo el campo "file"' });
  }

  // Procesa imagen
  const processed = await sharp(req.file.buffer)
    .resize(800, 480, { fit: 'cover' })
    .toBuffer();

  const fileKey = `${Date.now()}-${req.file.originalname}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
    Body: processed,
    ContentType: req.file.mimetype
  }));

  // Guarda en BD incluyendo email
  const image = await prisma.image.create({
    data: {
      key:       fileKey,
      name:      req.body.name || req.file.originalname,
      userEmail: payload.email!
    }
  });

  // Genera URL firmada
  const getCmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: image.key
  });
  const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 });

  res.status(201).json({
    id:        image.id,
    name:      image.name,
    url:       signedUrl,
    createdAt: image.createdAt,
    userEmail: image.userEmail
  });
});

// DELETE /api/images/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }

  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: image.key
  }));

  await prisma.image.delete({ where: { id } });
  res.status(204).end();
});

export default router;
