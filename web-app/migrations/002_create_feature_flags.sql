-- =====================================================
-- MIGRATION: Create Feature Flags System
-- Version: 2024_12_18_002
-- File: 002_create_feature_flags.sql
-- Description: Creates feature_flags table for per-client feature toggles
-- Idempotent: Yes
-- Reversible: Yes (see rollback section)
-- Dependencies: 2024_12_18_001 (system_versions table)
-- =====================================================

BEGIN;

-- Create feature_flags table for database-based feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,  -- e.g., "enable_late_fees"
  enabled BOOLEAN DEFAULT false NOT NULL,
  description TEXT,
  environment_override JSONB,  -- Per-environment overrides: {"production": true, "staging": false}
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read feature flags
CREATE POLICY "Allow authenticated users to read feature flags"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can modify feature flags (via service_role_key in practice)
-- Regular users cannot modify flags via RLS, but service_role_key bypasses RLS

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trigger_update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- Insert default feature flags (can be enabled/disabled per client)
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('enable_late_fees', false, 'Enable late fee calculation and tracking'),
  ('enable_sponsor_system', true, 'Enable sponsor/donation system'),
  ('enable_tournaments', true, 'Enable tournament registration system')
ON CONFLICT (key) DO NOTHING;

-- Record migration
INSERT INTO system_versions (version, migration_file, description, status)
VALUES (
  '2024_12_18_002',
  '002_create_feature_flags.sql',
  'Creates feature_flags table for per-client feature toggles',
  'applied'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- To rollback this migration, execute:
--
-- BEGIN;
--   DROP TRIGGER IF EXISTS trigger_update_feature_flags_updated_at ON feature_flags;
--   DROP FUNCTION IF EXISTS update_feature_flags_updated_at();
--   DROP POLICY IF EXISTS "Allow authenticated users to read feature flags" ON feature_flags;
--   DROP TABLE IF EXISTS feature_flags;
--   DELETE FROM system_versions WHERE version = '2024_12_18_002';
-- COMMIT;
