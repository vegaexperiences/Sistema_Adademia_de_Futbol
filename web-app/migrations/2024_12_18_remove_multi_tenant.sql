-- =====================================================
-- MIGRATION: Remove Multi-Tenant Architecture
-- Date: 2024-12-18
-- Description: Convert from multi-tenant to single-tenant
-- 
-- This migration removes all academy_id columns and related
-- multi-tenant infrastructure from the database.
--
-- WARNING: This is a DESTRUCTIVE migration. 
-- BACKUP YOUR DATABASE BEFORE RUNNING!
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Drop all RLS policies that reference academy_id
-- =====================================================

-- Players table
DROP POLICY IF EXISTS "Players: Public enrollment read" ON players;
DROP POLICY IF EXISTS "Players: Users can view own academy players" ON players;
DROP POLICY IF EXISTS "Players: Staff can manage own academy players" ON players;

-- Tutors table
DROP POLICY IF EXISTS "Tutors: Users can view own academy tutors" ON tutors;
DROP POLICY IF EXISTS "Tutors: Staff can manage own academy tutors" ON tutors;

-- Families table
DROP POLICY IF EXISTS "Families: Users can view own academy families" ON families;
DROP POLICY IF EXISTS "Families: Staff can manage own academy families" ON families;

-- Payments table
DROP POLICY IF EXISTS "Payments: Public payment portal read" ON payments;
DROP POLICY IF EXISTS "Payments: Users can view own academy payments" ON payments;
DROP POLICY IF EXISTS "Payments: Staff can manage own academy payments" ON payments;

-- Transactions table
DROP POLICY IF EXISTS "Transactions: Users can view own academy transactions" ON transactions;
DROP POLICY IF EXISTS "Transactions: Staff can manage own academy transactions" ON transactions;

-- Sponsors table
DROP POLICY IF EXISTS "Sponsors: Public read" ON sponsors;
DROP POLICY IF EXISTS "Sponsors: Staff can manage own academy sponsors" ON sponsors;

-- Sponsor registrations table
DROP POLICY IF EXISTS "Sponsor registrations: Public read/write" ON sponsor_registrations;
DROP POLICY IF EXISTS "Sponsor registrations: Staff can view own academy" ON sponsor_registrations;

-- Sponsor player assignments
DROP POLICY IF EXISTS "Sponsor assignments: Staff can manage" ON sponsor_player_assignments;

-- Email queue
DROP POLICY IF EXISTS "Email queue: Staff can view own academy" ON email_queue;

-- Settings
DROP POLICY IF EXISTS "Settings: Users can view own academy settings" ON settings;
DROP POLICY IF EXISTS "Settings: Admins can manage own academy settings" ON settings;

-- Pending players
DROP POLICY IF EXISTS "Pending players: Staff can view own academy" ON pending_players;
DROP POLICY IF EXISTS "Pending players: Staff can manage own academy" ON pending_players;

-- Rejected players
DROP POLICY IF EXISTS "Rejected players: Staff can view own academy" ON rejected_players;

-- Email templates
DROP POLICY IF EXISTS "Email templates: Staff can view own academy" ON email_templates;
DROP POLICY IF EXISTS "Email templates: Admins can manage own academy" ON email_templates;

-- Staff members
DROP POLICY IF EXISTS "Staff: Users can view own academy staff" ON staff;

-- Staff payments
DROP POLICY IF EXISTS "Staff payments: Users can view own academy" ON staff_payments;

-- Tournaments
DROP POLICY IF EXISTS "Tournaments: Public read" ON tournaments;
DROP POLICY IF EXISTS "Tournaments: Staff can manage" ON tournaments;

-- Recurring expenses
DROP POLICY IF EXISTS "Recurring expenses: Users can view own academy" ON recurring_expenses;
DROP POLICY IF EXISTS "Recurring expenses: Admins can manage own academy" ON recurring_expenses;

