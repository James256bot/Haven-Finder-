import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';

const SendBody = z.object({
  content: z.string().min(1).max(4000),
});

const StartBody = z.object({
  content: z.string().min(1).max(4000),
});

const route: FastifyPluginAsync = async (app) => {
  // ── POST /listings/:id/messages ────────────────────────
  // Find or create a conversation with the listing owner.
  app.post('/listings/:id/messages', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id: listingId } = req.params as { id: string };
    const { content } = StartBody.parse(req.body);
    const me = req.user!.sub;

    const lr = await pool.query(
      `SELECT id, user_id, title FROM listings WHERE id = $1 AND status = 'published'`,
      [listingId],
    );
    if (!lr.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } });
    }
    const listing = lr.rows[0];
    if (listing.user_id === me) {
      return reply.code(400).send({ success: false, error: { code: 'OWN_LISTING', message: 'You cannot message yourself about your own listing' } });
    }

    // Rate-limit: max 20 new conversations per day
    const today = await pool.query(
      `SELECT COUNT(*)::int AS n FROM conversations
       WHERE participant_ids @> ARRAY[$1]::uuid[]
         AND created_at > now() - interval '24 hours'`,
      [me],
    );
    if (today.rows[0].n >= 20) {
      return reply.code(429).send({ success: false, error: { code: 'RATE_LIMIT', message: 'Too many conversations started today' } });
    }

    // Find existing conversation between me + owner on this listing
    const existing = await pool.query(
      `SELECT id FROM conversations
       WHERE listing_id = $1
         AND participant_ids @> ARRAY[$2, $3]::uuid[]
       LIMIT 1`,
      [listingId, me, listing.user_id],
    );

    let convoId: string;
    if (existing.rowCount) {
      convoId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO conversations (listing_id, participant_ids, subject, last_message_at, last_message_preview)
         VALUES ($1, ARRAY[$2, $3]::uuid[], $4, now(), $5)
         RETURNING id`,
        [listingId, me, listing.user_id, listing.title, content.slice(0, 120)],
      );
      convoId = ins.rows[0].id;
    }

    const msg = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [convoId, me, content],
    );

    await pool.query(
      `UPDATE conversations SET last_message_at = now(), last_message_preview = $1, updated_at = now() WHERE id = $2`,
      [content.slice(0, 120), convoId],
    );

    return reply.code(201).send({
      success: true,
      data: { conversationId: convoId, message: msg.rows[0] },
    });
  });

  // ── GET /me/conversations ───────────────────────────────
  app.get('/me/conversations', { preHandler: [app.authenticate] }, async (req) => {
    const r = await pool.query(
      `SELECT
         c.id, c.listing_id, c.subject, c.last_message_at, c.last_message_preview,
         l.slug AS listing_slug, l.title AS listing_title, l.main_image_url,
         (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.is_read = false) AS unread,
         (SELECT u.full_name FROM users u
            WHERE u.id = ANY(c.participant_ids) AND u.id <> $1 LIMIT 1) AS other_name,
         (SELECT u.id FROM users u
            WHERE u.id = ANY(c.participant_ids) AND u.id <> $1 LIMIT 1) AS other_id
       FROM conversations c
       LEFT JOIN listings l ON l.id = c.listing_id
       WHERE c.participant_ids @> ARRAY[$1]::uuid[]
       ORDER BY c.last_message_at DESC NULLS LAST
       LIMIT 100`,
      [req.user!.sub],
    );
    return { success: true, data: { conversations: r.rows } };
  });

  // ── GET /conversations/:id ──────────────────────────────
  app.get('/conversations/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const me = req.user!.sub;

    const cr = await pool.query(
      `SELECT c.id, c.listing_id, c.subject,
              l.slug AS listing_slug, l.title AS listing_title, l.main_image_url,
              (SELECT u.id FROM users u WHERE u.id = ANY(c.participant_ids) AND u.id <> $1 LIMIT 1) AS other_id,
              (SELECT u.full_name FROM users u WHERE u.id = ANY(c.participant_ids) AND u.id <> $1 LIMIT 1) AS other_name
       FROM conversations c
       LEFT JOIN listings l ON l.id = c.listing_id
       WHERE c.id = $2 AND c.participant_ids @> ARRAY[$1]::uuid[]`,
      [me, id],
    );
    if (!cr.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const msgs = await pool.query(
      `SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at,
              u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT 500`,
      [id],
    );

    return { success: true, data: { conversation: cr.rows[0], messages: msgs.rows } };
  });

  // ── POST /conversations/:id/messages ────────────────────
  app.post('/conversations/:id/messages', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { content } = SendBody.parse(req.body);
    const me = req.user!.sub;

    const cr = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND participant_ids @> ARRAY[$2]::uuid[]`,
      [id, me],
    );
    if (!cr.rowCount) {
      return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const m = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [id, me, content],
    );

    await pool.query(
      `UPDATE conversations SET last_message_at = now(), last_message_preview = $1, updated_at = now() WHERE id = $2`,
      [content.slice(0, 120), id],
    );

    return reply.code(201).send({ success: true, data: { message: m.rows[0] } });
  });

  // ── PATCH /conversations/:id/read ───────────────────────
  app.patch('/conversations/:id/read', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const me = req.user!.sub;

    await pool.query(
      `UPDATE messages SET is_read = true, read_at = now()
       WHERE conversation_id = $1 AND sender_id <> $2 AND is_read = false`,
      [id, me],
    );

    return { success: true, data: { message: 'Marked read' } };
  });
};

export default route;
