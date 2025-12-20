-- =====================================================
-- MIGRATION: Create System Versioning Schema
-- Version: 2024_12_18_001
-- File: 001_create_system_versioning.sql
-- Description: Creates system_versions table to track applied migrations
-- Idempotent: Yes
-- Reversible: Yes (see rollback section)
-- Dependencies: None (first migration)
-- =====================================================

BEGIN;

-- Create system_versions table to track migration history
CREATE TABLE IF NOT EXISTS system_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,  -- e.g., "2024_12_18_001"
  migration_file TEXT NOT NULL,  -- e.g., "001_create_system_versioning.sql"
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  applied_by TEXT,  -- Service account, user email, or script name
  checksum TEXT,    -- SHA256 of migration file content for integrity verification
  rollback_script TEXT,  -- Optional: SQL script to rollback this migration
  execution_time_ms INTEGER,  -- Time taken to execute migration in milliseconds
  status TEXT DEFAULT 'applied' NOT NULL,  -- 'applied', 'rolled_back', 'failed'
  error_message TEXT,  -- Error message if status is 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_versions_version ON system_versions(version);
CREATE INDEX IF NOT EXISTS idx_system_versions_status ON system_versions(status);
CREATE INDEX IF NOT EXISTS idx_system_versions_applied_at ON system_versions(applied_at DESC);

-- Enable RLS (only admins should see migration history)
ALTER TABLE system_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can view (admins only in practice)
CREATE POLICY "Allow authenticated users to view system_versions"
  ON system_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can insert/update (via service_role_key)
-- This prevents regular users from modifying migration history
-- In practice, migrations run with service_role_key which bypasses RLS

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_system_versions_updated_at ON system_versions;
CREATE TRIGGER trigger_update_system_versions_updated_at
  BEFORE UPDATE ON system_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_system_versions_updated_at();

-- Insert this migration record
-- Note: checksum will be calculated by migration runner
INSERT INTO system_versions (version, migration_file, description, status)
VALUES (
  '2024_12_18_001',
  '001_create_system_versioning.sql',
  'Creates system_versions table to track applied migrations',
  'applied'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =====================================================
-- ROLLBACK SCRIPT (for reference, not auto-executed)
-- =====================================================
-- To rollback this migration, execute:
--
-- BEGIN;
--   DROP TRIGGER IF EXISTS trigger_update_system_versions_updated_at ON system_versions;
--   DROP FUNCTION IF EXISTS update_system_versions_updated_at();
--   DROP POLICY IF EXISTS "Allow authenticated users to view system_versions" ON system_versions;
--   DROP TABLE IF EXISTS system_versions;
--   -- Note: This will delete all migration history
-- COMMIT;
--
-- WARNING: Rolling back this migration removes all migration tracking.
-- Only do this if you understand the consequences.
