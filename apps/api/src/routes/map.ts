import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const MAX_PINS = 500;

const route: FastifyPluginAsync = async (app) => {
  // GET /listings/map — lightweight pins, no pagination, hard capped
  app.get('/listings/map', async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const where: string[] = [
      `status = 'published'`,
      `latitude IS NOT NULL`,
      `longitude IS NOT NULL`,
    ];
    const args: unknown[] = [];
    let i = 1;
    const add = (clause: string, val: unknown) => {
      where.push(clause.replace('?', `$${i++}`));
      args.push(val);
    };

    if (q.country)      add('country_code = ?',     q.country.toUpperCase());
    if (q.city)         add('LOWER(city) = ?',      q.city.toLowerCase());
    if (q.listingType)  add('listing_type = ?',     q.listingType);
    if (q.propertyType) add('property_type = ?',    q.propertyType);
    if (q.verification) add('verification = ?',     q.verification);
    if (q.bedrooms)     add('bedrooms >= ?',        Number(q.bedrooms));
    if (q.minPrice)     add('price_usd >= ?', Number(q.minPrice));
    if (q.maxPrice)     add('price_usd <= ?', Number(q.maxPrice));
    if (q.q) {
      where.push(`(title ILIKE $${i} OR city ILIKE $${i} OR country ILIKE $${i})`);
      args.push(`%${q.q}%`);
      i++;
    }

    args.push(MAX_PINS);

    const r = await pool.query(
      `SELECT id, slug, title, latitude, longitude,
              price_amount, price_usd, currency, price_period,
              property_type, bedrooms, verification, country_code, city,
              main_image_url
       FROM listings
       WHERE ${where.join(' AND ')}
       ORDER BY
         CASE WHEN country_code = 'UG' THEN 0
              WHEN country_code IN ('KE','NG','TZ','RW') THEN 1
              ELSE 2 END,
         created_at DESC
       LIMIT $${i}`,
      args,
    );

    return {
      success: true,
      data: {
        pins: r.rows.map((row: any) => ({
          ...row,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        })),
        capped: r.rowCount === MAX_PINS,
      },
    };
  });
};

export default route;

// Appended: cluster endpoint for dense maps
// GET /listings/map/clusters?zoom=10&country=UG
const clusterRoute: FastifyPluginAsync = async (app) => {
  app.get('/listings/map/clusters', async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const zoom = Math.max(1, Math.min(Number(q.zoom ?? 6), 18));
    // Grid size in degrees: bigger grid at lower zoom = coarser clusters
    const grid = Math.max(0.005, 20 / Math.pow(2, zoom));
    const limit = Math.min(Number(q.limit ?? 500), 2000);

    const where: string[] = [
      `status = 'published'`,
      `latitude IS NOT NULL`,
      `longitude IS NOT NULL`,
    ];
    const args: unknown[] = [];
    let i = 1;
    const add = (clause: string, val: unknown) => {
      where.push(clause.replace('?', `$${i++}`));
      args.push(val);
    };

    if (q.country)      add('country_code = ?',     q.country.toUpperCase());
    if (q.listingType)  add('listing_type = ?',     q.listingType);
    if (q.propertyType) add('property_type = ?',    q.propertyType);
    if (q.verification) add('verification = ?',     q.verification);
    if (q.bedrooms)     add('bedrooms >= ?',        Number(q.bedrooms));
    if (q.minPrice)     add('price_usd >= ?', Number(q.minPrice));
    if (q.maxPrice)     add('price_usd <= ?', Number(q.maxPrice));

    args.push(grid, grid, limit);

    // Cluster by rounding lat/lng to a grid
    const r = await pool.query(
      `SELECT
         ROUND(latitude::numeric / $${i}, 0) * $${i}   AS lat,
         ROUND(longitude::numeric / $${i + 1}, 0) * $${i + 1} AS lng,
         COUNT(*)::int                                    AS count,
         MIN(price_usd)::text                       AS min_price_usd,
         MIN(price_amount)::text                          AS min_price_amount,
         MIN(currency)                                    AS currency,
         MIN(price_period)                                AS price_period,
         MIN(verification)                                AS verification,
         (ARRAY_AGG(id ORDER BY created_at DESC))[1]      AS sample_id,
         (ARRAY_AGG(slug ORDER BY created_at DESC))[1]    AS sample_slug,
         (ARRAY_AGG(title ORDER BY created_at DESC))[1]   AS sample_title,
         (ARRAY_AGG(main_image_url ORDER BY created_at DESC))[1] AS sample_image,
         (ARRAY_AGG(country_code ORDER BY created_at DESC))[1]   AS country_code,
         (ARRAY_AGG(city ORDER BY created_at DESC))[1]           AS city
       FROM listings
       WHERE ${where.join(' AND ')}
       GROUP BY ROUND(latitude::numeric / $${i}, 0),
                ROUND(longitude::numeric / $${i + 1}, 0)
       ORDER BY COUNT(*) DESC
       LIMIT $${i + 2}`,
      args,
    );

    return {
      success: true,
      data: {
        zoom,
        grid,
        clusters: r.rows.map((row: any) => ({
          lat: Number(row.lat),
          lng: Number(row.lng),
          count: row.count,
          minPriceUsd: Number(row.min_price_usd ?? 0),
          minPriceAmount: row.min_price_amount,
          currency: row.currency,
          pricePeriod: row.price_period,
          verification: row.verification,
          sampleId: row.sample_id,
          sampleSlug: row.sample_slug,
          sampleTitle: row.sample_title,
          sampleImage: row.sample_image,
          countryCode: row.country_code,
          city: row.city,
        })),
      },
    };
  });
};

export { clusterRoute };
