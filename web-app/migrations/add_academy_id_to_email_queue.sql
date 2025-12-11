-- Add academy_id to email_queue table for multi-tenant email tracking
ALTER TABLE email_queue 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_queue_academy_id ON email_queue(academy_id);

-- Add comment
COMMENT ON COLUMN email_queue.academy_id IS 'Academy that sent this email - used for multi-tenant Brevo account support';

