import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { caseRoutes } from './routes/caseRoutes.js';
import { documentRoutes } from './routes/documentRoutes.js';
import { internalRoutes } from './routes/internalRoutes.js';
import { optionalAuth } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = (): express.Application => {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: [config.FRONTEND_ORIGIN, 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-secret'],
    })
  );

  // Body Parsers
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Attach optional Supabase auth context to all incoming requests
  app.use(optionalAuth);

  // Request logging in development
  if (config.NODE_ENV !== 'test') {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  // API Routes
  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/cases/:id/documents', documentRoutes);
  app.use('/api/internal', internalRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
