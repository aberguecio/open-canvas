// src/imageRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from './prisma';
import { s3 } from './s3Client';

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
    orderBy: { createdAt: 'desc' }
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

  const fileKey = `${Date.now()}-${req.file.originalname}`;

  const uploadCmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  });

  try {
    await s3.send(uploadCmd);

    const image = await prisma.image.create({
      data: {
        key:  fileKey,
        name: req.file.originalname
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

export default router;
