import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';

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
import { Image } from '@prisma/client';
import OpenAI from "openai";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

const openai = new OpenAI();

// Function to moderate an image by URL
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
  // Returns true if it's flagged (does not pass moderation)
  return moderation.results?.[0];
}

interface ImageProcessingSettings {
  ditheringEnabled: boolean;
  sharpenSigma: number;
  saturationMultiplier: number;
  contrastMultiplier: number;
  gamma: number;
}

async function convertTo7ColorDitheredBMP(
  inputBuffer: Buffer,
  settings: ImageProcessingSettings,
  width = 800,
  height = 480
): Promise<Buffer> {

  // 1. Resize with pre-processing: sharpen, contrast, saturation
  let sharpInstance = sharp(inputBuffer)
    .resize(width, height, { fit: 'cover' })
    .removeAlpha();

  // Apply sharpening if sigma > 0
  if (settings.sharpenSigma > 0) {
    sharpInstance = sharpInstance.sharpen({ sigma: settings.sharpenSigma });
  }

  // Apply saturation if different from 1.0
  if (settings.saturationMultiplier !== 1.0) {
    sharpInstance = sharpInstance.modulate({
      saturation: settings.saturationMultiplier,
      brightness: 1.0
    });
  }

  // Apply contrast if different from 1.0
  if (settings.contrastMultiplier !== 1.0) {
    const offset = -(128 * (settings.contrastMultiplier - 1));
    sharpInstance = sharpInstance.linear(settings.contrastMultiplier, offset);
  }

  // Apply gamma correction
  if (settings.gamma !== 1.0) {
    sharpInstance = sharpInstance.gamma(settings.gamma);
  }

  const { data, info } = await sharpInstance
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const pixels = new Uint8ClampedArray(data);

  // 2. 7-color palette (real e-ink colors)
  const PALETTE: [number, number, number][] = [
    [255, 255, 255],      // blanco (white)
    [49, 40, 66],         // negro (black)
    [189, 70, 80],        // rojo (red)
    [225, 138, 110],      // naranjo (orange)
    [251, 230, 127],      // amarillo (yellow)
    [106, 132, 119],      // verde (green)
    [93, 101, 166]        // azul (blue)
  ];

  const closestColorIndex = (r: number, g: number, b: number): number => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const [pr, pg, pb] = PALETTE[i];
      const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  // 3. Generate indices (0–6) with optional dithering
  const indexBuf = new Uint8Array(w * h);

  if (settings.ditheringEnabled) {
    // Floyd-Steinberg dithering
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 3;
        const oldR = pixels[idx], oldG = pixels[idx + 1], oldB = pixels[idx + 2];
        const ci = closestColorIndex(oldR, oldG, oldB);
        const [nr, ng, nb] = PALETTE[ci];
        indexBuf[y * w + x] = ci;
        const eR = oldR - nr, eG = oldG - ng, eB = oldB - nb;
        [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]]
          .forEach(([dx, dy, f]) => {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
            const nidx = (ny * w + nx) * 3;
            pixels[nidx] = Math.max(0, Math.min(255, pixels[nidx] + eR * f));
            pixels[nidx + 1] = Math.max(0, Math.min(255, pixels[nidx + 1] + eG * f));
            pixels[nidx + 2] = Math.max(0, Math.min(255, pixels[nidx + 2] + eB * f));
          });
      }
    }
  } else {
    // No dithering - simple nearest color
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 3;
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
        indexBuf[y * w + x] = closestColorIndex(r, g, b);
      }
    }
  }

  // 4. Build 4 bpp BMP
  const paletteSize = PALETTE.length;           // 7
  const bytesPerLine = Math.ceil(w / 2);          // 2 pix/byte
  const rowSize = ((bytesPerLine + 3) >> 2) << 2; // align to 4
  const pixelBytes = rowSize * h;
  const headerSize = 14 + 40;
  const paletteBytes = 16 * 4;                   // table of 16 entries
  const fileSize = headerSize + paletteBytes + pixelBytes;
  const bmp = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER
  bmp.writeUInt16LE(0x4D42, 0);
  bmp.writeUInt32LE(fileSize, 2);
  bmp.writeUInt32LE(0, 6);
  bmp.writeUInt32LE(headerSize + paletteBytes, 10);

  // BITMAPINFOHEADER
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(w, 18);
  bmp.writeInt32LE(h, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(4, 28);           // 4 bpp!
  bmp.writeUInt32LE(0, 30);
  bmp.writeUInt32LE(pixelBytes, 34);
  bmp.writeInt32LE(2835, 38);
  bmp.writeInt32LE(2835, 42);
  bmp.writeUInt32LE(paletteSize, 46);
  bmp.writeUInt32LE(paletteSize, 50);

  // Palette: 16 entries, fill only 7, rest stays zero
  for (let i = 0; i < paletteSize; i++) {
    const [r, g, b] = PALETTE[i];
    const off = headerSize + i * 4;
    bmp[off] = b;
    bmp[off + 1] = g;
    bmp[off + 2] = r;
    bmp[off + 3] = 0;
  }

  // 5. Pack two indices (4b each) per byte, inverted row
  const pixelDataOffset = headerSize + paletteBytes;
  for (let y = 0; y < h; y++) {
    const srcRow = h - 1 - y;
    let dst = pixelDataOffset + y * rowSize;
    for (let x = 0; x < w; x += 2) {
      const i1 = indexBuf[srcRow * w + x] & 0x0F;
      const i2 = (x + 1 < w ? indexBuf[srcRow * w + x + 1] : 0) & 0x0F;
      bmp[dst++] = (i1 << 4) | i2;
    }
    // padding between dst and (pixelDataOffset+y*rowSize) is already 0
  }

  return bmp;
}

