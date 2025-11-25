-- Fix emails with status='sent' but sent_at is null
-- Set sent_at to created_at for these emails

UPDATE email_queue
SET sent_at = created_at
WHERE status = 'sent' 
  AND sent_at IS NULL
  AND created_at IS NOT NULL;

