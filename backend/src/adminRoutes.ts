import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';
import { verifyGoogleToken } from './verifyGoogleToken';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from './s3Client';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();
const adminEmail = process.env.ADMIN_EMAIL!; // Ensure this environment variable is set

// Middleware para verificar token y rol admin
function mustBeAdmin(req: Request, res: Response, next: NextFunction): void {
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
    res.status(401).json({ error: 'Token faltante' });
    return;
  }

  verifyGoogleToken(token)
    .then((result) => {
      const payload = result || { email: undefined };
      
      if (payload.email !== adminEmail) {
        res.status(403).json({ error: 'Solo admin' });
        return;
      }
      
      next();
    })
    .catch((err) => {
      console.error('Token inválido admin:', err);
      res.status(401).json({ error: 'Token inválido' });
    });
}

// GET /admin/all -> todas las imágenes con URL firmada
router.get('/all', mustBeAdmin, async (_req: Request, res: Response) => {
  try {
    const images = await prisma.image.findMany({ orderBy: { createdAt: 'desc' } });
    const signed = await Promise.all(
      images.map(async (img) => {
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
          userEmail: img.userEmail,
          isVisible: img.isVisible,
          isFavorite: img.isFavorite
        };
      })
    );
    res.json(signed);
  } catch (error) {
    console.error('Error fetching all images:', error);
    res.status(500).json({ error: 'Error fetching all images' });
  }
});

// GET /admin/favorites -> solo favoritos con URL firmada
router.get('/favorites', mustBeAdmin, async (_req: Request, res: Response) => {
  try {
    const favs = await prisma.image.findMany({
      where: { isFavorite: true },
      orderBy: { lastQueuedAt: 'desc' }
    });
    const signed = await Promise.all(
      favs.map(async (img) => {
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
          userEmail: img.userEmail,
          isVisible: img.isVisible,
          isFavorite: img.isFavorite
        };
      })
    );
    res.json(signed);
  } catch (error) {
    console.error('Error fetching favorite images:', error);
    res.status(500).json({ error: 'Error fetching favorite images' });
  }
});

// POST /admin/:id/favorite -> marcar favorito
router.post('/:id/favorite', mustBeAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const fav = await prisma.image.update({
      where: { id },
      data: { isFavorite: true }
    });
    res.json(fav);
  } catch (error) {
    console.error('Error marking favorite:', error);
    res.status(500).json({ error: 'Error marking favorite' });
  }
});
// DELETE /admin/:id/favorite -> desmarcar favorito
router.delete('/:id/favorite', mustBeAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const fav = await prisma.image.update({
      where: { id },
      data: { isFavorite: false }
    });
    res.json(fav);
  } catch (error) {
    console.error('Error unmarking favorite:', error);
    res.status(500).json({ error: 'Error unmarking favorite' });
  }
});

// POST /admin/:id/requeue -> reencolar imagen
router.post('/:id/requeue', mustBeAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const img = await prisma.image.update({
      where: { id },
      data: {
        isVisible: true,
        lastQueuedAt: new Date()
      }
    });

    res.json(img);
  } catch (error) {
    console.error('Error requeuing image:', error);
    res.status(500).json({ error: 'Error requeuing image' });
  }
});

export default router;