// GET /images
// Returns list of images with signed URL and user email
router.get('/', async (_req: Request, res: Response) => {
  try {
    const images = await prisma.image.findMany({
      where: { isVisible: true },
      orderBy: { lastQueuedAt: 'asc' }
    });

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
// Requires token in Authorization Bearer or in body.token
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract token
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ')
      ? auth.slice(7)
      : req.body.token;
    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return
    }

    // Verify Google token
    let payload: { email?: string; name?: string };
    try {
      const result = await verifyGoogleToken(token);
      if (!result) {
        res.status(401).json({ error: 'Invalid token or missing data' });
        return;
      }
      payload = result;
    } catch (err) {
      console.error('Invalid token:', err);
      res.status(401).json({ error: 'Invalid token' });
      return
    }

    if (!req.file) {
      res.status(400).json({ error: 'A file must be uploaded under the field "file"' });
      return;
    }

    // Upsert user to ensure they are in the database
    const user = await prisma.user.upsert({
      where: { email: payload.email! },
      update: { name: payload.name },
      create: {
        email: payload.email!,
        name: payload.name
      }
    });

    // Check if user is banned
    if (user.isBanned) {
      res.status(403).json({
        error: 'Your account has been banned from uploading images',
        reason: user.banReason
      });
      return;
    }

    // Check if user is admin
    const isAdmin = payload.email === process.env.ADMIN_EMAIL;

    // Only check upload limit for non-admin users
    if (!isAdmin) {
      // Get upload limit from settings
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      const uploadLimit = settings?.uploadLimitPerDay || 1;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      // Count today's uploads by this user
      const uploadsToday = await prisma.image.count({
        where: {
          userEmail: payload.email!,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      if (uploadsToday >= uploadLimit) {
        res.status(429).json({ error: `You can only upload ${uploadLimit} image(s) per day` });
        return
      }
    }

    // Get image processing settings from database
    const dbSettings = await prisma.settings.findUnique({ where: { id: 1 } });
    const imageSettings: ImageProcessingSettings = {
      ditheringEnabled: dbSettings?.ditheringEnabled ?? true,
      sharpenSigma: dbSettings?.sharpenSigma ?? 1.0,
      saturationMultiplier: dbSettings?.saturationMultiplier ?? 1.15,
      contrastMultiplier: dbSettings?.contrastMultiplier ?? 1.2,
      gamma: dbSettings?.gamma ?? 2.2
    };

    // Process image
    const processed = await sharp(req.file.buffer)
      .resize(800, 480, { fit: 'cover' })
      .toFormat('webp')
      .toBuffer();

    const bmpBuffer = await convertTo7ColorDitheredBMP(processed, imageSettings)

    const baseName = req.file.originalname.replace(/\.[^/.]+$/, '');
    const fileKey = `${Date.now()}-${baseName}.webp`;
    const bmpKey = `${Date.now()}-${baseName}.bmp`;

    // Upload webp image
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
      Body: processed,
      ContentType: 'image/webp'
    }));

    // Upload bmp image
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: bmpKey,
      Body: bmpBuffer,
      ContentType: 'image/bmp'
    }));

    // Save in DB including both keys
    const image = await prisma.image.create({
      data: {
        key: fileKey,
        bmpKey: bmpKey,
        name: req.body.name || req.file.originalname,
        userName: payload.name!,
        userEmail: payload.email!
      }
    });

    // Generate signed URL for webp image
    const getCmd = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: image.key
    });
    const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 });

    // MODERATION: check the uploaded image
    const moderation = await moderateImageUrl(signedUrl);
    if (moderation.flagged) {
      // Get the categories that are true
      const categories = moderation.categories || {};
      const flaggedCategories = Object.entries(categories)
        .filter(([_, value]) => value === true)
        .map(([key]) => key)
        .join(', ');

      console.log('Flagged image:', image.id, 'Categories:', flaggedCategories);

      await prisma.image.update({
        where: { id: image.id },
        data: {
          isVisible: false,
          flagged: flaggedCategories || 'true',
        }
      });

      // Check if auto-ban is enabled
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      if (settings?.autoBanEnabled) {
        // Auto-ban the user
        await prisma.user.update({
          where: { email: payload.email! },
          data: {
            isBanned: true,
            banReason: `Auto-banned: uploaded flagged content (${flaggedCategories || 'inappropriate content'})`
          }
        });
        console.log('User auto-banned:', payload.email, 'Reason:', flaggedCategories);
      }

      res.status(422).json({ error: 'Image not allowed', categories: flaggedCategories });
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
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extract and verify the user token
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;

    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    let payload: { email?: string };
    try {
      const result = await verifyGoogleToken(token);
      if (!result || !result.email) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      payload = result;
    } catch (err) {
      console.error('Error verifying token for deletion:', err);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // 2. Get the image to delete
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    // 3. Check permissions
    const isAdmin = payload.email === process.env.ADMIN_EMAIL;
    const isOwner = payload.email === image.userEmail;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'You do not have permission to delete this image' });
      return;
    }

    // 4. Check if it is the current image (for non-admins only)
    if (!isAdmin) {
      const current = await prisma.image.findFirst({
        where: { isVisible: true },
        orderBy: { lastQueuedAt: 'asc' }
      });

      if (current && current.id === id) {
        res.status(409).json({ error: 'You cannot delete the image that is currently being displayed' });
        return;
      }
    }

    // 5. Delete from S3 and the database
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: image.key
    }));
    if (image.bmpKey) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: image.bmpKey
      }));
    }

    await prisma.image.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Error deleting image' });
  }
});

