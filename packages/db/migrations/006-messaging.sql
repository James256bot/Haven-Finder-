BEGIN;

-- Speed up "find conversations where user X is a participant"
CREATE INDEX IF NOT EXISTS conversations_participants_idx
  ON conversations USING GIN (participant_ids);

-- Ordering conversations by recency
CREATE INDEX IF NOT EXISTS conversations_last_msg_idx
  ON conversations (last_message_at DESC NULLS LAST);

-- Messages by sender (for spam / rate limits)
CREATE INDEX IF NOT EXISTS messages_sender_idx
  ON messages (sender_id, created_at DESC);

COMMIT;
