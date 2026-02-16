
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import resetRoutes from './routes/reset.js';
import userRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';


// import dotenv from 'dotenv';
dotenv.config();

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : undefined });

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

console.log("Gemini Key Loaded:", !!process.env.GEMINI_API_KEY);


import cookieParser from 'cookie-parser';

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/password-resets', resetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

