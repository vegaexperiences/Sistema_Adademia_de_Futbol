-- Migrate existing players to separate tables based on their status
-- This migration moves:
-- - Players with status='Pending' -> pending_players
-- - Players with status='Rejected' -> rejected_players
-- - Players with status='Active' or 'Scholarship' -> remain in players table

-- IMPORTANT: Run this migration AFTER create_separate_player_tables.sql
-- IMPORTANT: Backup your database before running this migration

BEGIN;

-- 1. Move Pending players to pending_players table
INSERT INTO pending_players (
  id,
  family_id,
  first_name,
  last_name,
  birth_date,
  gender,
  cedula,
  category,
  discount_percent,
  monthly_fee_override,
  image_url,
  notes,
  created_at,
  updated_at,
  tutor_name,
  tutor_cedula,
  tutor_email,
  tutor_phone,
  custom_monthly_fee,
  payment_status,
  last_payment_date,
  cedula_front_url,
  cedula_back_url,
  monthly_statement_sent_at
)
SELECT 
  id,
  family_id,
  first_name,
  last_name,
  birth_date,
  gender,
  cedula,
  category,
  discount_percent,
  monthly_fee_override,
  image_url,
  notes,
  created_at,
  updated_at,
  tutor_name,
  tutor_cedula,
  tutor_email,
  tutor_phone,
  custom_monthly_fee,
  payment_status,
  last_payment_date,
  cedula_front_url,
  cedula_back_url,
  monthly_statement_sent_at
FROM players
WHERE status = 'Pending'
ON CONFLICT (id) DO NOTHING;

-- 2. Move Rejected players to rejected_players table
INSERT INTO rejected_players (
  id,
  family_id,
  first_name,
  last_name,
  birth_date,
  gender,
  cedula,
  category,
  discount_percent,
  monthly_fee_override,
  image_url,
  notes,
  created_at,
  updated_at,
  tutor_name,
  tutor_cedula,
  tutor_email,
  tutor_phone,
  custom_monthly_fee,
  payment_status,
  last_payment_date,
  cedula_front_url,
  cedula_back_url,
  monthly_statement_sent_at,
  rejected_at
)
SELECT 
  id,
  family_id,
  first_name,
  last_name,
  birth_date,
  gender,
  cedula,
  category,
  discount_percent,
  monthly_fee_override,
  image_url,
  notes,
  created_at,
  updated_at,
  tutor_name,
  tutor_cedula,
  tutor_email,
  tutor_phone,
  custom_monthly_fee,
  payment_status,
  last_payment_date,
  cedula_front_url,
  cedula_back_url,
  monthly_statement_sent_at,
  updated_at AS rejected_at -- Use updated_at as rejection time
FROM players
WHERE status = 'Rejected'
ON CONFLICT (id) DO NOTHING;

-- 3. Handle payments for players that will be deleted
-- First, disable the update_updated_at trigger on payments to avoid errors
-- (The trigger tries to update updated_at which may not exist)
ALTER TABLE payments DISABLE TRIGGER update_payments_updated_at;

-- Update payments to set player_id = NULL
-- This prevents the foreign key constraint from causing issues during deletion
UPDATE payments
SET player_id = NULL
WHERE player_id IN (
  SELECT id FROM players WHERE status IN ('Pending', 'Rejected')
);

-- Re-enable the trigger
ALTER TABLE payments ENABLE TRIGGER update_payments_updated_at;

-- 4. Delete Pending and Rejected players from players table
-- (Only Active and Scholarship players should remain)
DELETE FROM players
WHERE status IN ('Pending', 'Rejected');

-- 5. Verify that only Active and Scholarship players remain in players table
-- (This is a check - if there are other statuses, they will remain but should be reviewed)
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM players
  WHERE status NOT IN ('Active', 'Scholarship');
  
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Warning: Found % players with status other than Active or Scholarship. These will remain in players table.', invalid_count;
  END IF;
END $$;

-- 6. Update payments table foreign key constraint if needed
-- Note: payments.player_id currently references players(id)
-- Since we're moving players, we need to ensure that:
-- - Payments for pending players: These payments should reference pending_players.id
-- - Payments for rejected players: These payments should reference rejected_players.id
-- - Payments for active/scholarship players: These remain referencing players.id

-- However, PostgreSQL doesn't support foreign keys to multiple tables directly
-- We have a few options:
-- Option A: Keep payments.player_id referencing only players (approved players)
--   - This means payments for pending/rejected players won't have foreign key constraints
--   - We'll need to handle this in application logic
-- Option B: Create a view that unions all player tables
--   - More complex but maintains referential integrity
-- Option C: Add separate columns for pending_player_id and rejected_player_id
--   - More normalized but requires application changes

-- For now, we'll keep the foreign key constraint on players only
-- Payments for pending/rejected players will need to be handled separately
-- or we can create a view later if needed

COMMIT;

-- 7. Log migration results
DO $$
DECLARE
  pending_count INTEGER;
  rejected_count INTEGER;
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count FROM pending_players;
  SELECT COUNT(*) INTO rejected_count FROM rejected_players;
  SELECT COUNT(*) INTO active_count FROM players;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - Moved % players to pending_players', pending_count;
  RAISE NOTICE '  - Moved % players to rejected_players', rejected_count;
  RAISE NOTICE '  - Kept % players in players table (Active/Scholarship)', active_count;
END $$;

