-- ============================================
-- Fix is_super_admin function to resolve ambiguous user_id reference
-- ============================================
-- The function parameter name conflicts with the column name,
-- causing PostgreSQL to be unable to determine which one to use.
-- We need to drop it first because we're changing the parameter name.

DROP FUNCTION IF EXISTS is_super_admin(UUID);
CREATE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

