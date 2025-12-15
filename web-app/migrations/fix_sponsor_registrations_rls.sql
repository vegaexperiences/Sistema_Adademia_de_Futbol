-- Migration: Fix RLS Policies for sponsor_registrations
-- This allows public users (non-authenticated) to create sponsor registrations
-- while maintaining security for other operations

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsor registrations" ON sponsor_registrations;
DROP POLICY IF EXISTS "Allow public and authenticated users to insert sponsor registrations" ON sponsor_registrations;

-- Create new policy that allows both authenticated and public users to insert
-- This is necessary because sponsor registration is a public process
-- The academy_id is set by the server based on domain/subdomain context
-- Using 'TO public' allows unauthenticated users to insert
CREATE POLICY "Allow public and authenticated users to insert sponsor registrations"
  ON sponsor_registrations
  FOR INSERT
  TO public
  WITH CHECK (
    -- Ensure academy_id is set (required field)
    academy_id IS NOT NULL AND
    -- Ensure sponsor_id is set (required field)
    sponsor_id IS NOT NULL AND
    -- Ensure sponsor_name is set (required field)
    sponsor_name IS NOT NULL AND
    -- Ensure status is valid
    status IN ('pending', 'approved', 'cancelled')
  );

-- Also allow authenticated users (separate policy for clarity)
CREATE POLICY "Allow authenticated users to insert sponsor registrations"
  ON sponsor_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ensure academy_id is set (required field)
    academy_id IS NOT NULL AND
    -- Ensure sponsor_id is set (required field)
    sponsor_id IS NOT NULL AND
    -- Ensure sponsor_name is set (required field)
    sponsor_name IS NOT NULL AND
    -- Ensure status is valid
    status IN ('pending', 'approved', 'cancelled')
  );

-- Keep the SELECT policy for authenticated users only (admin view)
-- Public users don't need to read other people's registrations
DROP POLICY IF EXISTS "Allow authenticated users to read sponsor registrations" ON sponsor_registrations;

CREATE POLICY "Allow authenticated users to read sponsor registrations"
  ON sponsor_registrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep UPDATE policy for authenticated users only
-- Public users shouldn't be able to update registrations after creation

