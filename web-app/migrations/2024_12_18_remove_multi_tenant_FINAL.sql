-- =====================================================
-- FINAL MIGRATION: Remove Multi-Tenant Architecture
-- Version: FIXED (sin errores de índices)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Drop ALL existing RLS policies
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
        RAISE NOTICE 'Dropped policy: % on %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Drop academy_id columns from ALL tables
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
        
        RAISE NOTICE 'Dropped academy_id from: %', tbl.table_name;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Drop multi-tenant tables
-- =====================================================

DROP TABLE IF EXISTS super_admins CASCADE;
DROP TABLE IF EXISTS academies CASCADE;

-- =====================================================
-- STEP 4: Drop multi-tenant functions
-- =====================================================

DROP FUNCTION IF EXISTS set_academy_context(uuid);
DROP FUNCTION IF EXISTS get_current_academy_id();

-- =====================================================
-- STEP 5: Drop old academy_id indexes
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
-- STEP 6: Create new simplified indexes (SIN predicados)
-- =====================================================

DO $$
BEGIN
    -- Players indexes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'players') THEN
        CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
        CREATE INDEX IF NOT EXISTS idx_players_family_id ON players(family_id);
    END IF;
    
    -- Payments indexes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        CREATE INDEX IF NOT EXISTS idx_payments_player_id ON payments(player_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    END IF;
    
    -- Transactions indexes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    END IF;
    
    -- Email queue indexes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_queue') THEN
        CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
    END IF;
    
    -- Pending players indexes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pending_players') THEN
        CREATE INDEX IF NOT EXISTS idx_pending_players_status ON pending_players(status);
    END IF;
    
    -- User role assignments indexes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_role_assignments') THEN
        CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
    END IF;
END $$;

-- =====================================================
-- STEP 7: Create simplified RLS policies
-- =====================================================

-- Players
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'players') THEN
        ALTER TABLE players ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Players: Public read" ON players FOR SELECT USING (true);
        CREATE POLICY "Players: Auth manage" ON players FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Families
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'families') THEN
        ALTER TABLE families ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Families: Auth manage" ON families FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Payments
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Payments: Public read" ON payments FOR SELECT USING (true);
        CREATE POLICY "Payments: Auth manage" ON payments FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Transactions
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Transactions: Auth manage" ON transactions FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Sponsors
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sponsors') THEN
        ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Sponsors: Public read" ON sponsors FOR SELECT USING (true);
        CREATE POLICY "Sponsors: Auth manage" ON sponsors FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Email queue
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_queue') THEN
        ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Email queue: Auth manage" ON email_queue FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Settings
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settings') THEN
        ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Settings: Auth manage" ON settings FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- User role assignments
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_role_assignments') THEN
        ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "User roles: View own" ON user_role_assignments FOR SELECT
          USING (
            auth.uid() = user_id OR
            EXISTS (
              SELECT 1 FROM user_role_assignments ura
              JOIN user_roles ur ON ura.role_id = ur.id
              WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
            )
          );
          
        CREATE POLICY "User roles: Admin manage" ON user_role_assignments FOR ALL
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
-- STEP 8: Cleanup views
-- =====================================================

DROP VIEW IF EXISTS academy_stats CASCADE;
DROP VIEW IF EXISTS academy_financial_summary CASCADE;

-- =====================================================
-- STEP 9: VALIDATION
-- =====================================================

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
    RAISE WARNING 'Academy ID still exists in: %.%', r.table_name, r.column_name;
    found_count := found_count + 1;
  END LOOP;
  
  IF found_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % academy_id columns remain', found_count;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All academy_id columns removed!';
    RAISE NOTICE '✅ Multi-tenant architecture eliminated!';
    RAISE NOTICE '✅ New RLS policies created!';
  END IF;
END $$;

COMMIT;