// GET /images/:id/bmp           → JSON { url: ... }
// GET /images/:id/bmp?redirect=1 → 302 Location: ...
router.get('/:id/bmp', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image || !image.bmpKey) {
      res.status(404).json({ error: 'BMP image not found' });
      return;
    }

    const cmd = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: image.bmpKey
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });

    if (req.query.redirect === '1') {
      res.redirect(url);
    } else {
      res.json({ url });
    }
  } catch (err) {
    console.error('Error fetching BMP:', err);
    res.status(500).json({ error: 'Error fetching BMP' });
  }
});

// GET /images/time
router.get('/time', async (req: Request, res: Response) => {
  try {
    // Extract token
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ')
      ? auth.slice(7)
      : req.query.token || req.body?.token;

    if (!token || typeof token !== 'string') {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    // Verify Google token
    let payload: { email?: string };
    try {
      const result = await verifyGoogleToken(token);
      if (!result || !result.email) {
        res.status(401).json({ error: 'Invalid token or missing email' });
        return;
      }
      payload = result;
    } catch (err) {
      console.error('Invalid token:', err);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Check if user is admin
    const isAdmin = payload.email === process.env.ADMIN_EMAIL;

    // Admin has no upload limit
    if (isAdmin) {
      res.json({ remainingMs: 0 });
      return;
    }

    // Find last image uploaded today by this user
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Get upload limit from settings
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const uploadLimit = settings?.uploadLimitPerDay || 1;

    // Count today's uploads by this user
    const uploadsToday = await prisma.image.count({
      where: {
        userEmail: payload.email,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    if (uploadsToday < uploadLimit) {
      // Can upload more
      res.json({ remainingMs: 0 });
      return;
    }

    // Calculate how much time until next day
    const now = new Date();
    const msToNextDay = endOfDay.getTime() - now.getTime();
    res.json({ remainingMs: msToNextDay });
  } catch (error) {
    console.error('Error checking user upload time:', error);
    res.status(500).json({ error: 'Error checking user upload time' });
  }
});

export default router;
