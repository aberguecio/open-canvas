// src/imageRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from './s3Client';
import { prisma } from './prisma';
import sharp from 'sharp';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'), false);
  }
});

// GET /api/images
router.get('/', async (_req, res) => {
  const images = await prisma.image.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const signed = await Promise.all(
    images.map(async (img) => {
      const cmd = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: img.key
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 });
      return {
        id:        img.id,
        name:      img.name,
        url,
        createdAt: img.createdAt
      };
    })
  );

  res.json(signed);
});

// POST /api/images
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'Se debe subir un archivo bajo el campo "file"' });
  }

  const processed = await sharp(req.file.buffer)
    .resize(800, 480, { fit: 'cover' })
    //.png({ palette: true, colors: 7, dither: 1.0, quality: 100 })
    .toBuffer();

  const fileKey = `${Date.now()}-${req.file.originalname}`;

  const uploadCmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
    Body: processed, //req.file.buffer,
    ContentType: req.file.mimetype
  });

  try {
    await s3.send(uploadCmd);

    const image = await prisma.image.create({
      data: {
        key:  fileKey,
        name: req.body.name || req.file.originalname
      }
    });

    const getCmd = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: image.key
    });
    const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: 60 * 60 });

    res.status(201).json({
      id:        image.id,
      name:      image.name,
      url:       signedUrl,
      createdAt: image.createdAt
    });
  } catch (err) {
    console.error('Error subiendo a S3:', err);
    res.status(500).json({ error: 'No se pudo subir el archivo' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  // 1) Busca la imagen en la BD
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }

  // 2) Elimina el objeto de S3
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: image.key
  }));

  // 3) Elimina el registro de la BD
  await prisma.image.delete({ where: { id } });

  // 4) Responde sin contenido
  res.status(204).end();
});

export default router;
