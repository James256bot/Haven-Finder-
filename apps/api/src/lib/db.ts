import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error('[pg pool] error on idle client:', err.message);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
