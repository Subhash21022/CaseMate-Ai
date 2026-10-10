import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  userMetadata?: Record<string, any>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts Bearer token from the Authorization header.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}

/**
 * Optional Authentication:
 * If a valid Supabase JWT Bearer token is provided, attaches req.user.
 * If no token is provided, continues without error.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token || !isSupabaseConfigured()) {
    return next();
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        userMetadata: user.user_metadata,
      };
    }
  } catch (err: any) {
    console.warn(`Optional auth verification error: ${err.message}`);
  }

  next();
}

/**
 * Required Authentication:
 * Enforces a valid Supabase JWT Bearer token.
 * Returns HTTP 401 Unauthorized if the token is missing or invalid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // In test mode, allow bypass if needed
  if (config.NODE_ENV === 'test' && !req.headers.authorization) {
    return next();
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token.',
    });
    return;
  }

  if (!isSupabaseConfigured()) {
    res.status(500).json({
      success: false,
      error: 'Supabase authentication service is not configured.',
    });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: error ? error.message : 'Invalid or expired session token.',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      userMetadata: user.user_metadata,
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: `Authentication failed: ${err.message}`,
    });
  }
}
