-- Add status column to payments table if it doesn't exist
-- This allows filtering payments by approval status for financial reports

-- Step 1: Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN status TEXT DEFAULT 'Approved';
    
    -- Add check constraint
    ALTER TABLE payments 
    ADD CONSTRAINT payments_status_check 
    CHECK (status IN ('Approved', 'Pending', 'Rejected', 'Cancelled'));
  END IF;
END $$;

-- Step 2: Update ALL existing payments to have 'Approved' status
-- This includes payments that were created before this migration
UPDATE payments 
SET status = 'Approved' 
WHERE status IS NULL OR status = '';

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Step 4: Verify the migration
DO $$
DECLARE
  payments_without_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO payments_without_status
  FROM payments
  WHERE status IS NULL OR status = '';
  
  IF payments_without_status > 0 THEN
    RAISE NOTICE 'Warning: % payments still without status. Setting them to Approved.', payments_without_status;
    UPDATE payments SET status = 'Approved' WHERE status IS NULL OR status = '';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully. All payments now have status.';
END $$;

