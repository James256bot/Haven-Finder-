import { pool } from '../lib/db';

export type AuditAction =
  | 'login.success'
  | 'login.failed'
  | 'login.locked'
  | 'signup.success'
  | 'password.changed'
  | 'listing.created'
  | 'listing.deleted'
  | 'saved_search.created';

export async function logAudit(opts: {
  userId?: string | null;
  action: AuditAction;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown>;
}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, ip, user_agent, success, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        opts.userId ?? null,
        opts.action,
        opts.ip ?? null,
        opts.userAgent ?? null,
        opts.success ?? true,
        JSON.stringify(opts.metadata ?? {}),
      ],
    );
  } catch (err) {
    // Never let audit failure break the request
    console.error('[audit] write failed:', err);
  }
}
