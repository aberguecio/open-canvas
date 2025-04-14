// src/imageRoutes.ts
import { Router } from 'express';
import { prisma } from './prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const images = await prisma.image.findMany();
  res.json(images);
});

router.post('/', async (req, res) => {
  const { url, name } = req.body;
  const image = await prisma.image.create({ data: { url, name } });
  res.status(201).json(image);
});

export default router;
