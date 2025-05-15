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
  origin: process.env.VITE_API_URL,  // o '*' si quieres permitir desde cualquier origen
  methods: ['GET','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

console.log('CORS enabled for:', process.env.VITE_API_URL);

// CORS abierto solo para /api/public
app.use('/api/v1/image', cors(), publicRoutes);

app.use('/api/images', imageRoutes);

app.use('/api/admin', adminRoutes);

app.get('/api/remaining-time', (_req, res) => {
  const ms = getRemainingMs();
  const hours = ms / (1000 * 60 * 60);
  res.json({ ms, hours });
});

app.listen(4000, () => console.log('🚀 API on :4000'));