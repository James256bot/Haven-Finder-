import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../lib/db';

async function requireAdmin(req: any, reply: any) {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });
    return false;
  }
  return true;
}

const route: FastifyPluginAsync = async (app) => {
  app.get('/admin/overview', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM users WHERE created_at > now() - interval '7 days') AS users_new_7d,
        (SELECT COUNT(*)::int FROM listings WHERE status = 'published') AS listings_published,
        (SELECT COUNT(*)::int FROM listings WHERE status = 'pending_review') AS listings_pending,
        (SELECT COUNT(*)::int FROM listings WHERE created_at > now() - interval '7 days') AS listings_new_7d,
        (SELECT COUNT(*)::int FROM viewing_requests WHERE status = 'pending') AS viewings_pending,
        (SELECT COUNT(*)::int FROM verification_requests WHERE status IN ('pending','in_review')) AS verifications_pending,
        (SELECT COUNT(*)::int FROM promotions WHERE status = 'pending') AS promotions_pending,
        (SELECT COUNT(*)::int FROM reports WHERE status = 'open') AS reports_open,
        (SELECT COALESCE(SUM(price_amount), 0)::numeric FROM promotions WHERE payment_status = 'paid') AS revenue_promotions_ugx,
        (SELECT COALESCE(SUM(price_amount), 0)::numeric FROM verification_requests WHERE payment_status = 'paid') AS revenue_verifications_ugx
    `);
    return { success: true, data: r.rows[0] };
  });

  app.get('/admin/verifications', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const r = await pool.query(`
      SELECT v.id, v.requested_tier, v.status, v.price_amount, v.currency,
             v.payment_status, v.admin_note, v.created_at, v.decided_at,
             l.id AS listing_id, l.slug, l.title, l.city, l.main_image_url,
             l.verification AS current_verification,
             u.id AS user_id, u.email AS user_email, u.full_name AS user_name
      FROM verification_requests v
      JOIN listings l ON l.id = v.listing_id
      JOIN users u ON u.id = v.user_id
      WHERE v.status IN ('pending','in_review')
      ORDER BY v.created_at DESC LIMIT 100`);
    return { success: true, data: { verifications: r.rows } };
  });

  app.patch('/admin/verifications/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const r = await pool.query(
      `UPDATE verification_requests
       SET status = $1, admin_id = $2, admin_note = COALESCE($3, admin_note),
           payment_status = CASE WHEN $1 = 'approved' THEN 'paid' ELSE payment_status END,
           paid_at = CASE WHEN $1 = 'approved' THEN now() ELSE paid_at END,
           decided_at = CASE WHEN $1 IN ('approved','rejected') THEN now() ELSE decided_at END,
           updated_at = now()
       WHERE id = $4 RETURNING id, listing_id, status`,
      [body.status, req.user!.sub, body.adminNote ?? null, id]);
    if (!r.rowCount) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    if (body.status === 'approved') {
      await pool.query(`UPDATE listings SET verification = 'verified' WHERE id = $1`, [r.rows[0].listing_id]);
    }
    return { success: true, data: { request: r.rows[0] } };
  });

  app.get('/admin/promotions', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const r = await pool.query(`
      SELECT p.id, p.tier, p.status, p.price_amount, p.currency,
             p.payment_status, p.payment_provider, p.payment_reference,
             p.starts_at, p.expires_at, p.created_at,
             l.id AS listing_id, l.slug, l.title, l.main_image_url,
             u.email AS user_email, u.full_name AS user_name
      FROM promotions p
      JOIN listings l ON l.id = p.listing_id
      JOIN users u ON u.id = p.user_id
      WHERE p.status IN ('pending','active')
      ORDER BY CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END, p.created_at DESC
      LIMIT 100`);
    return { success: true, data: { promotions: r.rows } };
  });

  app.patch('/admin/promotions/:id/activate', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { id } = req.params as { id: string };
    const r = await pool.query(
      `UPDATE promotions
       SET status = 'active', starts_at = now(),
           expires_at = now() + (duration_days || ' days')::interval,
           payment_status = 'paid', paid_at = now(), updated_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, listing_id, tier, expires_at`, [id]);
    if (!r.rowCount) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    await pool.query(`UPDATE listings SET is_featured = true WHERE id = $1`, [r.rows[0].listing_id]);
    return { success: true, data: { promotion: r.rows[0] } };
  });

  app.patch('/admin/promotions/:id/cancel', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { id } = req.params as { id: string };
    const r = await pool.query(
      `UPDATE promotions SET status = 'cancelled', payment_status = 'refunded', updated_at = now()
       WHERE id = $1 AND status IN ('pending','active') RETURNING listing_id`, [id]);
    if (!r.rowCount) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    await pool.query(`UPDATE listings SET is_featured = false WHERE id = $1`, [r.rows[0].listing_id]);
    return { success: true, data: { message: 'Cancelled' } };
  });

  app.get('/admin/listings', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const status = (req.query as any).status ?? 'pending_review';
    const r = await pool.query(
      `SELECT l.id, l.slug, l.title, l.status, l.verification, l.source_code,
              l.city, l.country, l.price_amount, l.currency, l.price_period,
              l.main_image_url, l.created_at, l.is_seed,
              u.email AS owner_email, u.full_name AS owner_name
       FROM listings l LEFT JOIN users u ON u.id = l.user_id
       WHERE l.status = $1 ORDER BY l.created_at DESC LIMIT 100`, [status]);
    return { success: true, data: { listings: r.rows } };
  });

  app.patch('/admin/listings/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const newStatus =
      body.action === 'approve' || body.action === 'restore' ? 'published' :
      body.action === 'reject' ? 'rejected' :
      body.action === 'suspend' ? 'suspended' : null;
    if (!newStatus) return reply.code(400).send({ success: false, error: { code: 'BAD_ACTION' } });
    const r = await pool.query(
      `UPDATE listings SET status = $1,
              published_at = CASE WHEN $1 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
              updated_at = now()
       WHERE id = $2 RETURNING id, slug, title, status`, [newStatus, id]);
    if (!r.rowCount) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    return { success: true, data: { listing: r.rows[0] } };
  });

  app.get('/admin/users', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const search = (req.query as any).q ?? '';
    const args: any[] = [];
    let where = '1=1';
    if (search) { where = `(email ILIKE $1 OR full_name ILIKE $1)`; args.push(`%${search}%`); }
    const r = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.is_banned,
              u.verification, u.country_code, u.created_at, u.last_login_at,
              (SELECT COUNT(*)::int FROM listings WHERE user_id = u.id) AS listing_count,
              (SELECT COUNT(*)::int FROM viewing_requests WHERE owner_id = u.id) AS incoming_viewings
       FROM users u WHERE ${where} ORDER BY u.created_at DESC LIMIT 100`, args);
    return { success: true, data: { users: r.rows } };
  });

  app.patch('/admin/users/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    const { id } = req.params as { id: string };
    const body = req.body as any;
    if (id === req.user!.sub) {
      return reply.code(400).send({ success: false, error: { code: 'SELF_MODIFY' } });
    }
    const map: Record<string, string> = {
      ban:             `UPDATE users SET is_banned = true, updated_at = now() WHERE id = $1 RETURNING id, email, is_banned`,
      unban:           `UPDATE users SET is_banned = false, updated_at = now() WHERE id = $1 RETURNING id, email, is_banned`,
      promote_owner:   `UPDATE users SET role = 'owner', updated_at = now() WHERE id = $1 RETURNING id, email, role`,
      promote_agent:   `UPDATE users SET role = 'provider', updated_at = now() WHERE id = $1 RETURNING id, email, role`,
      demote:          `UPDATE users SET role = 'user', updated_at = now() WHERE id = $1 RETURNING id, email, role`,
    };
    const sql = map[body.action];
    if (!sql) return reply.code(400).send({ success: false, error: { code: 'BAD_ACTION' } });
    const r = await pool.query(sql, [id]);
    if (!r.rowCount) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    return { success: true, data: { user: r.rows[0] } };
  });

  app.get('/admin/reports', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;
    try {
      const r = await pool.query(`SELECT id, listing_id, reporter_id, reason, details, status, created_at
        FROM reports WHERE status = 'open' ORDER BY created_at DESC LIMIT 100`);
      return { success: true, data: { reports: r.rows } };
    } catch {
      return { success: true, data: { reports: [] } };
    }
  });
};

export default route;
