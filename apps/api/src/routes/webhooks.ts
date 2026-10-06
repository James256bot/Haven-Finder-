import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

const route: FastifyPluginAsync = async (app) => {
  // ── DPO push notification ───────────────────────────────
  app.post('/webhooks/dpo', { config: { rawBody: true } as any }, async (req, reply) => {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    req.log.info({ body: raw.slice(0, 500) }, 'DPO webhook received');

    // Parse the flat XML response
    const data: Record<string, string> = {};
    const matches = raw.matchAll(/<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g);
    for (const m of matches) data[m[1]] = m[2];

    const result = data.Result;
    const transactionToken = data.TransactionToken;

    if (result === '000' && transactionToken) {
      // Find the payment transaction by our reference
      const tx = await pool.query(
        `SELECT id, user_id, purpose, reference_id
         FROM payment_transactions
         WHERE provider_reference = $1
         LIMIT 1`,
        [transactionToken],
      );

      if (tx.rowCount) {
        const row = tx.rows[0];

        await pool.query(
          `UPDATE payment_transactions
           SET status = 'success', raw_response = $1, updated_at = now()
           WHERE id = $2`,
          [JSON.stringify(data), row.id],
        );

        if (row.purpose === 'promotion') {
          const promo = await pool.query(
            `UPDATE promotions
             SET status = 'active',
                 starts_at = now(),
                 expires_at = now() + (duration_days || ' days')::interval,
                 payment_status = 'paid',
                 paid_at = now(),
                 payment_reference = $1,
                 updated_at = now()
             WHERE id = $2
             RETURNING listing_id`,
            [transactionToken, row.reference_id],
          );
          if (promo.rowCount) {
            await pool.query(
              `UPDATE listings SET is_featured = true WHERE id = $1`,
              [promo.rows[0].listing_id],
            );
          }
        } else if (row.purpose === 'verification') {
          await pool.query(
            `UPDATE verification_requests
             SET status = 'in_review', payment_status = 'paid', paid_at = now(),
                 payment_reference = $1, updated_at = now()
             WHERE id = $2`,
            [transactionToken, row.reference_id],
          );
        }
      }
    }

    // DPO requires this exact response
    reply.header('Content-Type', 'application/xml; charset=utf-8');
    return reply.send('<API3G><Response>OK</Response></API3G>');
  });

  // ── DPO redirect callback (customer returns) ────────────
  app.get('/api/payments/dpo/callback', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const token = q.TransactionToken;

    if (token) {
      // Verify with DPO before trusting the redirect
      const verify = await fetch('https://secure.3gdirectpay.com/API/v6/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        body: `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${process.env.DPO_COMPANY_TOKEN}</CompanyToken>
  <Request>verifyToken</Request>
          <TransactionToken>${token}</TransactionToken>
</API3G>`,
      });

      const xml = await verify.text();
      const data: Record<string, string> = {};
      for (const m of xml.matchAll(/<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g)) data[m[1]] = m[2];

      if (data.Result === '000') {
        // Success — redirect user to the frontend with a success flag
        return reply.redirect(`${process.env.API_BASE_URL}/my-listings?payment=success`);
      }
    }

    return reply.redirect(`${process.env.API_BASE_URL}/my-listings?payment=pending`);
  });

  // ── DPO back URL (customer cancels) ─────────────────────
  app.get('/api/payments/dpo/back', async (_req, reply) => {
    return reply.redirect(`${process.env.API_BASE_URL}/my-listings?payment=cancelled`);
  });
};

export default route;
