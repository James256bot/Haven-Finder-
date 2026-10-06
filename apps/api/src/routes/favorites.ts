import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  // POST /listings/:id/favorite — toggle on
  app.post('/listings/:id/favorite', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const uid = req.user!.sub;

    const exists = await pool.query(
      `SELECT 1 FROM listings WHERE id = $1 AND status = 'published'`,
      [id],
    );
    if (!exists.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }

    await pool.query(
      `INSERT INTO favorites (user_id, listing_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, listing_id) DO NOTHING`,
      [uid, id],
    );

    await pool.query(
      `UPDATE listings
       SET favorite_count = (SELECT COUNT(*) FROM favorites WHERE listing_id = $1)
       WHERE id = $1`,
      [id],
    );

    return { success: true, data: { favorited: true } };
  });

  // DELETE /listings/:id/favorite — toggle off
  app.delete('/listings/:id/favorite', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const uid = req.user!.sub;

    await pool.query(
      `DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2`,
      [uid, id],
    );

    await pool.query(
      `UPDATE listings
       SET favorite_count = (SELECT COUNT(*) FROM favorites WHERE listing_id = $1)
       WHERE id = $1`,
      [id],
    );

    return { success: true, data: { favorited: false } };
  });

  // GET /me/favorites
  app.get('/me/favorites', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT
         l.id, l.slug, l.title, l.description,
         l.city, l.country, l.country_code, l.latitude, l.longitude,
         l.bedrooms, l.bathrooms, l.property_type,
         l.listing_type, l.price_amount, l.price_usd_cents, l.currency,
         l.price_period, l.main_image_url, l.verification,
         l.is_featured, l.source_code, l.source_url,
         f.created_at AS favorited_at
       FROM favorites f
       JOIN listings l ON l.id = f.listing_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT 200`,
      [req.user!.sub],
    );
    return { success: true, data: { favorites: r.rows } };
  });

  // GET /me/favorites/ids — just IDs for marking UI state
  app.get('/me/favorites/ids', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT listing_id FROM favorites WHERE user_id = $1`,
      [req.user!.sub],
    );
    return { success: true, data: { ids: r.rows.map((x: any) => x.listing_id) } };
  });
};

export default route;
