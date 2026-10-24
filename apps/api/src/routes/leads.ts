import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';

const TrackBody = z.object({
  listingId: z.string().uuid(),
  channel: z.enum(['whatsapp', 'message', 'viewing', 'video_inspection']),
});

const route: FastifyPluginAsync = async (app) => {
  // ── POST /leads/track ─────────────────────────────────
  // Public (no auth required). Anonymous users count too.
  app.post('/leads/track', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = TrackBody.parse(req.body);
    const userId = req.user?.sub ?? null;

    // Confirm listing exists & is visible — avoid polluting with junk
    const check = await pool.query(
      `SELECT 1 FROM listings WHERE id = $1 AND status = 'published' AND is_visible = true`,
      [body.listingId],
    );
    if (!check.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }

    await pool.query(
      `INSERT INTO leads (listing_id, user_id, channel, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [body.listingId, userId, body.channel, req.ip, req.headers['user-agent'] ?? null],
    );

    return { success: true };
  });

  // ── GET /me/listings/:id/leads ─────────────────────────
  // Owner-only. Returns counts + recent leads for the agent dashboard.
  app.get('/me/listings/:id/leads', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = req.user!.sub;
    const { id } = req.params as { id: string };

    // Confirm the agent owns this listing
    const own = await pool.query(
      `SELECT 1 FROM listings WHERE id = $1 AND user_id = $2`,
      [id, uid],
    );
    if (!own.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }

    // Aggregate
    const counts = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE channel = 'whatsapp')          AS whatsapp,
         COUNT(*) FILTER (WHERE channel = 'video_inspection')  AS video_inspection,
         COUNT(*) FILTER (WHERE channel = 'message')           AS messages,
         COUNT(*) FILTER (WHERE channel = 'viewing')           AS viewings,
         COUNT(*)                                              AS total,
         COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')  AS last_7_days,
         COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS last_30_days
       FROM leads WHERE listing_id = $1`,
      [id],
    );

    // Recent (last 10) — no PII, just channel + time
    const recent = await pool.query(
      `SELECT channel, created_at
       FROM leads WHERE listing_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [id],
    );

    return {
      success: true,
      data: {
        counts: counts.rows[0],
        recent: recent.rows,
      },
    };
  });

  // ── GET /me/leads-summary ─────────────────────────────
  // All leads across all listings the agent owns — for /my-listings page
  app.get('/me/leads-summary', { preHandler: [app.authenticate] }, async (req) => {
    const uid = req.user!.sub;
    const r = await pool.query(
      `SELECT l.id AS listing_id, l.title, l.slug,
              COUNT(leads.id)                                          AS total,
              COUNT(leads.id) FILTER (WHERE leads.channel = 'whatsapp') AS whatsapp,
              COUNT(leads.id) FILTER (WHERE leads.created_at > now() - interval '7 days') AS last_7_days
       FROM listings l
       LEFT JOIN leads ON leads.listing_id = l.id
       WHERE l.user_id = $1 AND l.status = 'published'
       GROUP BY l.id, l.title, l.slug
       ORDER BY total DESC`,
      [uid],
    );
    return { success: true, data: { listings: r.rows } };
  });
};

export default route;
