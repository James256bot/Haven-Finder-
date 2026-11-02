import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';
import { requestMoMoPayment } from '../services/momo';

const Body = z.object({
  tier: z.enum(['boost', 'featured', 'premium']),
  phone: z.string().min(9),
});

const TIERS = {
  boost:    { price: 10000, days: 7,  label: 'Boost' },
  featured: { price: 30000, days: 14, label: 'Featured' },
  premium:  { price: 80000, days: 30, label: 'Premium' },
};

const route: FastifyPluginAsync = async (app) => {
  app.post('/me/listings/:id/promote/mtn', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = Body.parse(req.body);
    const uid = req.user!.sub;
    const tier = TIERS[body.tier];

    // 1. Verify ownership
    const own = await pool.query(
      `SELECT id, title FROM listings WHERE id = $1 AND user_id = $2 AND status = 'published'`,
      [id, uid],
    );
    if (!own.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    }

    // 2. Create a pending promotion
    const promo = await pool.query(
      `INSERT INTO promotions (listing_id, user_id, tier, price_amount, currency, duration_days, status, payment_provider)
       VALUES ($1, $2, $3, $4, 'UGX', $5, 'pending', 'mtn')
       RETURNING id`,
      [id, uid, body.tier, tier.price, tier.days],
    );
    const promoId = promo.rows[0].id;

    // 3. Call MTN to request payment
    const refId = crypto.randomUUID();
    const result = await requestMoMoPayment(String(tier.price), body.phone, refId);

    if (!result.success) {
      return reply.code(500).send({ success: false, error: { code: 'PAYMENT_FAILED', message: result.error } });
    }

    // 4. Save the payment reference
    await pool.query(
      `UPDATE promotions SET payment_reference = $1 WHERE id = $2`,
      [refId, promoId],
    );

    return {
      success: true,
      data: {
        promotionId: promoId,
        referenceId: refId,
        message: 'Check your phone for the MTN prompt.',
      },
    };
  });
};

export default route;
