-- Migration: Replace Resend with Brevo
-- This migration renames resend_email_id to brevo_email_id and updates indexes

-- Rename column from resend_email_id to brevo_email_id
ALTER TABLE email_queue RENAME COLUMN resend_email_id TO brevo_email_id;

-- Update index name
DROP INDEX IF EXISTS idx_email_queue_resend_id;
CREATE INDEX IF NOT EXISTS idx_email_queue_brevo_id ON email_queue(brevo_email_id);

