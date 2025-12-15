-- Migration: Seed Initial Sponsor Levels
-- This inserts the 3 initial sponsor levels (Gold, Plata, Bronce) for Suarez Academy

-- Get the academy_id (assuming Suarez Academy exists)
DO $$
DECLARE
  academy_uuid UUID;
BEGIN
  -- Get Suarez Academy by slug (same pattern as other migrations)
  SELECT id INTO academy_uuid
  FROM academies
  WHERE slug = 'suarez'
  LIMIT 1;

  -- If Suarez Academy doesn't exist, try to get the first academy
  IF academy_uuid IS NULL THEN
    SELECT id INTO academy_uuid
    FROM academies
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- If no academy exists, exit with warning
  IF academy_uuid IS NULL THEN
    RAISE EXCEPTION 'No academy found. Please create an academy first.';
  END IF;

  -- Insert PADRINO GOLD (only if it doesn't exist for this academy)
  INSERT INTO sponsors (
    name,
    description,
    amount,
    benefits,
    is_active,
    display_order,
    academy_id,
    created_at,
    updated_at
  )
  SELECT
    'PADRINO GOLD',
    'Con una aportación anual de $1,500, puedes apadrinar a un niño futbolista y ayudarle a cubrir uniformes, transporte a torneos e inscripción a competencias. Tu apoyo va más allá del fútbol: estás invirtiendo en su futuro, su autoestima y sus sueños. Beneficios adicionales: Visualización en redes o pantalla gigante en COS, menciones en resultados o post de actividades (si lo desea).',
    1500.00,
    '["Uniformes", "Transporte a torneos", "Inscripción a competencias", "Visualización en redes o pantalla gigante en COS (opcional)", "Menciones en resultados o post de actividades (opcional)"]'::jsonb,
    true,
    1,
    academy_uuid,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM sponsors 
    WHERE name = 'PADRINO GOLD' AND academy_id = academy_uuid
  );

  -- Insert PADRINO PLATA (only if it doesn't exist for this academy)
  INSERT INTO sponsors (
    name,
    description,
    amount,
    benefits,
    is_active,
    display_order,
    academy_id,
    created_at,
    updated_at
  )
  SELECT
    'PADRINO PLATA',
    'Con una aportación anual de $1,000, puedes apadrinar a un niño futbolista y ayudarle a cubrir uniformes e inscripción a competencias. Tu apoyo va más allá del fútbol: estás invirtiendo en su futuro, su autoestima y sus sueños.',
    1000.00,
    '["Uniformes", "Inscripción a competencias"]'::jsonb,
    true,
    2,
    academy_uuid,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM sponsors 
    WHERE name = 'PADRINO PLATA' AND academy_id = academy_uuid
  );

  -- Insert PADRINO BRONCE (only if it doesn't exist for this academy)
  INSERT INTO sponsors (
    name,
    description,
    amount,
    benefits,
    is_active,
    display_order,
    academy_id,
    created_at,
    updated_at
  )
  SELECT
    'PADRINO BRONCE',
    'Con una aportación anual de $500, puedes apadrinar a un niño futbolista y ayudarle a cubrir uniformes y transporte a torneos. Tu apoyo va más allá del fútbol: estás invirtiendo en su futuro, su autoestima y sus sueños.',
    500.00,
    '["Uniformes", "Transporte a torneos"]'::jsonb,
    true,
    3,
    academy_uuid,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM sponsors 
    WHERE name = 'PADRINO BRONCE' AND academy_id = academy_uuid
  );

  RAISE NOTICE 'Sponsor levels seeded successfully for academy: %', academy_uuid;
END $$;

