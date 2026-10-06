BEGIN;

CREATE TABLE IF NOT EXISTS viewing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  message text,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending',
  owner_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS viewing_requests_listing_idx ON viewing_requests (listing_id);
CREATE INDEX IF NOT EXISTS viewing_requests_requester_idx ON viewing_requests (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS viewing_requests_owner_idx ON viewing_requests (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS viewing_requests_status_idx ON viewing_requests (status);

COMMIT;
