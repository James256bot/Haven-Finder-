import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';

const Body = z.object({
  reason: z.enum(['scam', 'wrong_price', 'fake_property', 'incorrect_location', 'duplicate', 'offensive', 'other']),
  details: z.string().max(2000).optional(),
});

const route: FastifyPluginAsync = async (app) => {
  app.post('/listings/:id/report', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = Body.parse(req.body);

    const exists = await pool.query(`SELECT 1 FROM listings WHERE id = $1`, [id]);
    if (!exists.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    }

    await pool.query(
      `INSERT INTO reports (listing_id, reporter_id, reason, details)
       VALUES ($1, $2, $3, $4)`,
      [id, req.user!.sub, body.reason, body.details ?? null],
    );

    return reply.code(201).send({ success: true, data: { message: 'Report submitted' } });
  });
};

export default route;
