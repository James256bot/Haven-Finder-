import type { FastifyPluginAsync } from 'fastify';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../lib/db';

const BASE_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255),
  full_name varchar(255) NOT NULL,
  avatar_url text,
  email_verified boolean DEFAULT false,
  role varchar(50) DEFAULT 'user',
  preferences jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_banned boolean DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  phone_e164 text,
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  country_code varchar(2),
  locale varchar(10) DEFAULT 'en-UG',
  timezone varchar(64) DEFAULT 'Africa/Kampala',
  preferred_currency varchar(3) DEFAULT 'UGX',
  verification varchar(16) DEFAULT 'unverified'
);
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  title varchar(500) NOT NULL,
  slug varchar(500) NOT NULL UNIQUE,
  description text,
  type varchar(50) DEFAULT 'property',
  status varchar(50) DEFAULT 'draft',
  price numeric(12,2),
  currency varchar(3) DEFAULT 'USD',
  city varchar(255), state varchar(255),
  latitude double precision, longitude double precision,
  bedrooms integer, bathrooms numeric(3,1),
  square_feet integer, property_type varchar(100),
  view_count integer DEFAULT 0, favorite_count integer DEFAULT 0,
  average_rating numeric(3,2), review_count integer DEFAULT 0,
  ai_tags text[] DEFAULT '{}', metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  published_at timestamptz, deleted_at timestamptz,
  country varchar(100) DEFAULT 'US', main_image_url text,
  inquiry_count integer DEFAULT 0, listing_type varchar(32),
  country_code char(2), location_id uuid,
  price_period varchar(16), price_amount numeric(18,2),
  price_usd_cents numeric(18,2), address_line text,
  floor_area_sqm numeric(10,2), land_area_sqm numeric(12,2),
  furnishing varchar(16), availability varchar(16),
  verification varchar(16) DEFAULT 'unverified',
  is_featured boolean DEFAULT false, is_seed boolean DEFAULT false,
  video_url text, source_code text, source_listing_id text,
  source_url text, last_synced_at timestamptz, raw_data jsonb
);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city, state);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url text NOT NULL, alt text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  participant_ids uuid[] NOT NULL,
  subject varchar(500), last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  content text NOT NULL, is_read boolean DEFAULT false,
  read_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(100) NOT NULL, title text, body text,
  is_read boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token varchar(500), expires_at timestamptz NOT NULL,
  revoked_at timestamptz, created_at timestamptz DEFAULT now(),
  token_hash text, user_agent text, ip_address text
);
CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug varchar(255) NOT NULL UNIQUE, name varchar(255) NOT NULL,
  category varchar(100) DEFAULT 'general',
  is_active boolean DEFAULT true, icon text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason varchar(100) NOT NULL, details text,
  status varchar(50) DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);
`;

const route: FastifyPluginAsync = async (app) => {
  app.post('/admin/run-migrations', async (req, reply) => {
    const { secret } = req.body as { secret?: string };
    const expected = process.env.MIGRATION_SECRET ?? 'havenfinder-migrate-2026';
    if (secret !== expected) return reply.code(403).send({ error: 'bad secret' });

    const results: any[] = [];

    try {
      await pool.query(BASE_SCHEMA);
      results.push({ file: '000-base-schema (embedded)', ok: true });
    } catch (e: any) {
      results.push({ file: '000-base-schema (embedded)', ok: false, error: e.message });
      return { results };
    }

    const candidates = [
      '/app/packages/db/migrations',
      join(process.cwd(), 'packages/db/migrations'),
      join(process.cwd(), '../../packages/db/migrations'),
    ];

    let dir = '';
    for (const c of candidates) {
      try {
        const files = await readdir(c);
        if (files.some(f => f.endsWith('.sql'))) { dir = c; break; }
      } catch {}
    }

    if (dir) {
      const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        if (f === '000-base-schema.sql') continue;
        const sql = await readFile(join(dir, f), 'utf8');
        try {
          await pool.query(sql);
          results.push({ file: f, ok: true });
        } catch (e: any) {
          results.push({ file: f, ok: false, error: e.message });
        }
      }
    }

    return { dir: dir || 'embedded only', results };
  });
};

export default route;
