import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';
import { requestMoMoPayment, checkMoMoStatus } from '../services/momo';
import { randomUUID } from 'node:crypto';
import { postToSocials } from '../services/social-poster';

const TIERS = {
  boost:    { price: 10000, days: 7,  label: 'Boost — top of neighborhood' },
  featured: { price: 30000, days: 14, label: 'Featured — homepage + search' },
  premium:  { price: 80000, days: 30, label: 'Premium — featured + verified review' },
} as const;

const PromoteBody = z.object({
  tier: z.enum(['boost', 'featured', 'premium']),
  phone: z.string().min(10).max(15),
});

const route: FastifyPluginAsync = async (app) => {
  // ── POST /me/listings/:id/promote/mtn ──────────────────
  app.post('/me/listings/:id/promote/mtn', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { tier, phone } = PromoteBody.parse(req.body);
    const uid = req.user!.sub;

    // Ownership check
    const lr = await pool.query(
      `SELECT id, title FROM listings WHERE id = $1 AND user_id = $2`,
      [id, uid],
    );
    if (!lr.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }

    // Prevent duplicate active promo
    const existing = await pool.query(
      `SELECT id FROM promotions
       WHERE listing_id = $1 AND tier = $2 AND status = 'active' AND expires_at > now()`,
      [id, tier],
    );
    if (existing.rowCount) {
      return reply.code(400).send({
        success: false,
        error: { code: 'ALREADY_ACTIVE', message: 'This promotion is already active' },
      });
    }

    const T = TIERS[tier];
    const refId = randomUUID();

    // Call MTN
    const payment = await requestMoMoPayment(String(T.price), phone, refId);
    if (!payment.success) {
      return reply.code(502).send({
        success: false,
        error: { code: 'PAYMENT_FAILED', message: payment.error || 'MTN payment failed' },
      });
    }

    // Log the transaction
    await pool.query(
      `INSERT INTO payment_transactions
       (user_id, purpose, reference_id, provider, provider_reference, amount, currency, status, raw_response)
       VALUES ($1, 'promotion', $2, 'mtn_momo', $3, $4, 'UGX', 'pending', $5)`,
      [uid, id, refId, T.price, JSON.stringify(payment)],
    );

    // Create pending promotion
    await pool.query(
      `INSERT INTO promotions
       (listing_id, user_id, tier, price_amount, currency, duration_days, status, payment_provider, payment_reference, payment_status)
       VALUES ($1, $2, $3, $4, 'UGX', $5, 'pending', 'mtn_momo', $6, 'pending')`,
      [id, uid, tier, T.price, T.days, refId],
    );

    return {
      success: true,
      data: {
        referenceId: refId,
        tier: T,
        message: 'Check your phone for the MTN payment prompt. Enter your PIN to confirm.',
      },
    };
  });

  // ── POST /me/listings/:id/promote/mtn/:refId/verify ───
  app.post('/me/listings/:id/promote/mtn/:refId/verify', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { refId } = req.params as { id: string; refId: string };
    const uid = req.user!.sub;

    const status = await checkMoMoStatus(refId);
    if (!status.success) {
      return reply.code(502).send({
        success: false,
        error: { code: 'STATUS_FAILED', message: status.error ?? 'Status check failed' },
      });
    }

    if (status.status === 'SUCCESSFUL') {
      const promo = await pool.query(
        `UPDATE promotions
         SET status = 'active', payment_status = 'paid', paid_at = now(),
             starts_at = now(),
             expires_at = now() + (duration_days || ' days')::interval
         WHERE payment_reference = $1 AND user_id = $2 AND payment_status = 'pending'
         RETURNING *`,
        [refId, uid],
      );
      await pool.query(
        `UPDATE payment_transactions SET status = 'success', updated_at = now()
         WHERE provider_reference = $1`,
        [refId],
      );
      return { success: true, data: { status: 'SUCCESSFUL', promotion: promo.rows[0] ?? null } };
    }

    if (status.status === 'FAILED') {
      await pool.query(
        `UPDATE promotions SET status = 'rejected', payment_status = 'failed'
         WHERE payment_reference = $1`,
        [refId],
      );
      await pool.query(
        `UPDATE payment_transactions SET status = 'failed', updated_at = now()
         WHERE provider_reference = $1`,
        [refId],
      );
      return { success: false, data: { status: 'FAILED' } };
    }

    return { success: true, data: { status: status.status ?? 'PENDING' } };
  });

  // ── TEST /social/post ──
  app.post('/social/post', async (req, reply) => {
    const { listingId } = req.body as { listingId: string };
    const r = await pool.query('SELECT * FROM listings WHERE id = $1', [listingId]);
    if (!r.rowCount) return reply.code(404).send({ error: 'Listing not found' });
    const result = await postToSocials(r.rows[0]);
    return result;
  });
};

export default route;
