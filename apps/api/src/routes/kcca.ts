import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  // GET /kcca/lookup?q=ntinda — search by division, parish, village, street, name
  app.get('/kcca/lookup', async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const limit = Math.min(Number(q.limit ?? 30), 100);
    const search = (q.q ?? '').trim();

    if (!search) {
      const r = await pool.query(
        `SELECT object_id, property_name, division, parish, village, street,
                house_number, payment_status, latitude, longitude
         FROM kcca_properties
         WHERE latitude IS NOT NULL
         ORDER BY object_id
         LIMIT $1`,
        [limit],
      );
      return { success: true, data: { properties: r.rows, total: r.rowCount } };
    }

    const pattern = `%${search}%`;
    const r = await pool.query(
      `SELECT object_id, property_name, division, parish, village, street,
              house_number, payment_status, latitude, longitude
       FROM kcca_properties
       WHERE (division ILIKE $1 OR parish ILIKE $1 OR village ILIKE $1
              OR street ILIKE $1 OR property_name ILIKE $1)
         AND latitude IS NOT NULL
       LIMIT $2`,
      [pattern, limit],
    );
    return { success: true, data: { properties: r.rows, total: r.rowCount } };
  });

  // GET /kcca/stats — summary
  app.get('/kcca/stats', async () => {
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(DISTINCT division)::int AS divisions,
        COUNT(DISTINCT parish)::int AS parishes,
        COUNT(DISTINCT village)::int AS villages
      FROM kcca_properties`);
    return { success: true, data: r.rows[0] };
  });
};

export default route;
