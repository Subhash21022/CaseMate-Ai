import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/casemate_ai'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  INTERNAL_API_SECRET: z.string().default('casemate_dev_secret_key_892347'),
  N8N_BASE_URL: z.string().default('http://localhost:5678'),
  N8N_WEBHOOK_PATH: z.string().default('/webhook/casemate-analysis'),
  N8N_USE_TEST_WEBHOOK: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(false)),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-3.5-sonnet'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('case-documents'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Environment configuration error');
}

export const config = parsedEnv.data;
