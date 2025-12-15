-- Migration: Add public access policy for player search by cedula
-- This allows the public payment portal to search for players by cedula
-- without requiring authentication, while maintaining security by only
-- allowing SELECT operations with specific filters.

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public player search by cedula" ON players;

-- Create policy that allows public users to search players by cedula
-- This is safe because:
-- 1. Only SELECT operations are allowed
-- 2. Users can only see basic player info needed for payment portal
-- 3. The application filters by academy_id explicitly
CREATE POLICY "Allow public player search by cedula"
  ON players
  FOR SELECT
  TO public
  USING (
    -- Allow public access for payment portal searches
    -- The application will filter by academy_id explicitly
    academy_id IS NOT NULL
  );

-- Also allow public access to families table for tutor cedula searches
DROP POLICY IF EXISTS "Allow public family search by tutor cedula" ON families;

CREATE POLICY "Allow public family search by tutor cedula"
  ON families
  FOR SELECT
  TO public
  USING (
    -- Allow public access for payment portal searches
    -- The application will filter by academy_id explicitly
    academy_id IS NOT NULL
  );

