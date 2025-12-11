-- Enable PagueloFacil by default in payment methods configuration
-- This migration ensures PagueloFacil is enabled for all existing installations

-- Update existing payment_methods setting to include paguelofacil if it doesn't exist
UPDATE settings
SET value = jsonb_set(
  COALESCE(value::jsonb, '{}'::jsonb),
  '{paguelofacil}',
  'true'::jsonb,
  true
)
WHERE key = 'payment_methods'
  AND (
    value::jsonb->>'paguelofacil' IS NULL 
    OR (value::jsonb->>'paguelofacil')::boolean = false
  );

-- If no payment_methods setting exists, create it with all methods enabled
INSERT INTO settings (key, value, description)
SELECT 
  'payment_methods',
  '{"yappy": true, "transfer": true, "proof": false, "paguelofacil": true}'::jsonb,
  'Configuración de métodos de pago activos'
WHERE NOT EXISTS (
  SELECT 1 FROM settings WHERE key = 'payment_methods'
);

