import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379/0'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  LOG_LEVEL: z.string().default('info'),
  FRONTEND_URL: z.string().default('http://127.0.0.1:3000'),
  CORS_ORIGINS: z.string().default('http://127.0.0.1:3000'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuration error:', parsed.error.format());
  process.exit(1);
}

export const config = { ...parsed.data, isDev: true } as const;
