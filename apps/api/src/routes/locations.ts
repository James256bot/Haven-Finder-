import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  // Distinct countries with published counts
  app.get('/locations/countries', async () => {
    const r = await pool.query(`
      SELECT country_code AS code, country AS name, COUNT(*)::int AS count
      FROM listings
      WHERE status = 'published' AND country_code IS NOT NULL
      GROUP BY country_code, country
      ORDER BY count DESC`);
    return { success: true, data: { countries: r.rows } };
  });

  // Distinct cities for a country (or all)
  app.get('/locations/cities', async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const args: unknown[] = [];
    let where = `status = 'published' AND city IS NOT NULL`;
    if (q.country) { where += ` AND country_code = $1`; args.push(q.country.toUpperCase()); }
    const r = await pool.query(`
      SELECT city, country_code, COUNT(*)::int AS count
      FROM listings WHERE ${where}
      GROUP BY city, country_code
      ORDER BY count DESC LIMIT 40`, args);
    return { success: true, data: { cities: r.rows } };
  });

  // Distinct property types with counts
  app.get('/locations/property-types', async () => {
    const r = await pool.query(`
      SELECT property_type AS type, COUNT(*)::int AS count
      FROM listings
      WHERE status = 'published' AND property_type IS NOT NULL
      GROUP BY property_type ORDER BY count DESC`);
    return { success: true, data: { types: r.rows } };
  });
};

export default route;
