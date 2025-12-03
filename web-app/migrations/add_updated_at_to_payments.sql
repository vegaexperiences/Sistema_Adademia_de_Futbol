-- Add updated_at column to payments table if it doesn't exist
-- This is needed for the update trigger to work correctly

-- Step 1: Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Update existing records to have updated_at = created_at
    UPDATE payments 
    SET updated_at = COALESCE(created_at, NOW())
    WHERE updated_at IS NULL;
    
    RAISE NOTICE 'Added updated_at column to payments table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in payments table';
  END IF;
END $$;

-- Step 2: Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = TG_TABLE_NAME AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Ensure the trigger exists
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Verify
DO $$
DECLARE
  column_exists BOOLEAN;
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'updated_at'
  ) INTO column_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_payments_updated_at' 
    AND tgrelid = 'payments'::regclass
  ) INTO trigger_exists;
  
  IF column_exists AND trigger_exists THEN
    RAISE NOTICE '✅ Migration completed successfully. updated_at column and trigger are set up.';
  ELSE
    RAISE WARNING '⚠️ Migration may have issues. Column exists: %, Trigger exists: %', column_exists, trigger_exists;
  END IF;
END $$;

