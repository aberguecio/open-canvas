import { Router } from 'express';
import { prisma } from './prisma';
import { verifyGoogleToken } from './verifyGoogleToken';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from './s3Client';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();
const adminEmail = process.env.ADMIN_EMAIL!; // e.g. "agustinberguecio@gmail.com"

// Middleware para verificar token y rol admin
async function mustBeAdmin(req, res, next) {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  } else if (req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token faltante' });
  }

  let payload;
  try {
    payload = await verifyGoogleToken(token);
  } catch (err) {
    console.error('Token inválido admin:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (payload.email !== adminEmail) {
    return res.status(403).json({ error: 'Solo admin' });
  }

  next();
}

// GET /admin/all  -> todas las imágenes con URL firmada
router.get('/all', mustBeAdmin, async (_req, res) => {
  const images = await prisma.image.findMany({ orderBy: { createdAt: 'desc' } });
  const signed = await Promise.all(
    images.map(async (img) => {
      const cmd = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: img.key
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
      return {
        id:         img.id,
        name:       img.name,
        url,
        createdAt:  img.createdAt,
        userName:   img.userName,
        userEmail:  img.userEmail,
        isVisible:  img.isVisible,
        isFavorite: img.isFavorite
      };
    })
  );
  res.json(signed);
});

// GET /admin/favorites  -> solo favoritos con URL firmada
router.get('/favorites', mustBeAdmin, async (_req, res) => {
  const favs = await prisma.image.findMany({
    where: { isFavorite: true },
    orderBy: { createdAt: 'desc' }
  });
  const signed = await Promise.all(
    favs.map(async (img) => {
      const cmd = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: img.key
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
      return {
        id:         img.id,
        name:       img.name,
        url,
        createdAt:  img.createdAt,
        userName:   img.userName,
        userEmail:  img.userEmail,
        isVisible:  img.isVisible,
        isFavorite: img.isFavorite
      };
    })
  );
  res.json(signed);
});

// POST /admin/:id/favorite -> marcar favorito
router.post('/:id/favorite', mustBeAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const fav = await prisma.image.update({
    where: { id },
    data: { isFavorite: true }
  });
  res.json(fav);
});

// DELETE /admin/:id/favorite -> desmarcar favorito
router.delete('/:id/favorite', mustBeAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const fav = await prisma.image.update({
    where: { id },
    data: { isFavorite: false }
  });
  res.json(fav);
});

// POST /admin/:id/requeue -> reencolar imagen
router.post('/:id/requeue', mustBeAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const img = await prisma.image.update({
    where: { id },
    data: {
      isVisible: true,
      createdAt: new Date()
    }
  });
  res.json(img);
});

export default router;
