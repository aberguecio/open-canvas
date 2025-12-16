import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';
import { verifyGoogleToken } from './verifyGoogleToken';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from './s3Client';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Image } from '@prisma/client';

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
    const images = await prisma.image.findMany({ orderBy: { lastQueuedAt: 'desc' } });
    const signed = await Promise.all(
      images.map(async (img: Image) => {
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
          isFavorite: img.isFavorite,
          flagged: img.flagged,
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
      favs.map(async (img: Image) => {
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

// ========== USER MANAGEMENT ==========

// GET /admin/users -> List all users with stats
router.get('/users', mustBeAdmin, async (_req: Request, res: Response) => {
  try {
    const images = await prisma.image.findMany({
      select: {
        userEmail: true,
        userName: true,
        createdAt: true,
        isVisible: true,
        flagged: true,
      }
    });

    const userMap = new Map<string, {
      email: string;
      name: string;
      uploadCount: number;
      flaggedCount: number;
      lastUpload: Date;
      isBanned: boolean;
    }>();

    for (const img of images) {
      const existing = userMap.get(img.userEmail);
      if (existing) {
        existing.uploadCount++;
        if (img.flagged) existing.flaggedCount++;
        if (img.createdAt > existing.lastUpload) {
          existing.lastUpload = img.createdAt;
        }
      } else {
        userMap.set(img.userEmail, {
          email: img.userEmail,
          name: img.userName,
          uploadCount: 1,
          flaggedCount: img.flagged ? 1 : 0,
          lastUpload: img.createdAt,
          isBanned: false,
        });
      }
    }

    // Fetch all users from User table to check ban status and include users with no images if any
    const dbUsers = await prisma.user.findMany();

    for (const dbUser of dbUsers) {
      const existing = userMap.get(dbUser.email);
      if (existing) {
        existing.isBanned = dbUser.isBanned;
      } else {
        // User exists in DB but has no images (or images were deleted?)
        userMap.set(dbUser.email, {
          email: dbUser.email,
          name: dbUser.name || 'Unknown',
          uploadCount: 0,
          flaggedCount: 0,
          lastUpload: dbUser.createdAt, // fallback
          isBanned: dbUser.isBanned,
        });
      }
    }

    const users = Array.from(userMap.values()).sort(
      (a, b) => b.uploadCount - a.uploadCount
    );

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// GET /admin/users/:email -> Get specific user details
router.get('/users/:email', mustBeAdmin, async (req: Request, res: Response) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const images = await prisma.image.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: 'desc' },
    });

    if (images.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const signed = await Promise.all(
      images.map(async (img: Image) => {
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
          isVisible: img.isVisible,
          isFavorite: img.isFavorite,
          flagged: img.flagged,
        };
      })
    );

    res.json({
      email,
      name: images[0].userName,
      uploadCount: images.length,
      images: signed,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});

// POST /admin/users/:email/ban -> Ban user
router.post('/users/:email/ban', mustBeAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = decodeURIComponent(req.params.email);
    const reason = req.body.reason || null;

    const user = await prisma.user.upsert({
      where: { email },
      update: { isBanned: true, banReason: reason },
      create: { email, isBanned: true, banReason: reason }
    });

    res.json(user);
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Error banning user' });
  }
});

// DELETE /admin/users/:email/ban -> Unban user
router.delete('/users/:email/ban', mustBeAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = decodeURIComponent(req.params.email);

    await prisma.user.update({
      where: { email },
      data: { isBanned: false, banReason: null }
    });

    res.status(204).end();
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      console.error('Error unbanning user:', error);
      res.status(500).json({ error: 'Error unbanning user' });
    }
  }
});

// ========== CONTENT MODERATION ==========

// GET /admin/flagged -> Get all flagged images
router.get('/flagged', mustBeAdmin, async (_req: Request, res: Response) => {
  try {
    const flagged = await prisma.image.findMany({
      where: { flagged: { not: null } },
      orderBy: { createdAt: 'desc' }
    });

    const signed = await Promise.all(
      flagged.map(async (img: Image) => {
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
          flagged: img.flagged,
          isVisible: img.isVisible,
        };
      })
    );

    res.json(signed);
  } catch (error) {
    console.error('Error fetching flagged images:', error);
    res.status(500).json({ error: 'Error fetching flagged images' });
  }
});

// POST /admin/:id/flag -> Flag image as inappropriate
router.post('/:id/flag', mustBeAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const reason = req.body.reason || 'Manually flagged by admin';

    const img = await prisma.image.update({
      where: { id },
      data: {
        flagged: reason,
        isVisible: false,
      }
    });

    res.json(img);
  } catch (error) {
    console.error('Error flagging image:', error);
    res.status(500).json({ error: 'Error flagging image' });
  }
});

// DELETE /admin/:id/flag -> Unflag image (approve it)
router.delete('/:id/flag', mustBeAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const img = await prisma.image.update({
      where: { id },
      data: {
        flagged: null,
        isVisible: true,
      }
    });

    res.json(img);
  } catch (error) {
    console.error('Error unflagging image:', error);
    res.status(500).json({ error: 'Error unflagging image' });
  }
});

// ========== SETTINGS ==========

// GET /admin/settings -> Get current settings
router.get('/settings', mustBeAdmin, async (_req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          uploadLimitPerDay: 1,
          rotationIntervalHours: 4,
          defaultImageDurationHours: 24,
          autoBanEnabled: false,
          // Image processing defaults
          ditheringEnabled: true,
          sharpenSigma: 1.0,
          saturationMultiplier: 1.15,
          contrastMultiplier: 1.2,
          gamma: 2.2
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

// PUT /admin/settings -> Update settings
router.put('/settings', mustBeAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      uploadLimitPerDay,
      rotationIntervalHours,
      defaultImageDurationHours,
      autoBanEnabled,
      // Image processing settings
      ditheringEnabled,
      sharpenSigma,
      saturationMultiplier,
      contrastMultiplier,
      gamma
    } = req.body;

    const settings = await prisma.settings.update({
      where: { id: 1 },
      data: {
        uploadLimitPerDay: uploadLimitPerDay !== undefined ? uploadLimitPerDay : undefined,
        rotationIntervalHours: rotationIntervalHours !== undefined ? rotationIntervalHours : undefined,
        defaultImageDurationHours: defaultImageDurationHours !== undefined ? defaultImageDurationHours : undefined,
        autoBanEnabled: autoBanEnabled !== undefined ? autoBanEnabled : undefined,
        // Image processing settings
        ditheringEnabled: ditheringEnabled !== undefined ? ditheringEnabled : undefined,
        sharpenSigma: sharpenSigma !== undefined ? sharpenSigma : undefined,
        saturationMultiplier: saturationMultiplier !== undefined ? saturationMultiplier : undefined,
        contrastMultiplier: contrastMultiplier !== undefined ? contrastMultiplier : undefined,
        gamma: gamma !== undefined ? gamma : undefined,
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Error updating settings' });
  }
});

export default router;
