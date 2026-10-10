import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  // POST /saved-searches { name, raw, filters }
  app.post('/saved-searches', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = req.user!.sub;
    const body = req.body as { name?: string; raw?: string; filters?: any };
    if (!body.raw || !body.raw.trim()) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID', message: 'raw query is required' },
      });
    }
    const name = (body.name ?? body.raw).slice(0, 255);
    const filters = body.filters ?? {};

    // Prevent exact duplicates
    const existing = await pool.query(
      `SELECT id FROM saved_searches WHERE user_id = $1 AND name = $2 LIMIT 1`,
      [uid, name],
    );
    if (existing.rowCount) {
      return { success: true, data: { saved: existing.rows[0], duplicate: true } };
    }

    const r = await pool.query(
      `INSERT INTO saved_searches (user_id, name, filters)
       VALUES ($1, $2, $3) RETURNING *`,
      [uid, name, JSON.stringify({ ...filters, raw: body.raw })],
    );
    return { success: true, data: { saved: r.rows[0] } };
  });

  // GET /saved-searches
  app.get('/saved-searches', { preHandler: [app.authenticate] }, async (req) => {
    const uid = req.user!.sub;
    const r = await pool.query(
      `SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC`,
      [uid],
    );
    return { success: true, data: { saved: r.rows } };
  });

  // DELETE /saved-searches/:id
  app.delete('/saved-searches/:id', { preHandler: [app.authenticate] }, async (req) => {
    const uid = req.user!.sub;
    const { id } = req.params as { id: string };
    await pool.query(
      `DELETE FROM saved_searches WHERE id = $1 AND user_id = $2`,
      [id, uid],
    );
    return { success: true };
  });
};

export default route;
