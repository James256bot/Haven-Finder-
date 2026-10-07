import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';
import { parseSearchQuery, getAiSearchMetrics } from '../services/ai-search';
import type { ParsedQuery } from '../services/ai-search/schema';

const Body = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).default(24),
});

// Simple per-IP rate limit (30 parses per minute)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count++;
  return true;
}

function toSql(p: ParsedQuery) {
  const where: string[] = [`status = 'published'`];
  const args: any[] = [];
  let i = 1;

  if (p.propertyType)  { where.push(`property_type = $${i++}`);   args.push(p.propertyType); }
  if (p.listingType) {
    // "sale" + land → also match "land_sale"
    if (p.listingType === 'sale' && p.propertyType === 'land') {
      where.push(`listing_type IN ('sale', 'land_sale')`);
    } else if (p.listingType === 'sale') {
      where.push(`listing_type IN ('sale', 'land_sale')`);
    } else {
      where.push(`listing_type = $${i++}`);
      args.push(p.listingType);
    }
  }
  if (p.bedrooms)      { where.push(`bedrooms >= $${i++}`);       args.push(p.bedrooms); }
  if (p.bathrooms)     { where.push(`bathrooms >= $${i++}`);      args.push(p.bathrooms); }
  if (p.maxPrice)      { where.push(`price_amount <= $${i++}`);   args.push(p.maxPrice); }
  if (p.minPrice)      { where.push(`price_amount >= $${i++}`);   args.push(p.minPrice); }
  if (p.country)       { where.push(`country_code = $${i++}`);    args.push(p.country); }
  if (p.city) {
    where.push(`(
      LOWER(city) = $${i}
      OR LOWER(address_line) LIKE $${i + 1}
      OR LOWER(title) LIKE $${i + 1}
    )`);
    args.push(p.city.toLowerCase(), `%${p.city.toLowerCase()}%`);
    i += 2;
  }
  // Skip generic neighborhoods that don't add signal
  const GENERIC_NEIGHBORHOODS = new Set(['central', 'cbd', 'city', 'downtown', 'suburb', 'area', 'district']);
  if (p.neighborhood && !GENERIC_NEIGHBORHOODS.has(p.neighborhood.toLowerCase())) {
    where.push(`(
      LOWER(city) = $${i}
      OR LOWER(address_line) LIKE $${i + 1}
      OR LOWER(title) LIKE $${i + 1}
      OR LOWER(description) LIKE $${i + 1}
      OR LOWER(state) LIKE $${i + 1}
    )`);
    args.push(p.neighborhood.toLowerCase(), `%${p.neighborhood.toLowerCase()}%`);
    i += 2;
  }
  if (p.verified)      { where.push(`verification = 'verified'`); }
  if (p.furnished)     { where.push(`furnishing IN ('furnished', 'semi_furnished')`); }
  if (p.parking)       { where.push(`LOWER(description) LIKE '%parking%'`); }
  if (p.pool)          { where.push(`LOWER(description) LIKE '%pool%'`); }
  if (p.gym)           { where.push(`LOWER(description) LIKE '%gym%'`); }
  if (p.aircon)        { where.push(`(LOWER(description) LIKE '%air con%' OR LOWER(description) LIKE '%a/c%')`); }
  if (p.garden)        { where.push(`LOWER(description) LIKE '%garden%'`); }
  if (p.security)      { where.push(`(LOWER(description) LIKE '%security%' OR LOWER(description) LIKE '%gated%')`); }
  if (p.nearUniversity) {
    where.push(`(LOWER(title) LIKE $${i} OR LOWER(description) LIKE $${i} OR LOWER(city) LIKE $${i})`);
    args.push(`%${p.nearUniversity}%`);
    i++;
  }
  if (p.q) {
    where.push(`(LOWER(title) LIKE $${i} OR LOWER(description) LIKE $${i} OR LOWER(city) LIKE $${i})`);
    args.push(`%${p.q}%`);
    i++;
  }

  return { where: where.join(' AND '), args };
}

const route: FastifyPluginAsync = async (app) => {
  // POST /ai/search — natural language → listings
  app.post('/ai/search', async (req, reply) => {
    if (!checkRateLimit(req.ip)) {
      return reply.code(429).send({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many AI search requests. Slow down.' },
      });
    }

    const body = Body.parse(req.body);
    const parsed = await parseSearchQuery(body.query);

    const { where, args } = toSql(parsed);
    args.push(body.limit);

    const sql = `
      SELECT id, slug, title, description, city, country, country_code,
             latitude, longitude, bedrooms, bathrooms, property_type,
             listing_type, price_amount, price_usd, currency,
             price_period, main_image_url, verification, is_featured,
             source_code, source_url, created_at
      FROM listings
      WHERE ${where}
      ORDER BY
        CASE WHEN country_code = 'UG' THEN 0
             WHEN country_code IN ('KE','NG','TZ','RW') THEN 1
             ELSE 2 END,
        ${parsed.sortHint === 'price_asc' ? 'price_amount ASC NULLS LAST,' : ''}
        ${parsed.sortHint === 'price_desc' ? 'price_amount DESC NULLS LAST,' : ''}
        is_featured DESC,
        created_at DESC
      LIMIT $${args.length}`;

    const r = await pool.query(sql, args);

    // Fire-and-forget search log
    pool.query(
      `INSERT INTO search_history (query, parsed_json, results_count)
       VALUES ($1, $2, $3)`,
      [body.query, JSON.stringify(parsed), r.rowCount],
    ).catch(() => {});

    return {
      success: true,
      data: {
        parsed,
        listings: r.rows,
        total: r.rowCount,
        limit: body.limit,
      },
    };
  });

  // POST /ai/parse — parse only, no DB query (for preview)
  app.post('/ai/parse', async (req) => {
    const body = Body.parse(req.body);
    const parsed = await parseSearchQuery(body.query);
    return { success: true, data: { parsed } };
  });

  // GET /ai/metrics — admin only
  app.get('/ai/metrics', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }
    return { success: true, data: getAiSearchMetrics() };
  });
};

export default route;
