-- ============================================
-- Add Branding Customization to Academies Table
-- ============================================
-- This migration adds display_name column and documents navigation_labels structure

-- Add display_name column for custom display name
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add comment
COMMENT ON COLUMN academies.display_name IS 'Custom display name for the academy (different from technical name). Falls back to name if not set.';

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

