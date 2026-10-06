BEGIN;

-- Promotions: featured/boosted listings with an expiry
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier text NOT NULL,                   -- 'boost' | 'featured' | 'premium'
  price_amount numeric(18,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'UGX',
  duration_days integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'expired' | 'cancelled'
  starts_at timestamptz,
  expires_at timestamptz,
  payment_provider text,
  payment_reference text,
  payment_status text NOT NULL DEFAULT 'unpaid', -- 'unpaid' | 'paid' | 'failed' | 'refunded'
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promotions_listing_idx ON promotions (listing_id);
CREATE INDEX IF NOT EXISTS promotions_user_idx ON promotions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS promotions_status_idx ON promotions (status);
CREATE INDEX IF NOT EXISTS promotions_expiry_idx ON promotions (expires_at) WHERE status = 'active';

-- Verification requests: owner asks for a property to be verified
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_tier text NOT NULL DEFAULT 'basic',    -- 'basic' | 'full'
  price_amount numeric(18,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'UGX',
  status text NOT NULL DEFAULT 'pending',          -- 'pending' | 'in_review' | 'approved' | 'rejected'
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  admin_note text,
  payment_provider text,
  payment_reference text,
  payment_status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_requests_listing_idx ON verification_requests (listing_id);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON verification_requests (status);

-- Payment provider registry
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL,                            -- 'promotion' | 'verification' | 'subscription'
  reference_id uuid,                                -- points at promotion or verification row
  provider text NOT NULL,                           -- 'dev' | 'flutterwave' | 'pesapal' | 'mtn_momo'
  provider_reference text,
  amount numeric(18,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'UGX',
  status text NOT NULL DEFAULT 'pending',           -- 'pending' | 'success' | 'failed' | 'refunded'
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_transactions_user_idx ON payment_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON payment_transactions (status);

COMMIT;
