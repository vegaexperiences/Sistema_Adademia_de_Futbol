-- ============================================
-- Migrate existing data to Suarez Academy
-- ============================================
-- This migration creates the default "Suarez Academy" and assigns all existing data to it

-- 1. Create default Suarez Academy
INSERT INTO academies (id, name, slug, domain, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID, -- Fixed UUID for default academy
  'Suarez Academy',
  'suarez',
  NULL, -- Will be set later if needed
  '{"isDefault": true}'::JSONB
)
ON CONFLICT (slug) DO NOTHING;

-- Get the academy ID (use fixed UUID or get from insert)
DO $$
DECLARE
  suarez_academy_id UUID;
BEGIN
  -- Get or create Suarez Academy
  SELECT id INTO suarez_academy_id
  FROM academies
  WHERE slug = 'suarez'
  LIMIT 1;

  IF suarez_academy_id IS NULL THEN
    INSERT INTO academies (id, name, slug, domain, settings)
    VALUES (
      '00000000-0000-0000-0000-000000000001'::UUID,
      'Suarez Academy',
      'suarez',
      NULL,
      '{"isDefault": true}'::JSONB
    )
    RETURNING id INTO suarez_academy_id;
  END IF;

  -- 2. Update all families to belong to Suarez Academy
  UPDATE families
  SET academy_id = suarez_academy_id
  WHERE academy_id IS NULL;

  -- 3. Update all players to belong to Suarez Academy
  UPDATE players
  SET academy_id = suarez_academy_id
  WHERE academy_id IS NULL;

  -- 4. Update all pending_players to belong to Suarez Academy
  UPDATE pending_players
  SET academy_id = suarez_academy_id
  WHERE academy_id IS NULL;

  -- 5. Update rejected_players if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rejected_players') THEN
    EXECUTE format('UPDATE rejected_players SET academy_id = %L WHERE academy_id IS NULL', suarez_academy_id);
  END IF;

  -- 6. Update all payments to belong to Suarez Academy
  UPDATE payments
  SET academy_id = suarez_academy_id
  WHERE academy_id IS NULL;

  -- 7. Update all expenses to belong to Suarez Academy
  UPDATE expenses
  SET academy_id = suarez_academy_id
  WHERE academy_id IS NULL;

  -- 8. Update settings if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    EXECUTE format('UPDATE settings SET academy_id = %L WHERE academy_id IS NULL', suarez_academy_id);
  END IF;

  -- 9. Update yappy_orders if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yappy_orders') THEN
    EXECUTE format('UPDATE yappy_orders SET academy_id = %L WHERE academy_id IS NULL', suarez_academy_id);
  END IF;

  -- 10. Update paguelofacil_orders if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paguelofacil_orders') THEN
    EXECUTE format('UPDATE paguelofacil_orders SET academy_id = %L WHERE academy_id IS NULL', suarez_academy_id);
  END IF;

  RAISE NOTICE 'Migration completed. All existing data assigned to Suarez Academy (ID: %)', suarez_academy_id;
END $$;

-- 11. Make academy_id NOT NULL after migration (optional, can be done later)
-- Uncomment these when ready to enforce NOT NULL constraint:
-- ALTER TABLE families ALTER COLUMN academy_id SET NOT NULL;
-- ALTER TABLE players ALTER COLUMN academy_id SET NOT NULL;
-- ALTER TABLE pending_players ALTER COLUMN academy_id SET NOT NULL;
-- ALTER TABLE payments ALTER COLUMN academy_id SET NOT NULL;
-- ALTER TABLE expenses ALTER COLUMN academy_id SET NOT NULL;

