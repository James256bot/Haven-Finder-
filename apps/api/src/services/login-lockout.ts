import { pool } from '../lib/db';

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 10;
const LOCK_DURATION_MINUTES = 15;

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
  try {
    await pool.query(
      `INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)`,
      [email.toLowerCase(), ip, success],
    );
  } catch (err) {
    console.error('[lockout] record failed:', err);
  }
}

export async function checkAccountLock(email: string): Promise<{ locked: boolean; retryAfterMinutes?: number }> {
  try {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS fails, MAX(created_at) AS last_fail
       FROM login_attempts
       WHERE email = $1
         AND success = false
         AND created_at > now() - interval '${WINDOW_MINUTES} minutes'`,
      [email.toLowerCase()],
    );
    const fails = r.rows[0]?.fails ?? 0;
    if (fails < MAX_FAILURES) return { locked: false };

    const lastFail = new Date(r.rows[0].last_fail).getTime();
    const unlockAt = lastFail + LOCK_DURATION_MINUTES * 60 * 1000;
    const now = Date.now();
    if (now >= unlockAt) return { locked: false };

    return { locked: true, retryAfterMinutes: Math.ceil((unlockAt - now) / 60000) };
  } catch (err) {
    console.error('[lockout] check failed:', err);
    return { locked: false };
  }
}

export async function clearLoginFailures(email: string) {
  try {
    await pool.query(
      `DELETE FROM login_attempts WHERE email = $1 AND success = false`,
      [email.toLowerCase()],
    );
  } catch (err) {
    console.error('[lockout] clear failed:', err);
  }
}
