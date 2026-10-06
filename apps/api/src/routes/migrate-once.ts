import type { FastifyPluginAsync } from 'fastify';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  app.post('/admin/run-migrations', async (req, reply) => {
    const { secret } = req.body as { secret?: string };
    const expected = process.env.MIGRATION_SECRET ?? 'havenfinder-migrate-2026';
    if (secret !== expected) {
      return reply.code(403).send({ error: 'bad secret' });
    }

    const candidates = [
      join(process.cwd(), 'packages/db/migrations'),
      join(process.cwd(), '../packages/db/migrations'),
      join(process.cwd(), '../../packages/db/migrations'),
      '/app/packages/db/migrations',
    ];

    let dir = '';
    for (const c of candidates) {
      try {
        const files = await readdir(c);
        if (files.some(f => f.endsWith('.sql'))) { dir = c; break; }
      } catch {}
    }

    if (!dir) {
      return reply.code(500).send({ error: 'migrations folder not found', tried: candidates });
    }

    const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();
    const results: { file: string; ok: boolean; error?: string }[] = [];

    for (const f of files) {
      const sql = await readFile(join(dir, f), 'utf8');
      try {
        await pool.query(sql);
        results.push({ file: f, ok: true });
      } catch (e: any) {
        results.push({ file: f, ok: false, error: e.message });
      }
    }
    return { dir, results };
  });
};

export default route;
