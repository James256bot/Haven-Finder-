-- Ensure favorites table exists with the shape we need.
-- If it already exists with different columns, we add what's missing.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorites') THEN
    CREATE TABLE favorites (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, listing_id)
    );
  END IF;
END $$;

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Drop old unique constraint if it exists with a different name
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_listing_unique;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_listing_unique UNIQUE (user_id, listing_id);

CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS favorites_listing_idx ON favorites (listing_id);
