import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const SORTS: Record<string, string> = {
  newest:      'created_at DESC',
  price_low:   'COALESCE(price_usd_cents, 999999999) ASC',
  price_high:  'COALESCE(price_usd_cents, 0) DESC',
  views:       'COALESCE(view_count, 0) DESC',
  relevance: "CASE WHEN source_code = 'untera' AND main_image_url IS NOT NULL THEN 0 WHEN source_code = 'untera' THEN 1 WHEN country_code = 'UG' THEN 2 WHEN country_code IN ('KE','NG','TZ','RW') THEN 3 ELSE 4 END, created_at DESC",
};

const route: FastifyPluginAsync = async (app) => {
  // ── GET /listings ────────────────────────────────────────
  app.get('/listings', async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const limit  = Math.min(Math.max(Number(q.limit ?? 24), 1), 100);
    const offset = Math.max(Number(q.offset ?? 0), 0);
    const sort   = SORTS[q.sort ?? 'relevance'] ?? SORTS.relevance;

    const where: string[] = [`status = 'published'`];
    const args: unknown[] = [];
    let i = 1;
    const add = (clause: string, val: unknown) => {
      where.push(clause.replace('?', `$${i++}`));
      args.push(val);
    };

    if (q.country)     add('country_code = ?',            q.country.toUpperCase());
    if (q.city)        add('LOWER(city) = ?',             q.city.toLowerCase());
    if (q.listingType) add('listing_type = ?',            q.listingType);
    if (q.propertyType)add('property_type = ?',           q.propertyType);
    if (q.source)      add('source_code = ?',             q.source);
    if (q.verification)add('verification = ?',            q.verification);
    if (q.bedrooms)    add('bedrooms >= ?',               Number(q.bedrooms));
    if (q.minPrice)    add('price_usd_cents >= ?',        Number(q.minPrice));
    if (q.maxPrice)    add('price_usd_cents <= ?',        Number(q.maxPrice));
    if (q.q) {
      where.push(`(title ILIKE $${i} OR description ILIKE $${i} OR city ILIKE $${i} OR country ILIKE $${i})`);
      args.push(`%${q.q}%`);
      i++;
    }

    const whereSql = where.join(' AND ');
    args.push(limit, offset);

    const sql = `
      SELECT id, slug, title, description, city, country, country_code, source_code,
             latitude, longitude, bedrooms, bathrooms, property_type,
             listing_type, price_amount, price_usd_cents, currency,
             price_period, main_image_url, verification, is_featured,
             source_code, source_url, created_at
      FROM listings
      WHERE ${whereSql}
      ORDER BY ${sort}
      LIMIT $${i} OFFSET $${i + 1}`;

    const rows = (await pool.query(sql, args)).rows;

    const countSql = `SELECT COUNT(*)::int AS total FROM listings WHERE ${whereSql}`;
    const total = (await pool.query(countSql, args.slice(0, args.length - 2))).rows[0].total;

    return {
      success: true,
      data: { listings: rows, total, limit, offset, sort: q.sort ?? 'relevance' },
    };
  });

  // ── GET /listings/:slug ──────────────────────────────────
  app.get('/listings/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const r = await pool.query(
      `SELECT l.*, u.full_name AS owner_name, u.email AS owner_email
       FROM listings l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.slug = $1 AND l.status = 'published'`,
      [slug],
    );
    if (!r.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }
    pool.query(`UPDATE listings SET view_count = COALESCE(view_count,0)+1 WHERE id = $1`, [r.rows[0].id]).catch(() => {});
    return { success: true, data: { listing: r.rows[0] } };
  });

  // ── GET /stats ───────────────────────────────────────────
  app.get('/stats', async () => {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='published') AS published,
        COUNT(DISTINCT country_code) FILTER (WHERE status='published') AS countries,
        COUNT(DISTINCT city) FILTER (WHERE status='published') AS cities,
        COUNT(*) FILTER (WHERE is_seed = false AND source_code IS NOT NULL) AS real_listings
      FROM listings`);
    return { success: true, data: r.rows[0] };
  });
};

export default route;
