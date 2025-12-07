-- Add settings for season start and end dates
-- These dates control when monthly fees can be generated
-- Empty string ('') values mean no restriction (current behavior)

-- Insert season_start_date setting (date when season starts - no monthly fees before this date)
INSERT INTO settings (key, value, description)
VALUES ('season_start_date', '', 'Fecha de inicio de temporada (YYYY-MM-DD). No se generarán mensualidades antes de esta fecha. Vacío = sin restricción')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Insert season_end_date setting (date when season ends - no monthly fees after this date)
INSERT INTO settings (key, value, description)
VALUES ('season_end_date', '', 'Fecha de fin de temporada (YYYY-MM-DD). No se generarán mensualidades después de esta fecha. Vacío = sin restricción')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Verify the settings were created
SELECT key, value, description FROM settings WHERE key IN ('season_start_date', 'season_end_date');

