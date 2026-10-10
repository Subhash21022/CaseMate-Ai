import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { config } from '../config/env.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1;

  let n8nHealthy = false;
  try {
    const resp = await axios.get(`${config.N8N_BASE_URL}/healthz`, { timeout: 2000 });
    n8nHealthy = resp.status === 200;
  } catch {
    n8nHealthy = false;
  }

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnected ? 'connected' : 'disconnected',
      n8n: n8nHealthy ? 'reachable' : 'unreachable',
    },
    version: '1.0.0',
  });
});

export const healthRoutes = router;
