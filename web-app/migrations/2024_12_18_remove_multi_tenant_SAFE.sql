-- =====================================================
-- SAFE MIGRATION: Remove Multi-Tenant Architecture
-- This version only affects tables that actually exist
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Drop ALL existing RLS policies (safe approach)
-- =====================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Drop academy_id columns from existing tables
-- =====================================================

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'academy_id'
    LOOP
        -- Drop foreign key constraints first
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
            tbl.table_name, tbl.table_name || '_academy_id_fkey');
        
        -- Drop the column
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS academy_id CASCADE', 
            tbl.table_name);
        
        RAISE NOTICE 'Dropped academy_id from table: %', tbl.table_name;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Drop multi-tenant specific tables
-- =====================================================

DROP TABLE IF EXISTS super_admins CASCADE;
DROP TABLE IF EXISTS academies CASCADE;

-- =====================================================
-- STEP 4: Drop multi-tenant functions
-- =====================================================

DROP FUNCTION IF EXISTS set_academy_context(uuid);
DROP FUNCTION IF EXISTS get_current_academy_id();

-- =====================================================
-- STEP 5: Create simplified RLS policies (single-tenant)
-- Only for tables that exist
-- =====================================================

-- Players table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'players') THEN
        ALTER TABLE players ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Players: Public read for enrollment"
          ON players FOR SELECT USING (true);
          
        CREATE POLICY "Players: Authenticated can manage"
          ON players FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Families table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'families') THEN
        ALTER TABLE families ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Families: Authenticated can manage"
          ON families FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Payments table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Payments: Public read for payment portal"
          ON payments FOR SELECT USING (true);
          
        CREATE POLICY "Payments: Authenticated can manage"
          ON payments FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Transactions table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Transactions: Authenticated can manage"
          ON transactions FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Sponsors table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sponsors') THEN
        ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Sponsors: Public read"
          ON sponsors FOR SELECT USING (true);
          
        CREATE POLICY "Sponsors: Authenticated can manage"
          ON sponsors FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Sponsor registrations table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sponsor_registrations') THEN
        ALTER TABLE sponsor_registrations ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Sponsor registrations: Public can create"
          ON sponsor_registrations FOR INSERT WITH CHECK (true);
          
        CREATE POLICY "Sponsor registrations: Authenticated can manage"
          ON sponsor_registrations FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Email queue table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_queue') THEN
        ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Email queue: Authenticated can manage"
          ON email_queue FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Pending players table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pending_players') THEN
        ALTER TABLE pending_players ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Pending players: Authenticated can manage"
          ON pending_players FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Staff table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
        ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Staff: Authenticated can manage"
          ON staff FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Tournaments table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournaments') THEN
        ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Tournaments: Public read"
          ON tournaments FOR SELECT USING (true);
          
        CREATE POLICY "Tournaments: Authenticated can manage"
          ON tournaments FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Settings table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settings') THEN
        ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Settings: Authenticated can manage"
          ON settings FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- User role assignments table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_role_assignments') THEN
        ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
        
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
    END IF;
END $$;

-- =====================================================
-- STEP 6: Drop old academy_id indexes
-- =====================================================

DROP INDEX IF EXISTS idx_players_academy_id;
DROP INDEX IF EXISTS idx_families_academy_id;
DROP INDEX IF EXISTS idx_payments_academy_id;
DROP INDEX IF EXISTS idx_transactions_academy_id;
DROP INDEX IF EXISTS idx_sponsors_academy_id;
DROP INDEX IF EXISTS idx_email_queue_academy_id;
DROP INDEX IF EXISTS idx_pending_players_academy_id;
DROP INDEX IF EXISTS idx_user_role_assignments_academy_id;

-- =====================================================
-- STEP 7: Create new simplified indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_players_status ON players(status) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'players');
CREATE INDEX IF NOT EXISTS idx_players_family_id ON players(family_id) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'players');
CREATE INDEX IF NOT EXISTS idx_payments_player_id ON payments(player_id) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments');
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments');
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'transactions');
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'email_queue');
CREATE INDEX IF NOT EXISTS idx_pending_players_status ON pending_players(status) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'pending_players');
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id) WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_role_assignments');

-- =====================================================
-- STEP 8: Cleanup and validation
-- =====================================================

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
    RAISE NOTICE '✅ SUCCESS: All academy_id columns have been removed';
  END IF;
END $$;

COMMIT;
