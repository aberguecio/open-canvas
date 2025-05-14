import { Router, Request, Response } from 'express';
import {
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from './s3Client';
import { prisma } from './prisma';

const router = Router();

// GET /images
// Devuelve solo la primera imagen con URL firmada y email del usuario
router.get('/', async (_req: Request, res: Response) => {
  const image = await prisma.image.findFirst({
    where: { isVisible: true },
    orderBy: { lastQueuedAt: 'asc' }
  });

  if (!image) {
    res.status(404).json({ error: 'No images found' });
    return 
  }

  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: image.key
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });

  const signed = {
    id:        image.id,
    name:      image.name,
    url,
    createdAt: image.createdAt,
    userName:  image.userName,
    userEmail: image.userEmail
  };

  res.json(signed);
});

export default router;