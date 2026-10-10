import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  // GET /notifications
  app.get('/notifications', { preHandler: [app.authenticate] }, async (req) => {
    const uid = req.user!.sub;
    const r = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [uid],
    );
    const unread = await pool.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false`,
      [uid],
    );
    return { success: true, data: { notifications: r.rows, unread: unread.rows[0].n } };
  });

  // PATCH /notifications/:id/read
  app.patch('/notifications/:id/read', { preHandler: [app.authenticate] }, async (req) => {
    const uid = req.user!.sub;
    const { id } = req.params as { id: string };
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, uid],
    );
    return { success: true };
  });

  // POST /notifications/read-all
  app.post('/notifications/read-all', { preHandler: [app.authenticate] }, async (req) => {
    const uid = req.user!.sub;
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [uid],
    );
    return { success: true };
  });
};

export default route;
