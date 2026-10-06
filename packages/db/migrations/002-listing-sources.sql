BEGIN;

-- Source registry
CREATE TABLE IF NOT EXISTS listing_sources (
  code          text PRIMARY KEY,           -- 'untera', 'kcca-arcgis', 'osm', 'rentcast', 'manual'
  name          text NOT NULL,
  base_url      text,
  country_codes char(2)[],                  -- null = global
  is_live       boolean NOT NULL DEFAULT true,
  is_trusted    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Provenance on listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source_code       text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source_listing_id text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source_url        text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_synced_at    timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS raw_data          jsonb;

CREATE INDEX IF NOT EXISTS properties_source_idx
  ON listings (source_code, source_listing_id);
CREATE UNIQUE INDEX IF NOT EXISTS properties_source_uniq
  ON listings (source_code, source_listing_id)
  WHERE source_code IS NOT NULL AND source_listing_id IS NOT NULL;

COMMIT;
