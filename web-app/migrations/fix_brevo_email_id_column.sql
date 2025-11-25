-- Fix brevo_email_id column - handle both cases
-- If resend_email_id exists, rename it to brevo_email_id
-- If brevo_email_id doesn't exist, create it

-- Check if resend_email_id exists and rename it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_queue' 
        AND column_name = 'resend_email_id'
    ) THEN
        ALTER TABLE email_queue RENAME COLUMN resend_email_id TO brevo_email_id;
        RAISE NOTICE 'Renamed resend_email_id to brevo_email_id';
    END IF;
    
    -- If brevo_email_id still doesn't exist, create it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_queue' 
        AND column_name = 'brevo_email_id'
    ) THEN
        ALTER TABLE email_queue ADD COLUMN brevo_email_id TEXT;
        RAISE NOTICE 'Created brevo_email_id column';
    END IF;
END $$;

-- Update index
DROP INDEX IF EXISTS idx_email_queue_resend_id;
CREATE INDEX IF NOT EXISTS idx_email_queue_brevo_id ON email_queue(brevo_email_id);

