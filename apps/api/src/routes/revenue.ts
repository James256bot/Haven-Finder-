import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';
import { paymentProvider } from '../payments/dev-provider';

const TIERS = {
  boost:    { price: 10000, days: 7,  label: 'Boost — top of neighborhood' },
  featured: { price: 30000, days: 14, label: 'Featured — homepage + search' },
  premium:  { price: 80000, days: 30, label: 'Premium — featured + verified review' },
} as const;

const VERIFY_TIERS = {
  basic: { price: 30000, label: 'Basic — photo + address check' },
  full:  { price: 100000, label: 'Full — documents + owner identity check' },
} as const;

const PromoteBody = z.object({ tier: z.enum(['boost', 'featured', 'premium']) });
const VerifyBody  = z.object({ tier: z.enum(['basic', 'full']) });
const AdminDecision = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().max(2000).optional(),
});

const route: FastifyPluginAsync = async (app) => {
  // ── GET /pricing ───────────────────────────────────────
  app.get('/pricing', async () => ({
    success: true,
    data: { promotions: TIERS, verifications: VERIFY_TIERS },
  }));

  // ── POST /me/listings/:id/promote ──────────────────────
  app.post('/me/listings/:id/promote', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { tier } = PromoteBody.parse(req.body);
    const uid = req.user!.sub;

    const lr = await pool.query(
      `SELECT id, title FROM listings WHERE id = $1 AND user_id = $2`,
      [id, uid],
    );
    if (!lr.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    }

    // Prevent duplicate active promo of same tier
    const existing = await pool.query(
      `SELECT id FROM promotions
       WHERE listing_id = $1 AND tier = $2 AND status = 'active' AND expires_at > now()`,
      [id, tier],
    );
    if (existing.rowCount) {
      return reply.code(409).send({ success: false, error: { code: 'ALREADY_ACTIVE', message: 'This promotion tier is already active' } });
    }

    const cfg = TIERS[tier];
    const ins = await pool.query(
      `INSERT INTO promotions (listing_id, user_id, tier, price_amount, currency, duration_days, status)
       VALUES ($1, $2, $3, $4, 'UGX', $5, 'pending')
       RETURNING id, tier, price_amount, currency, status`,
      [id, uid, tier, cfg.price, cfg.days],
    );
    const promo = ins.rows[0];

    // Initiate payment via provider (dev: always pending)
    const payment = await paymentProvider.createPayment({
      userId: uid,
      amount: cfg.price,
      currency: 'UGX',
      purpose: 'promotion',
      referenceId: promo.id,
      description: `${cfg.label} — ${lr.rows[0].title}`,
    });

    await pool.query(
      `UPDATE promotions
       SET payment_provider = $1, payment_reference = $2, updated_at = now()
       WHERE id = $3`,
      [paymentProvider.name, payment.providerReference, promo.id],
    );

    await pool.query(
      `INSERT INTO payment_transactions
         (user_id, purpose, reference_id, provider, provider_reference, amount, currency, status, raw_response)
       VALUES ($1, 'promotion', $2, $3, $4, $5, 'UGX', $6, $7)`,
      [uid, promo.id, paymentProvider.name, payment.providerReference, cfg.price, payment.status, JSON.stringify(payment.raw)],
    );

    return reply.code(201).send({
      success: true,
      data: {
        promotion: promo,
        payment: {
          provider: paymentProvider.name,
          reference: payment.providerReference,
          status: payment.status,
          redirectUrl: (payment as any).redirectUrl,
          instructions:
            'DEVELOPMENT MODE — no real payment is processed. An admin will manually activate this promotion.',
        },
      },
    });
  });

  // ── GET /me/promotions ─────────────────────────────────
  app.get('/me/promotions', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT p.id, p.tier, p.status, p.price_amount, p.currency,
              p.starts_at, p.expires_at, p.payment_status, p.created_at,
              l.id AS listing_id, l.slug, l.title, l.main_image_url
       FROM promotions p
       JOIN listings l ON l.id = p.listing_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [req.user!.sub],
    );
    return { success: true, data: { promotions: r.rows } };
  });

  // ── POST /me/listings/:id/verify ───────────────────────
  app.post('/me/listings/:id/verify', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { tier } = VerifyBody.parse(req.body);
    const uid = req.user!.sub;

    const lr = await pool.query(
      `SELECT id, title FROM listings WHERE id = $1 AND user_id = $2`,
      [id, uid],
    );
    if (!lr.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    }

    const existing = await pool.query(
      `SELECT id FROM verification_requests
       WHERE listing_id = $1 AND status IN ('pending', 'in_review')`,
      [id],
    );
    if (existing.rowCount) {
      return reply.code(409).send({ success: false, error: { code: 'ALREADY_PENDING', message: 'A verification request is already open' } });
    }

    const cfg = VERIFY_TIERS[tier];
    const ins = await pool.query(
      `INSERT INTO verification_requests (listing_id, user_id, requested_tier, price_amount, currency, status)
       VALUES ($1, $2, $3, $4, 'UGX', 'pending')
       RETURNING id, requested_tier, price_amount, status`,
      [id, uid, tier, cfg.price],
    );

    const payment = await paymentProvider.createPayment({
      userId: uid,
      amount: cfg.price,
      currency: 'UGX',
      purpose: 'verification',
      referenceId: ins.rows[0].id,
      description: `${cfg.label} — ${lr.rows[0].title}`,
    });

    await pool.query(
      `UPDATE verification_requests
       SET payment_provider = $1, payment_reference = $2, updated_at = now()
       WHERE id = $3`,
      [paymentProvider.name, payment.providerReference, ins.rows[0].id],
    );

    await pool.query(
      `INSERT INTO payment_transactions
         (user_id, purpose, reference_id, provider, provider_reference, amount, currency, status, raw_response)
       VALUES ($1, 'verification', $2, $3, $4, $5, 'UGX', $6, $7)`,
      [uid, ins.rows[0].id, paymentProvider.name, payment.providerReference, cfg.price, payment.status, JSON.stringify(payment.raw)],
    );

    return reply.code(201).send({
      success: true,
      data: {
        request: ins.rows[0],
        payment: {
          provider: paymentProvider.name,
          reference: payment.providerReference,
          status: payment.status,
          redirectUrl: (payment as any).redirectUrl,
          instructions:
            'DEVELOPMENT MODE — no real payment is processed. An admin will review this request.',
        },
      },
    });
  });

  // ── GET /me/verifications ──────────────────────────────
  app.get('/me/verifications', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT v.id, v.requested_tier, v.status, v.price_amount, v.currency,
              v.admin_note, v.created_at, v.decided_at,
              l.id AS listing_id, l.slug, l.title, l.main_image_url
       FROM verification_requests v
       JOIN listings l ON l.id = v.listing_id
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC
       LIMIT 100`,
      [req.user!.sub],
    );
    return { success: true, data: { verifications: r.rows } };
  });

};

export default route;
