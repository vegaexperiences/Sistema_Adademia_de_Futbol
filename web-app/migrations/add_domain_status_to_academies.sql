-- ============================================
-- Add Domain Status Tracking to Academies
-- ============================================
-- This migration adds domain status tracking to help manage custom domain configuration

-- Add domain_status column
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS domain_status TEXT DEFAULT 'pending' 
CHECK (domain_status IN ('pending', 'active', 'inactive'));

-- Add domain_configured_at timestamp
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS domain_configured_at TIMESTAMPTZ;

-- Set default status for existing academies
-- If domain exists and is not null, assume it's active
-- Otherwise, set to pending
UPDATE academies 
SET domain_status = CASE 
  WHEN domain IS NOT NULL AND domain != '' THEN 'active'
  ELSE 'pending'
END
WHERE domain_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_academies_domain_status ON academies(domain_status);

-- Add comment
COMMENT ON COLUMN academies.domain_status IS 'Status of custom domain configuration: pending (not configured), active (configured and working), inactive (removed or disabled)';
COMMENT ON COLUMN academies.domain_configured_at IS 'Timestamp when the domain was successfully configured and verified';

