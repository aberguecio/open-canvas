import express from 'express';
import { prisma } from './prisma';
import cors from 'cors';
import imageRoutes from './imageRoutes';
import adminRoutes from './adminRoutes';
import publicRoutes from './publicRoutes';
import './scheduler';
import { getRemainingMs } from './scheduler';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: process.env.VITE_API_URL,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

console.log('CORS enabled for:', process.env.VITE_API_URL);

// CORS abierto solo para /api/public
app.use('/api/v1/images', cors(), publicRoutes);

app.use('/api/images', imageRoutes);

app.use('/api/admin', adminRoutes);

app.get('/api/remaining-time', (_req, res) => {
  const ms = getRemainingMs();
  const hours = ms / (1000 * 60 * 60);
  res.json({ ms, hours });
});

// User status endpoint to check if user is banned
app.get('/api/user/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const { verifyGoogleToken } = await import('./verifyGoogleToken');
    const payload = await verifyGoogleToken(token);

    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { isBanned: true, banReason: true }
    });

    res.json({
      isBanned: user?.isBanned || false,
      banReason: user?.banReason || null
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(4000, () => console.log('🚀 API on :4000'));