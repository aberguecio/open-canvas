// src/imageRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from './prisma';
import { s3 } from './s3Client';
import crypto from 'crypto';

const router = Router();

// configuramos multer para guardar el fichero en memoria
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (_req, res) => {
  const images = await prisma.image.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(images);
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Se debe subir un archivo bajo el campo "file"' });
  }

  // Generamos un nombre de objeto único
  const fileKey = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${req.file.originalname}`;

  // Preparamos comando de subida
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: fileKey,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  });

  try {
    // Subimos a S3
    await s3.send(cmd);

    // Construimos la URL pública
    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Guardamos en la BD
    const image = await prisma.image.create({
      data: {
        url,
        name: req.file.originalname
      }
    });

    res.status(201).json(image);

  } catch (err) {
    console.error('Error subiendo a S3:', err);
    res.status(500).json({ error: 'No se pudo subir el archivo' });
  }
});

export default router;
