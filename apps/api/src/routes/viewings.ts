import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';

const CreateBody = z.object({
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().min(1).max(50),
  message: z.string().max(2000).optional(),
  contactPhone: z.string().min(6).max(30).optional(),
});

const UpdateBody = z.object({
  status: z.enum(['confirmed', 'rejected', 'rescheduled', 'completed', 'cancelled']),
  ownerNote: z.string().max(2000).optional(),
});

const route: FastifyPluginAsync = async (app) => {
  // ── POST /listings/:id/viewings ────────────────────────
  app.post('/listings/:id/viewings', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id: listingId } = req.params as { id: string };
    const body = CreateBody.parse(req.body);

    const lr = await pool.query(
      `SELECT id, user_id, title FROM listings WHERE id = $1 AND status = 'published'`,
      [listingId],
    );
    if (!lr.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }
    const listing = lr.rows[0];

    if (listing.user_id === req.user!.sub) {
      return reply.code(400).send({
        success: false,
        error: { code: 'OWN_LISTING', message: 'You cannot request a viewing on your own listing' },
      });
    }

    // Duplicate guard: same user + listing within last 24h with pending status
    const dup = await pool.query(
      `SELECT id FROM viewing_requests
       WHERE listing_id = $1 AND requester_id = $2
         AND status = 'pending'
         AND created_at > now() - interval '24 hours'`,
      [listingId, req.user!.sub],
    );
    if (dup.rowCount) {
      return reply.code(409).send({
        success: false,
        error: { code: 'DUPLICATE', message: 'You already have a pending request for this property' },
      });
    }

    const r = await pool.query(
      `INSERT INTO viewing_requests
         (listing_id, requester_id, owner_id, preferred_date, preferred_time, message, contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, status, created_at`,
      [
        listingId,
        req.user!.sub,
        listing.user_id,
        body.preferredDate,
        body.preferredTime,
        body.message ?? null,
        body.contactPhone ?? null,
      ],
    );

    return reply.code(201).send({
      success: true,
      data: { viewing: r.rows[0] },
    });
  });

  // ── GET /me/viewings — requests I made ────────────────
  app.get('/me/viewings', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT vr.id, vr.status, vr.preferred_date, vr.preferred_time,
              vr.message, vr.owner_note, vr.created_at,
              l.id AS listing_id, l.slug, l.title, l.city, l.country,
              l.main_image_url, l.price_amount, l.currency, l.price_period
       FROM viewing_requests vr
       JOIN listings l ON l.id = vr.listing_id
       WHERE vr.requester_id = $1
       ORDER BY vr.created_at DESC
       LIMIT 100`,
      [req.user!.sub],
    );
    return { success: true, data: { viewings: r.rows } };
  });

  // ── GET /me/incoming — requests on my listings ────────
  app.get('/me/incoming', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT vr.id, vr.status, vr.preferred_date, vr.preferred_time,
              vr.message, vr.contact_phone, vr.owner_note, vr.created_at,
              u.full_name AS requester_name, u.email AS requester_email,
              l.id AS listing_id, l.slug, l.title,
              l.main_image_url, l.price_amount, l.currency, l.price_period
       FROM viewing_requests vr
       JOIN listings l ON l.id = vr.listing_id
       JOIN users u ON u.id = vr.requester_id
       WHERE vr.owner_id = $1
       ORDER BY vr.created_at DESC
       LIMIT 100`,
      [req.user!.sub],
    );
    return { success: true, data: { viewings: r.rows } };
  });

  // ── PATCH /viewings/:id — owner responds ──────────────
  app.patch('/viewings/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = UpdateBody.parse(req.body);

    const cur = await pool.query(
      `SELECT id, owner_id, requester_id, status FROM viewing_requests WHERE id = $1`,
      [id],
    );
    if (!cur.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Viewing request not found' },
      });
    }
    const vr = cur.rows[0];

    // Owner or admin can update
    if (vr.owner_id !== req.user!.sub && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      return reply.code(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the property owner can update this request' },
      });
    }

    await pool.query(
      `UPDATE viewing_requests
       SET status = $1, owner_note = COALESCE($2, owner_note), updated_at = now()
       WHERE id = $3`,
      [body.status, body.ownerNote ?? null, id],
    );

    return { success: true, data: { message: 'Updated' } };
  });
};

export default route;
