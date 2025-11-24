-- Add email tracking columns to email_queue table
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS resend_email_id TEXT;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Add index for faster lookup by resend_email_id
CREATE INDEX IF NOT EXISTS idx_email_queue_resend_id ON email_queue(resend_email_id);

-- Add player_id column to link emails to players
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- Add index for player email history queries
CREATE INDEX IF NOT EXISTS idx_email_queue_player_id ON email_queue(player_id);
