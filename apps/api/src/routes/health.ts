import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    let database = 'down';
    try {
      await pool.query('SELECT 1');
      database = 'up';
    } catch {}

    return {
      status: 'ok',
      service: 'havenfinder-api',
      version: '0.1.0',
      database,
      storage: 'not-configured',
      timestamp: new Date().toISOString(),
    };
  });
};

export default route;
