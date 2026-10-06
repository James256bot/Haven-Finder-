BEGIN;

-- Auto-generated marketing content per listing
CREATE TABLE IF NOT EXISTS marketing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,                     -- 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'email'
  content text NOT NULL,
  hashtags text[],
  media_urls text[],
  status text NOT NULL DEFAULT 'draft',       -- 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_for timestamptz,
  published_at timestamptz,
  external_url text,
  external_id text,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_posts_listing_idx ON marketing_posts (listing_id);
CREATE INDEX IF NOT EXISTS marketing_posts_status_idx ON marketing_posts (status, scheduled_for);
CREATE INDEX IF NOT EXISTS marketing_posts_user_idx ON marketing_posts (user_id, created_at DESC);

-- Marketing automation config per user (auto-generate posts on publish?)
CREATE TABLE IF NOT EXISTS marketing_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auto_generate boolean NOT NULL DEFAULT true,
  auto_schedule boolean NOT NULL DEFAULT false,
  platforms text[] DEFAULT ARRAY['instagram','facebook','twitter'],
  brand_handle text,
  default_hashtags text[] DEFAULT ARRAY['#HavenFinder','#Uganda','#RealEstate','#Kampala'],
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Outbound email/SMS queue
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  channel text NOT NULL,                      -- 'email' | 'sms' | 'whatsapp'
  audience text NOT NULL,                     -- 'all_users' | 'saved_similar' | 'nearby' | 'returning'
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  content text NOT NULL,
  subject text,
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',      -- 'queued' | 'sending' | 'sent' | 'failed'
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_campaigns_status_idx ON marketing_campaigns (status, scheduled_for);

COMMIT;
