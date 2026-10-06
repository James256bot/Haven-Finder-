BEGIN;

-- ════════════════════════════════════════════════════════════
-- 001 — International additive migration
-- Adds: currencies, exchange_rates, locations, location_type enum
-- Adds: international columns to users, listings, amenities,
--       listing_images, refresh_tokens
-- Creates: supporting indexes
-- Does NOT: drop, rename, retype, or alter any existing column
-- ════════════════════════════════════════════════════════════

-- ── Enum ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE location_type AS ENUM
    ('country','region','city','district','neighborhood');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── New tables ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currencies (
  code        char(3) PRIMARY KEY,
  name        text    NOT NULL,
  symbol      text    NOT NULL,
  minor_unit  smallint NOT NULL DEFAULT 2,
  is_active   boolean  NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id          text PRIMARY KEY,
  base_code   char(3) NOT NULL,
  quote_code  char(3) NOT NULL,
  rate        numeric(20,10) NOT NULL,
  source      text NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id         uuid REFERENCES locations(id) ON DELETE SET NULL,
  type              location_type NOT NULL,
  country_code      char(2) NOT NULL,
  name              text    NOT NULL,
  slug              text    NOT NULL,
  latitude          numeric(10,7),
  longitude         numeric(10,7),
  timezone          text    NOT NULL DEFAULT 'UTC',
  default_currency  char(3) NOT NULL DEFAULT 'USD',
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── users: international columns ───────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_e164          text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at   timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at   timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code        varchar(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale              varchar(10) DEFAULT 'en-UG';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone            varchar(64) DEFAULT 'Africa/Kampala';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency  varchar(3)  DEFAULT 'UGX';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification        varchar(16) DEFAULT 'unverified';

-- ── listings: international columns ────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type    varchar(32);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS country_code    char(2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS location_id     uuid;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_period    varchar(16);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_amount    numeric(18,2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_usd_cents numeric(18,2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS address_line    text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS floor_area_sqm  numeric(10,2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS land_area_sqm   numeric(12,2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS furnishing      varchar(16);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS availability    varchar(16);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS verification    varchar(16) DEFAULT 'unverified';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_featured     boolean NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_seed         boolean NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS video_url       text;

-- ── amenities: columns ─────────────────────────────────────
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS icon       text;
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true;

-- ── listing_images: alt ────────────────────────────────────
ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS alt text;

-- ── refresh_tokens: columns (nullable — safe for existing rows)
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address text;

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS exchange_rates_pair_idx
  ON exchange_rates (base_code, quote_code, fetched_at);

CREATE INDEX IF NOT EXISTS locations_parent_idx  ON locations (parent_id);
CREATE INDEX IF NOT EXISTS locations_country_idx ON locations (country_code);
CREATE UNIQUE INDEX IF NOT EXISTS locations_slug_uniq
  ON locations (country_code, parent_id, slug);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_hash_idx ON refresh_tokens (token_hash);

CREATE INDEX IF NOT EXISTS properties_location_idx     ON listings (location_id);
CREATE INDEX IF NOT EXISTS properties_country_idx      ON listings (country_code);
CREATE INDEX IF NOT EXISTS properties_price_idx        ON listings (price_usd_cents);
CREATE INDEX IF NOT EXISTS properties_listing_idx      ON listings (listing_type);
CREATE INDEX IF NOT EXISTS properties_verification_idx ON listings (verification);

COMMIT;
