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
    if (q.minPrice)     add('price_usd_cents >= ?', Number(q.minPrice));
    if (q.maxPrice)     add('price_usd_cents <= ?', Number(q.maxPrice));
    if (q.q) {
      where.push(`(title ILIKE $${i} OR city ILIKE $${i} OR country ILIKE $${i})`);
      args.push(`%${q.q}%`);
      i++;
    }

    args.push(MAX_PINS);

    const r = await pool.query(
      `SELECT id, slug, title, latitude, longitude,
              price_amount, price_usd_cents, currency, price_period,
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
