-- ============================================
-- Fix Super Admins RLS Policy (Circular Dependency)
-- ============================================
-- The original policy had a circular dependency: to read super_admins,
-- you need to be a super admin, but to check if you're a super admin,
-- you need to read super_admins. This fixes that.

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Allow super admins to read super_admins" ON super_admins;
DROP POLICY IF EXISTS "Allow super admins to manage super_admins" ON super_admins;

-- Allow authenticated users to read super_admins (needed to check if user is super admin)
-- This is safe because we only expose email and name, not sensitive data
CREATE POLICY "Allow authenticated users to read super_admins"
  ON super_admins
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can insert/update/delete super_admins
-- We use a function with SECURITY DEFINER to bypass RLS for the check
CREATE OR REPLACE FUNCTION is_user_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Allow super admins to manage super_admins"
  ON super_admins
  FOR ALL
  TO authenticated
  USING (
    is_user_super_admin(auth.uid())
  )
  WITH CHECK (
    is_user_super_admin(auth.uid())
  );

