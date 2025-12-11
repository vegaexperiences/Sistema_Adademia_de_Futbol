-- ============================================
-- Add All Academy Branding and Logo Columns
-- ============================================
-- This migration adds all branding-related columns to the academies table
-- It consolidates: display_name, logo management, and domain status

-- Add display_name column for custom display name
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS display_name TEXT;

COMMENT ON COLUMN academies.display_name IS 'Custom display name for the academy (different from technical name). Falls back to name if not set.';

-- Add logo size columns
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS logo_small_url TEXT;

ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS logo_medium_url TEXT;

ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS logo_large_url TEXT;

-- Add favicon columns
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS favicon_16_url TEXT;

ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS favicon_32_url TEXT;

-- Add Apple Touch Icon column
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS apple_touch_icon_url TEXT;

-- Add domain status tracking
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

-- Add comments for logo columns
COMMENT ON COLUMN academies.logo_small_url IS 'URL for small logo (32x32px) - used for icons and badges';
COMMENT ON COLUMN academies.logo_medium_url IS 'URL for medium logo (128x128px) - used for cards and headers';
COMMENT ON COLUMN academies.logo_large_url IS 'URL for large logo (512x512px) - used for hero sections and emails';
COMMENT ON COLUMN academies.favicon_16_url IS 'URL for 16x16 favicon';
COMMENT ON COLUMN academies.favicon_32_url IS 'URL for 32x32 favicon';
COMMENT ON COLUMN academies.apple_touch_icon_url IS 'URL for Apple Touch Icon (180x180px) - used for iOS home screen';
COMMENT ON COLUMN academies.domain_status IS 'Status of custom domain configuration: pending (not configured), active (configured and working), inactive (removed or disabled)';
COMMENT ON COLUMN academies.domain_configured_at IS 'Timestamp when the domain was successfully configured and verified';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_academies_domain_status ON academies(domain_status);

-- Note: navigation_labels will be stored in academies.settings.navigation JSONB field
-- Example structure for settings.navigation:
-- {
--   "navigation": {
--     "home": "Inicio",
--     "enrollment": "Matrícula",
--     "tournaments": "Torneos",
--     "access": "Acceso",
--     "dashboard": "Dashboard",
--     "approvals": "Aprobaciones",
--     "players": "Jugadores",
--     "finances": "Finanzas",
--     "tutors": "Tutores",
--     "families": "Familias",
--     "reports": "Reportes",
--     "emails": "Correos",
--     "settings": "Configuración"
--   }
-- }

