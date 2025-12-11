-- ============================================
-- Row-Level Security (RLS) Policies for Multi-Tenant
-- ============================================
-- These policies ensure data isolation between academies
-- Users can only see/modify data from their academy
-- Super admins can see/modify data from all academies

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's academy_id from request context
-- This will be set by the application based on domain/subdomain
-- For now, we'll use a session variable that the app sets
CREATE OR REPLACE FUNCTION get_user_academy_id()
RETURNS UUID AS $$
BEGIN
  -- Try to get from session variable (set by application)
  -- If not set, return NULL (will be filtered by policies)
  RETURN current_setting('app.academy_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies for families
-- ============================================
DROP POLICY IF EXISTS "Users can view families from their academy" ON families;
CREATE POLICY "Users can view families from their academy"
  ON families
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all
    is_super_admin(auth.uid()) OR
    -- Regular users can see their academy's families
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can insert families in their academy" ON families;
CREATE POLICY "Users can insert families in their academy"
  ON families
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can update families in their academy" ON families;
CREATE POLICY "Users can update families in their academy"
  ON families
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can delete families in their academy" ON families;
CREATE POLICY "Users can delete families in their academy"
  ON families
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

-- ============================================
-- RLS Policies for players
-- ============================================
DROP POLICY IF EXISTS "Users can view players from their academy" ON players;
CREATE POLICY "Users can view players from their academy"
  ON players
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can insert players in their academy" ON players;
CREATE POLICY "Users can insert players in their academy"
  ON players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can update players in their academy" ON players;
CREATE POLICY "Users can update players in their academy"
  ON players
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can delete players in their academy" ON players;
CREATE POLICY "Users can delete players in their academy"
  ON players
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

-- ============================================
-- RLS Policies for pending_players
-- ============================================
DROP POLICY IF EXISTS "Users can view pending_players from their academy" ON pending_players;
CREATE POLICY "Users can view pending_players from their academy"
  ON pending_players
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can insert pending_players in their academy" ON pending_players;
CREATE POLICY "Users can insert pending_players in their academy"
  ON pending_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can update pending_players in their academy" ON pending_players;
CREATE POLICY "Users can update pending_players in their academy"
  ON pending_players
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can delete pending_players in their academy" ON pending_players;
CREATE POLICY "Users can delete pending_players in their academy"
  ON pending_players
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

-- ============================================
-- RLS Policies for payments
-- ============================================
DROP POLICY IF EXISTS "Users can view payments from their academy" ON payments;
CREATE POLICY "Users can view payments from their academy"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can insert payments in their academy" ON payments;
CREATE POLICY "Users can insert payments in their academy"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can update payments in their academy" ON payments;
CREATE POLICY "Users can update payments in their academy"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can delete payments in their academy" ON payments;
CREATE POLICY "Users can delete payments in their academy"
  ON payments
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

-- ============================================
-- RLS Policies for expenses
-- ============================================
DROP POLICY IF EXISTS "Users can view expenses from their academy" ON expenses;
CREATE POLICY "Users can view expenses from their academy"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can insert expenses in their academy" ON expenses;
CREATE POLICY "Users can insert expenses in their academy"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can update expenses in their academy" ON expenses;
CREATE POLICY "Users can update expenses in their academy"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

DROP POLICY IF EXISTS "Users can delete expenses in their academy" ON expenses;
CREATE POLICY "Users can delete expenses in their academy"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    academy_id = get_user_academy_id()
  );

-- ============================================
-- RLS Policies for settings (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Users can view settings from their academy" ON settings;
    DROP POLICY IF EXISTS "Users can insert settings in their academy" ON settings;
    DROP POLICY IF EXISTS "Users can update settings in their academy" ON settings;
    DROP POLICY IF EXISTS "Users can delete settings in their academy" ON settings;
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view settings from their academy"
      ON settings
      FOR SELECT
      TO authenticated
      USING (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
    
    EXECUTE 'CREATE POLICY "Users can insert settings in their academy"
      ON settings
      FOR INSERT
      TO authenticated
      WITH CHECK (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
    
    EXECUTE 'CREATE POLICY "Users can update settings in their academy"
      ON settings
      FOR UPDATE
      TO authenticated
      USING (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
    
    EXECUTE 'CREATE POLICY "Users can delete settings in their academy"
      ON settings
      FOR DELETE
      TO authenticated
      USING (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
  END IF;
END $$;

-- ============================================
-- RLS Policies for yappy_orders (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yappy_orders') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view yappy_orders from their academy" ON yappy_orders';
    EXECUTE 'CREATE POLICY "Users can view yappy_orders from their academy"
      ON yappy_orders
      FOR SELECT
      TO authenticated
      USING (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert yappy_orders in their academy" ON yappy_orders';
    EXECUTE 'CREATE POLICY "Users can insert yappy_orders in their academy"
      ON yappy_orders
      FOR INSERT
      TO authenticated
      WITH CHECK (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
  END IF;
END $$;

-- ============================================
-- RLS Policies for paguelofacil_orders (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paguelofacil_orders') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view paguelofacil_orders from their academy" ON paguelofacil_orders';
    EXECUTE 'CREATE POLICY "Users can view paguelofacil_orders from their academy"
      ON paguelofacil_orders
      FOR SELECT
      TO authenticated
      USING (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert paguelofacil_orders in their academy" ON paguelofacil_orders';
    EXECUTE 'CREATE POLICY "Users can insert paguelofacil_orders in their academy"
      ON paguelofacil_orders
      FOR INSERT
      TO authenticated
      WITH CHECK (
        is_super_admin(auth.uid()) OR
        academy_id = get_user_academy_id()
      )';
  END IF;
END $$;

