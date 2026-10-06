import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';
import { generateAllPosts } from '../marketing/generator';

const ScheduleBody = z.object({
  scheduledFor: z.string().datetime().optional(),
});

const PrefsBody = z.object({
  autoGenerate: z.boolean().optional(),
  autoSchedule: z.boolean().optional(),
  platforms: z.array(z.string()).optional(),
  brandHandle: z.string().max(100).optional(),
  defaultHashtags: z.array(z.string()).optional(),
});

const CampaignBody = z.object({
  name: z.string().min(3).max(200),
  channel: z.enum(['email', 'sms', 'whatsapp']),
  audience: z.enum(['all_users', 'saved_similar', 'nearby', 'returning']),
  listingId: z.string().uuid().optional(),
  subject: z.string().max(200).optional(),
});

const route: FastifyPluginAsync = async (app) => {
  // ── GET /me/marketing/posts — my generated posts ──────
  app.get('/me/marketing/posts', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT mp.id, mp.platform, mp.content, mp.hashtags, mp.media_urls,
              mp.status, mp.scheduled_for, mp.published_at, mp.external_url,
              mp.impressions, mp.clicks, mp.created_at,
              l.id AS listing_id, l.slug, l.title, l.main_image_url
       FROM marketing_posts mp
       JOIN listings l ON l.id = mp.listing_id
       WHERE mp.user_id = $1
       ORDER BY mp.created_at DESC
       LIMIT 200`,
      [req.user!.sub],
    );
    return { success: true, data: { posts: r.rows } };
  });

  // ── POST /me/marketing/posts/:listingId/regenerate ────
  app.post('/me/marketing/posts/:listingId/regenerate', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { listingId } = req.params as { listingId: string };
    const own = await pool.query(
      `SELECT id FROM listings WHERE id = $1 AND user_id = $2`,
      [listingId, req.user!.sub],
    );
    if (!own.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    }

    await pool.query(`DELETE FROM marketing_posts WHERE listing_id = $1 AND status = 'draft'`, [listingId]);

    const full = await pool.query(
      `SELECT id, slug, title, description, city, country,
              bedrooms, bathrooms, price_amount, currency, price_period,
              property_type, listing_type, main_image_url
       FROM listings WHERE id = $1`,
      [listingId],
    );

    const posts = await generateAllPosts(pool, full.rows[0], req.user!.sub);
    return { success: true, data: { posts } };
  });

  // ── PATCH /me/marketing/posts/:id — edit content ──────
  app.patch('/me/marketing/posts/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { content, hashtags } = req.body as any;

    const r = await pool.query(
      `UPDATE marketing_posts
       SET content = COALESCE($1, content),
           hashtags = COALESCE($2, hashtags),
           updated_at = now()
       WHERE id = $3 AND user_id = $4
       RETURNING id`,
      [content, hashtags, id, req.user!.sub],
    );
    if (!r.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    }
    return { success: true, data: { message: 'Updated' } };
  });

  // ── POST /me/marketing/posts/:id/schedule ─────────────
  app.post('/me/marketing/posts/:id/schedule', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = ScheduleBody.parse(req.body ?? {});

    const when = body.scheduledFor ? new Date(body.scheduledFor) : new Date(Date.now() + 60_000);

    const r = await pool.query(
      `UPDATE marketing_posts
       SET status = 'scheduled', scheduled_for = $1, updated_at = now()
       WHERE id = $2 AND user_id = $3
       RETURNING id, platform, scheduled_for`,
      [when, id, req.user!.sub],
    );
    if (!r.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    }
    return { success: true, data: { post: r.rows[0] } };
  });

  // ── POST /me/marketing/posts/:id/mark-published ───────
  // (For owners who share manually and want to track it.)
  app.post('/me/marketing/posts/:id/mark-published', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { externalUrl } = req.body as any;

    const r = await pool.query(
      `UPDATE marketing_posts
       SET status = 'published', published_at = now(), external_url = $1, updated_at = now()
       WHERE id = $2 AND user_id = $3
       RETURNING id`,
      [externalUrl ?? null, id, req.user!.sub],
    );
    if (!r.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    }
    return { success: true, data: { message: 'Marked published' } };
  });

  // ── GET /me/marketing/preferences ─────────────────────
  app.get('/me/marketing/preferences', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT auto_generate, auto_schedule, platforms, brand_handle, default_hashtags
       FROM marketing_preferences WHERE user_id = $1`,
      [req.user!.sub],
    );
    if (!r.rowCount) {
      return { success: true, data: { preferences: { autoGenerate: true, autoSchedule: false, platforms: ['instagram','facebook','twitter'], defaultHashtags: ['#HavenFinder','#Uganda','#Kampala'] } } };
    }
    return { success: true, data: { preferences: r.rows[0] } };
  });

  // ── PATCH /me/marketing/preferences ───────────────────
  app.patch('/me/marketing/preferences', { preHandler: [app.authenticate] }, async (req) => {
    const body = PrefsBody.parse(req.body);

    await pool.query(
      `INSERT INTO marketing_preferences (user_id, auto_generate, auto_schedule, platforms, brand_handle, default_hashtags)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         auto_generate    = COALESCE(EXCLUDED.auto_generate, marketing_preferences.auto_generate),
         auto_schedule    = COALESCE(EXCLUDED.auto_schedule, marketing_preferences.auto_schedule),
         platforms        = COALESCE(EXCLUDED.platforms, marketing_preferences.platforms),
         brand_handle     = COALESCE(EXCLUDED.brand_handle, marketing_preferences.brand_handle),
         default_hashtags = COALESCE(EXCLUDED.default_hashtags, marketing_preferences.default_hashtags),
         updated_at       = now()`,
      [
        req.user!.sub,
        body.autoGenerate ?? null,
        body.autoSchedule ?? null,
        body.platforms ?? null,
        body.brandHandle ?? null,
        body.defaultHashtags ?? null,
      ],
    );
    return { success: true, data: { message: 'Saved' } };
  });

  // ── POST /me/marketing/campaigns — create digest ──────
  app.post('/me/marketing/campaigns', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = CampaignBody.parse(req.body);

    // Compute audience count
    let countQuery = `SELECT COUNT(*)::int AS n FROM users WHERE is_active = true AND is_banned = false`;
    const args: unknown[] = [req.user!.sub];

    if (body.audience === 'saved_similar' && body.listingId) {
      countQuery = `
        SELECT COUNT(DISTINCT f.user_id)::int AS n
        FROM favorites f
        JOIN listings l ON l.id = f.listing_id
        WHERE l.city = (SELECT city FROM listings WHERE id = $1)
          AND f.user_id <> $2`;
      args.unshift(body.listingId);
    } else if (body.audience === 'returning') {
      countQuery = `SELECT COUNT(*)::int AS n FROM users WHERE last_login_at > now() - interval '30 days'`;
    }

    const audienceCount = (await pool.query(countQuery, args)).rows[0]?.n ?? 0;

    const ins = await pool.query(
      `INSERT INTO marketing_campaigns
         (user_id, name, channel, audience, listing_id, content, subject, recipient_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued')
       RETURNING id, name, status, recipient_count`,
      [
        req.user!.sub,
        body.name,
        body.channel,
        body.audience,
        body.listingId ?? null,
        '(pending generation)',
        body.subject ?? null,
        audienceCount,
      ],
    );
    return reply.code(201).send({ success: true, data: { campaign: ins.rows[0] } });
  });
};

export default route;
