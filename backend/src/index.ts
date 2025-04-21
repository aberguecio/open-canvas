import express from 'express';
import { prisma } from './prisma';
import cors from 'cors';
import imageRoutes from './imageRoutes';
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

app.get('/api/users', async (_req, res) => {
  res.json(await prisma.user.findMany());
});

app.post('/api/users', async (req, res) => {
  const user = await prisma.user.create({ data: req.body });
  res.status(201).json(user);
});

app.use('/api/images', imageRoutes);

app.listen(3000, () => console.log('🚀 API on :3000'));