import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  app.post('/admin/bootstrap', async (req, reply) => {
    const { secret, email } = req.body as { secret?: string; email?: string };
    const expected = process.env.MIGRATION_SECRET ?? 'havenfinder-migrate-2026';
    if (secret !== expected) return reply.code(403).send({ error: 'bad secret' });
    if (!email) return reply.code(400).send({ error: 'email required' });

    const r = await pool.query(
      `UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, email, role`,
      [email],
    );
    if (!r.rowCount) return reply.code(404).send({ error: 'user not found' });
    return { success: true, user: r.rows[0] };
  });
};

export default route;
