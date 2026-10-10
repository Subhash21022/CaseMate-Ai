import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseAdmin, getSupabasePublic, isSupabaseConfigured } from '../config/supabase.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

const authBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// POST /api/auth/signup — Register a legal aid worker
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ success: false, error: 'Supabase auth is not configured' });
      return;
    }

    const { email, password } = authBodySchema.parse(req.body);
    const supabase = getSupabasePublic();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Check email for confirmation if required.',
      data: {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        session: data.session,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — Sign in and get session JWT
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ success: false, error: 'Supabase auth is not configured' });
      return;
    }

    const { email, password } = authBodySchema.parse(req.body);
    const supabase = getSupabasePublic();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data: {
        user: { id: data.user.id, email: data.user.email },
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresIn: data.session.expires_in,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — Get profile of currently authenticated user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: req.user,
  });
});

export const authRoutes = router;
