-- =====================================================
-- MIGRATION: Remove Multi-Tenant Architecture
-- Version: WORKING (sin errores de sintaxis)
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL RLS policies
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Starting migration...';
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 1: Dropping RLS policies...';
    
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
        counter := counter + 1;
    END LOOP;
    RAISE NOTICE '✅ Dropped % policies', counter;
END $$;

-- =====================================================
-- STEP 2: Drop academy_id from ALL tables that have it
-- =====================================================
DO $$
DECLARE
    tbl RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 2: Removing academy_id columns...';
    
    FOR tbl IN
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'academy_id'
    LOOP
        -- Drop foreign key
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
            tbl.table_name, tbl.table_name || '_academy_id_fkey');
        
        -- Drop column
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS academy_id CASCADE', 
            tbl.table_name);
        
        counter := counter + 1;
        RAISE NOTICE '  ✓ Dropped academy_id from: %', tbl.table_name;
    END LOOP;
    RAISE NOTICE '✅ Removed academy_id from % tables', counter;
END $$;

-- =====================================================
-- STEP 3: Drop multi-tenant tables
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 3: Dropping multi-tenant tables...';
    
    DROP TABLE IF EXISTS super_admins CASCADE;
    DROP TABLE IF EXISTS academies CASCADE;
    
    RAISE NOTICE '✅ Dropped multi-tenant tables';
END $$;

-- =====================================================
-- STEP 4: Drop multi-tenant functions
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 4: Dropping multi-tenant functions...';
    
    DROP FUNCTION IF EXISTS set_academy_context(uuid);
    DROP FUNCTION IF EXISTS get_current_academy_id();
    
    RAISE NOTICE '✅ Dropped multi-tenant functions';
END $$;

-- =====================================================
-- STEP 5: Drop old indexes
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 5: Dropping old indexes...';
    
    DROP INDEX IF EXISTS idx_players_academy_id;
    DROP INDEX IF EXISTS idx_families_academy_id;
    DROP INDEX IF EXISTS idx_payments_academy_id;
    DROP INDEX IF EXISTS idx_transactions_academy_id;
    DROP INDEX IF EXISTS idx_sponsors_academy_id;
    DROP INDEX IF EXISTS idx_email_queue_academy_id;
    DROP INDEX IF EXISTS idx_pending_players_academy_id;
    DROP INDEX IF EXISTS idx_user_role_assignments_academy_id;
    
    RAISE NOTICE '✅ Dropped academy indexes';
END $$;

-- =====================================================
-- STEP 6: Create BASIC RLS policies for main tables
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 6: Creating simplified RLS policies...';
    
    -- Players
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'players') THEN
        ALTER TABLE players ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "players_public_read" ON players FOR SELECT USING (true);
        CREATE POLICY "players_auth_all" ON players FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE '  ✓ Created RLS for players';
    END IF;
    
    -- Families
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'families') THEN
        ALTER TABLE families ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "families_auth_all" ON families FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE '  ✓ Created RLS for families';
    END IF;
    
    -- Payments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "payments_public_read" ON payments FOR SELECT USING (true);
        CREATE POLICY "payments_auth_all" ON payments FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE '  ✓ Created RLS for payments';
    END IF;
    
    RAISE NOTICE '✅ Created RLS for main tables';
END $$;

-- =====================================================
-- STEP 7: Create RLS for other tables
-- =====================================================
DO $$
DECLARE
    tbl_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 7: Creating RLS for other tables...';
    
    FOR tbl_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('transactions', 'sponsors', 'email_queue', 'settings', 
                          'staff', 'tournaments', 'pending_players', 'user_role_assignments')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.role() = %L) WITH CHECK (auth.role() = %L)',
            tbl_name || '_auth_all', tbl_name, 'authenticated', 'authenticated');
        RAISE NOTICE '  ✓ Created RLS for %', tbl_name;
    END LOOP;
    
    RAISE NOTICE '✅ Created RLS for remaining tables';
END $$;

-- =====================================================
-- STEP 8: Cleanup views
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 8: Cleaning up views...';
    
    DROP VIEW IF EXISTS academy_stats CASCADE;
    DROP VIEW IF EXISTS academy_financial_summary CASCADE;
    
    RAISE NOTICE '✅ Dropped old views';
END $$;

-- =====================================================
-- STEP 9: FINAL VALIDATION
-- =====================================================
DO $$
DECLARE
  r RECORD;
  found_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VALIDATING MIGRATION...';
  RAISE NOTICE '';
  
  FOR r IN 
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND column_name = 'academy_id'
  LOOP
    RAISE WARNING '❌ Academy ID still in: %.%', r.table_name, r.column_name;
    found_count := found_count + 1;
  END LOOP;
  
  IF found_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % academy_id columns remain', found_count;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All academy_id columns removed!';
    RAISE NOTICE '✅ Multi-tenant architecture eliminated!';
    RAISE NOTICE '✅ Simplified RLS policies created!';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  END IF;
END $$;
