-- Add 'charge' as a valid type for payments table
-- This allows the system to track monthly charges separately from payments

-- First, check if we're using 'type' or 'payment_type' column
-- Update the CHECK constraint to include 'charge'

-- If using 'type' column (newer schema)
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
  
  -- Add new constraint that includes 'charge'
  -- Check which column exists and update accordingly
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'type'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_type_check 
      CHECK (type IN ('enrollment', 'monthly', 'custom', 'charge', 'Matrícula'));
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
      CHECK (payment_type IN ('enrollment', 'monthly', 'custom', 'charge'));
  END IF;
END $$;

