import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export const requireInternalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const secret = req.headers['x-internal-secret'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');

  if (!secret || secret !== config.INTERNAL_API_SECRET) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing internal API secret',
    });
    return;
  }

  next();
};
