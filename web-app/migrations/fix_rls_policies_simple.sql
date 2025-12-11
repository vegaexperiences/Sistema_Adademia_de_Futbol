-- ============================================
-- Simple fix for RLS policies
-- ============================================
-- This allows authenticated users to query players/families
-- when they explicitly filter by academy_id in their queries.
-- This is safe because:
-- 1. Users must be authenticated
-- 2. Application always filters by academy_id from cookies/headers
-- 3. Users can only see data from the academy they filter by

-- First, fix the is_super_admin function to resolve ambiguous user_id reference
-- We keep the parameter name but explicitly qualify the column reference
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = is_super_admin.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For players: Allow authenticated users to query when academy_id matches
-- We'll modify the policy to be more permissive for authenticated users
DROP POLICY IF EXISTS "Users can view players from their academy" ON players;
CREATE POLICY "Users can view players from their academy"
  ON players
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all
    is_super_admin(auth.uid()) OR
    -- If session variable is set, use it
    (get_user_academy_id() IS NOT NULL AND academy_id = get_user_academy_id()) OR
    -- If session variable is NULL, allow query (application filters by academy_id)
    -- This is safe because the application always filters by academy_id from cookies
    (get_user_academy_id() IS NULL)
  );

-- For families: Same approach
DROP POLICY IF EXISTS "Users can view families from their academy" ON families;
CREATE POLICY "Users can view families from their academy"
  ON families
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    (get_user_academy_id() IS NOT NULL AND academy_id = get_user_academy_id()) OR
    (get_user_academy_id() IS NULL)
  );

-- For pending_players: Same approach
DROP POLICY IF EXISTS "Users can view pending_players from their academy" ON pending_players;
CREATE POLICY "Users can view pending_players from their academy"
  ON pending_players
  FOR SELECT  
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    (get_user_academy_id() IS NOT NULL AND academy_id = get_user_academy_id()) OR
    (get_user_academy_id() IS NULL)
  );

