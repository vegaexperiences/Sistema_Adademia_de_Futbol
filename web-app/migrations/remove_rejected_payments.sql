-- Migration: Remove rejected payments from the payments table
-- Rejected payments are not real payments and should not be stored in the payments table
-- They should only be logged for audit purposes, not stored as payments

-- First, log what we're about to delete for audit purposes
DO $$
DECLARE
  rejected_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO rejected_count
  FROM payments
  WHERE status = 'Rejected';
  
  IF rejected_count > 0 THEN
    RAISE NOTICE 'Found % rejected payment(s) to remove. These are not real payments and should not appear in payment history.', rejected_count;
    
    -- Show details of rejected payments before deletion
    RAISE NOTICE 'Rejected payments details:';
    FOR rec IN (
      SELECT id, player_id, amount, type, method, payment_date, notes
      FROM payments
      WHERE status = 'Rejected'
      ORDER BY payment_date DESC
    ) LOOP
      RAISE NOTICE '  - Payment ID: %, Player: %, Amount: %, Type: %, Date: %, Notes: %',
        rec.id, rec.player_id, rec.amount, rec.type, rec.payment_date, 
        LEFT(COALESCE(rec.notes, ''), 50) || CASE WHEN LENGTH(COALESCE(rec.notes, '')) > 50 THEN '...' ELSE '' END;
    END LOOP;
  ELSE
    RAISE NOTICE 'No rejected payments found. Nothing to delete.';
  END IF;
END $$;

-- Delete all rejected payments
-- These are not real payments and should not appear in payment history
DELETE FROM payments
WHERE status = 'Rejected';

-- Verify deletion
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM payments
  WHERE status = 'Rejected';
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Successfully removed all rejected payments. No rejected payments remain in the system.';
  ELSE
    RAISE WARNING '⚠️ Warning: % rejected payment(s) still remain. Please check manually.', remaining_count;
  END IF;
END $$;

