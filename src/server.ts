// src/server.ts (exemplo de como integrar)

import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import adScraperRoutes from './routes/adScraperRoutes';
import mediaProxyRoutes from './routes/mediaProxyRoutes';
import path from 'path';
import adRoutes from './routes/adRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/scraper', adScraperRoutes);
app.use('/api/media', mediaProxyRoutes);
app.use('/api/ads', adRoutes);
app.use('/media', express.static(path.join(__dirname, '..', 'public', 'media')));

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: error.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});