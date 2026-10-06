import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from repo root regardless of cwd
loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv(); // also try cwd/.env if present

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 3001),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
  cookieName: 'hf_rt',
  isProd: process.env.NODE_ENV === 'production',
};
