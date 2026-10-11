import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db';
import { hashPassword, verifyPassword } from '../services/password';
import { recordLoginAttempt, checkAccountLock, clearLoginFailures } from '../services/login-lockout';
import { logAudit } from '../services/audit';
import {
  signAccessToken, newRefreshToken, hashRefreshToken,
} from '../services/tokens';
import { config } from '../config';

const RegisterBody = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .refine(v => /[0-9]/.test(v) || /[^A-Za-z0-9]/.test(v), {
      message: 'Password must include a number or symbol',
    })
    .refine(v => !['password', '12345678', 'qwertyui', 'password1', 'letmein1'].includes(v.toLowerCase()), {
      message: 'Password is too common',
    }),
  fullName: z.string().min(1).max(255),
  countryCode: z.string().length(2).toUpperCase().optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(64).optional(),
  preferredCurrency: z.string().length(3).toUpperCase().optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function issueSession(app: any, reply: any, user: any, ua?: string, ip?: string) {
  const access = await signAccessToken({
    sub: user.id, email: user.email, role: user.role,
  });

  const { raw, hash } = newRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshTtlSeconds * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [user.id, hash, ua ?? null, ip ?? null, expiresAt],
  );

  reply.setCookie(config.cookieName, raw, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: config.refreshTtlSeconds,
  });

  return { accessToken: access, expiresIn: config.accessTtlSeconds };
}

const route: FastifyPluginAsync = async (app) => {
  // ── POST /auth/register ───────────────────────────────────
  app.post('/auth/register', { config: { rateLimit: { max: 3, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const body = RegisterBody.parse(req.body);

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [body.email]);
    if (exists.rowCount) {
      return reply.code(409).send({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'Email already registered' },
      });
    }

    const hash = await hashPassword(body.password);
    const r = await pool.query(
      `INSERT INTO users
         (email, password_hash, full_name, role,
          country_code, locale, timezone, preferred_currency)
       VALUES ($1,$2,$3,'user',$4,$5,$6,$7)
       RETURNING id, email, full_name, role, country_code, locale, timezone, preferred_currency, created_at`,
      [
        body.email, hash, body.fullName,
        body.countryCode ?? null,
        body.locale ?? 'en-UG',
        body.timezone ?? 'Africa/Kampala',
        body.preferredCurrency ?? 'UGX',
      ],
    );
    const user = r.rows[0];
    const session = await issueSession(app, reply, user, req.headers['user-agent'], req.ip);
    await logAudit({
      userId: user.id,
      action: 'signup.success',
      ip: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string) ?? null,
      metadata: { email: user.email },
    });

    return reply.code(201).send({
      success: true,
      data: { user, ...session },
    });
  });

  // ── POST /auth/login ──────────────────────────────────────
  app.post('/auth/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = LoginBody.parse(req.body);
    const ip = req.ip ?? null;
    const ua = (req.headers['user-agent'] as string) ?? null;

    // Account-level lockout (independent of per-IP rate limit)
    const lock = await checkAccountLock(body.email);
    if (lock.locked) {
      await logAudit({ action: 'login.locked', ip, userAgent: ua, success: false, metadata: { email: body.email } });
      return reply.code(429).send({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Try again in ${lock.retryAfterMinutes} minutes.`,
        },
      });
    }

    const r = await pool.query(
      `SELECT id, email, password_hash, full_name, role, is_active, is_banned,
              country_code, locale, timezone, preferred_currency
       FROM users WHERE email = $1`,
      [body.email],
    );
    const user = r.rows[0];
    if (!user || !user.password_hash) {
      await recordLoginAttempt(body.email, ip, false);
      await logAudit({ action: 'login.failed', ip, userAgent: ua, success: false, metadata: { email: body.email, reason: 'no_user' } });
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }
    if (user.is_banned) {
      return reply.code(403).send({
        success: false,
        error: { code: 'ACCOUNT_BANNED', message: 'Account is banned' },
      });
    }
    if (!user.is_active) {
      return reply.code(403).send({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive' },
      });
    }

    const ok = await verifyPassword(body.password, user.password_hash);
    if (!ok) {
      await recordLoginAttempt(body.email, ip, false);
      await logAudit({ userId: user.id, action: 'login.failed', ip, userAgent: ua, success: false, metadata: { email: body.email, reason: 'bad_password' } });
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Success — clear failures + audit
    await recordLoginAttempt(body.email, ip, true);
    await clearLoginFailures(body.email);
    await logAudit({ userId: user.id, action: 'login.success', ip, userAgent: ua });
    await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

    const { password_hash, is_active, is_banned, ...safe } = user;
    const session = await issueSession(app, reply, safe, req.headers['user-agent'], req.ip);

    return reply.send({ success: true, data: { user: safe, ...session } });
  });

  // ── POST /auth/refresh ────────────────────────────────────
  app.post('/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (req, reply) => {
    const raw = (req as any).cookies?.[config.cookieName]
      ?? (req.body as any)?.refreshToken;
    if (!raw) {
      return reply.code(401).send({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided' },
      });
    }

    const hash = hashRefreshToken(raw);
    const r = await pool.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
              u.email, u.role, u.is_active, u.is_banned
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [hash],
    );
    const row = r.rows[0];
    if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH', message: 'Refresh token invalid or expired' },
      });
    }
    if (!row.is_active || row.is_banned) {
      return reply.code(403).send({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Account disabled' },
      });
    }

    // Rotate: revoke old, issue new
    await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);
    const session = await issueSession(
      app, reply,
      { id: row.user_id, email: row.email, role: row.role },
      req.headers['user-agent'], req.ip,
    );

    return reply.send({ success: true, data: session });
  });

  // ── POST /auth/logout ─────────────────────────────────────
  app.post('/auth/logout', async (req, reply) => {
    const raw = (req as any).cookies?.[config.cookieName];
    if (raw) {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
        [hashRefreshToken(raw)],
      );
    }
    reply.clearCookie(config.cookieName, { path: '/' });
    return reply.send({ success: true, data: { message: 'Logged out' } });
  });

  // ── GET /auth/me ──────────────────────────────────────────
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const r = await pool.query(
      `SELECT id, email, full_name, role, avatar_url,
              country_code, locale, timezone, preferred_currency,
              verification, email_verified, last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.user!.sub],
    );
    if (!r.rowCount) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }
    return reply.send({ success: true, data: { user: r.rows[0] } });
  });
};

export default route;
