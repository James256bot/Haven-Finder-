import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import { config } from '../config';

const secret = new TextEncoder().encode(config.jwtSecret);

export type AccessClaims = {
  sub: string;
  email: string;
  role: string;
};

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('havenfinder')
    .setAudience('havenfinder-api')
    .setExpirationTime(`${config.accessTtlSeconds}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: 'havenfinder',
    audience: 'havenfinder-api',
  });
  return {
    sub: String(payload.sub),
    email: String(payload.email ?? ''),
    role: String(payload.role ?? 'user'),
  };
}

// ── Refresh tokens: opaque random, hashed at rest ─────────────
export function newRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