-- Expense categories
DROP POLICY IF EXISTS "Expense categories: Users can view own academy" ON expense_categories;

-- Yappy orders
DROP POLICY IF EXISTS "Yappy orders: Staff can view own academy" ON yappy_orders;

-- PagueLo Facil orders  
DROP POLICY IF EXISTS "PagueLo Facil orders: Staff can view own academy" ON paguelofacil_orders;

-- User role assignments
DROP POLICY IF EXISTS "User role assignments: Users can view own" ON user_role_assignments;
DROP POLICY IF EXISTS "User role assignments: Admins can manage" ON user_role_assignments;

-- =====================================================
-- STEP 2: Drop foreign key constraints
-- =====================================================

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_academy_id_fkey;
ALTER TABLE tutors DROP CONSTRAINT IF EXISTS tutors_academy_id_fkey;
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_academy_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_academy_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_academy_id_fkey;
ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_academy_id_fkey;
ALTER TABLE sponsor_registrations DROP CONSTRAINT IF EXISTS sponsor_registrations_academy_id_fkey;
ALTER TABLE sponsor_player_assignments DROP CONSTRAINT IF EXISTS sponsor_player_assignments_academy_id_fkey;
ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_queue_academy_id_fkey;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_academy_id_fkey;
ALTER TABLE pending_players DROP CONSTRAINT IF EXISTS pending_players_academy_id_fkey;
ALTER TABLE rejected_players DROP CONSTRAINT IF EXISTS rejected_players_academy_id_fkey;
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_academy_id_fkey;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_academy_id_fkey;
ALTER TABLE staff_payments DROP CONSTRAINT IF EXISTS staff_payments_academy_id_fkey;
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_academy_id_fkey;
ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_academy_id_fkey;
ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_academy_id_fkey;
ALTER TABLE yappy_orders DROP CONSTRAINT IF EXISTS yappy_orders_academy_id_fkey;
ALTER TABLE paguelofacil_orders DROP CONSTRAINT IF EXISTS paguelofacil_orders_academy_id_fkey;
ALTER TABLE user_role_assignments DROP CONSTRAINT IF EXISTS user_role_assignments_academy_id_fkey;

-- =====================================================
-- STEP 3: Drop academy_id columns from all tables
-- =====================================================

-- Core tables
ALTER TABLE players DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE tutors DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE families DROP COLUMN IF EXISTS academy_id CASCADE;

-- Financial tables
ALTER TABLE payments DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE recurring_expenses DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE expense_categories DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE staff DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE staff_payments DROP COLUMN IF EXISTS academy_id CASCADE;

-- Sponsor tables
ALTER TABLE sponsors DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE sponsor_registrations DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE sponsor_player_assignments DROP COLUMN IF EXISTS academy_id CASCADE;

-- Communication tables
ALTER TABLE email_queue DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE email_templates DROP COLUMN IF EXISTS academy_id CASCADE;

-- Application tables
ALTER TABLE pending_players DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE rejected_players DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE tournaments DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE settings DROP COLUMN IF EXISTS academy_id CASCADE;

-- Payment provider tables
ALTER TABLE yappy_orders DROP COLUMN IF EXISTS academy_id CASCADE;
ALTER TABLE paguelofacil_orders DROP COLUMN IF EXISTS academy_id CASCADE;

-- User management
ALTER TABLE user_role_assignments DROP COLUMN IF EXISTS academy_id CASCADE;

-- =====================================================
-- STEP 4: Drop multi-tenant specific tables
-- =====================================================

DROP TABLE IF EXISTS super_admins CASCADE;
DROP TABLE IF EXISTS academies CASCADE;

-- =====================================================
-- STEP 5: Drop multi-tenant functions
-- =====================================================

DROP FUNCTION IF EXISTS set_academy_context(uuid);
DROP FUNCTION IF EXISTS get_current_academy_id();

