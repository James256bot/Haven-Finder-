import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';

const WantedBody = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  city: z.string().optional(),
  maxPrice: z.number().optional(),
  bedrooms: z.number().optional(),
  contactPhone: z.string().min(9),
});

const route: FastifyPluginAsync = async (app) => {
  // POST /wanted - Renters post what they need
  app.post('/wanted', async (req, reply) => {
    const body = WantedBody.parse(req.body);
    const userId = req.user?.sub ?? null;

    const r = await pool.query(
      `INSERT INTO wanted_requests (user_id, title, description, city, max_price, bedrooms, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, body.title, body.description, body.city, body.maxPrice, body.bedrooms, body.contactPhone]
    );
    return { success: true, data: { request: r.rows[0] } };
  });

  // GET /wanted - Agents browse what people are looking for
  app.get('/wanted', async () => {
    const r = await pool.query(
      `SELECT * FROM wanted_requests ORDER BY created_at DESC LIMIT 50`
    );
    return { success: true, data: { requests: r.rows } };
  });
};

export default route;