-- =====================================================
-- STEP 6: Create simplified RLS policies (single-tenant)
-- =====================================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Players: Public can read for enrollment, authenticated can manage
CREATE POLICY "Players: Public read for enrollment"
  ON players FOR SELECT
  USING (true); -- Public read access

CREATE POLICY "Players: Authenticated can manage"
  ON players FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Families: Authenticated users can manage
CREATE POLICY "Families: Authenticated can manage"
  ON families FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Payments: Public read for payment portal, authenticated can manage
CREATE POLICY "Payments: Public read for payment portal"
  ON payments FOR SELECT
  USING (true);

CREATE POLICY "Payments: Authenticated can manage"
  ON payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Transactions: Authenticated users only
CREATE POLICY "Transactions: Authenticated can manage"
  ON transactions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Sponsors: Public read, authenticated can manage
CREATE POLICY "Sponsors: Public read"
  ON sponsors FOR SELECT
  USING (true);

CREATE POLICY "Sponsors: Authenticated can manage"
  ON sponsors FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Sponsor registrations: Public can create, authenticated can view/manage
CREATE POLICY "Sponsor registrations: Public can create"
  ON sponsor_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sponsor registrations: Authenticated can manage"
  ON sponsor_registrations FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Email queue: Authenticated users only
CREATE POLICY "Email queue: Authenticated can manage"
  ON email_queue FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Pending players: Authenticated users only
CREATE POLICY "Pending players: Authenticated can manage"
  ON pending_players FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Staff: Authenticated users only
CREATE POLICY "Staff: Authenticated can manage"
  ON staff FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Tournaments: Public read, authenticated can manage
CREATE POLICY "Tournaments: Public read"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Tournaments: Authenticated can manage"
  ON tournaments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Settings: Authenticated users only
CREATE POLICY "Settings: Authenticated can manage"
  ON settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- User role assignments: Users can view their own, admins can manage all
CREATE POLICY "User role assignments: Users can view own"
  ON user_role_assignments FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
    )
  );

CREATE POLICY "User role assignments: Admins can manage"
  ON user_role_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
    )
  );

-- =====================================================
-- STEP 7: Update indexes (remove academy_id indexes)
-- =====================================================

-- Drop old indexes that referenced academy_id
DROP INDEX IF EXISTS idx_players_academy_id;
DROP INDEX IF EXISTS idx_families_academy_id;
DROP INDEX IF EXISTS idx_payments_academy_id;
DROP INDEX IF EXISTS idx_transactions_academy_id;
DROP INDEX IF EXISTS idx_sponsors_academy_id;
DROP INDEX IF EXISTS idx_email_queue_academy_id;
DROP INDEX IF EXISTS idx_pending_players_academy_id;
DROP INDEX IF EXISTS idx_user_role_assignments_academy_id;

-- Create new simplified indexes
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_family_id ON players(family_id);
CREATE INDEX IF NOT EXISTS idx_payments_player_id ON payments(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_pending_players_status ON pending_players(status);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);

-- =====================================================
-- STEP 8: Cleanup and validation
-- =====================================================

-- Drop any remaining academy-related views
DROP VIEW IF EXISTS academy_stats CASCADE;
DROP VIEW IF EXISTS academy_financial_summary CASCADE;

-- Validate no academy_id columns remain
DO $$
DECLARE
  r RECORD;
  found_count INTEGER := 0;
BEGIN
  FOR r IN 
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND column_name = 'academy_id'
  LOOP
    RAISE WARNING 'Academy ID column still exists in table: %.%', r.table_name, r.column_name;
    found_count := found_count + 1;
  END LOOP;
  
  IF found_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % academy_id columns still exist', found_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All academy_id columns have been removed';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK PLAN (if needed)
-- =====================================================

-- To rollback, restore from backup taken before running this migration:
-- pg_restore -d your_database your_backup_file.dump
-- 
-- WARNING: There is no automated rollback for this migration.
-- Always test on a development/staging environment first!
