-- ============================================
-- Add academy_id to all existing tables
-- ============================================
-- This migration adds academy_id column to all tables that need multi-tenant isolation

-- 1. Add academy_id to families
ALTER TABLE families
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;

-- 2. Add academy_id to players
ALTER TABLE players
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;

-- 3. Add academy_id to pending_players
ALTER TABLE pending_players
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;

-- 4. Add academy_id to rejected_players (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rejected_players') THEN
    ALTER TABLE rejected_players
    ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Add academy_id to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;

-- 6. Add academy_id to expenses
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;

-- 7. Add academy_id to settings (system_config)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8. Add academy_id to yappy_orders (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yappy_orders') THEN
    ALTER TABLE yappy_orders
    ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 9. Add academy_id to paguelofacil_orders (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paguelofacil_orders') THEN
    ALTER TABLE paguelofacil_orders
    ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_families_academy_id ON families(academy_id);
CREATE INDEX IF NOT EXISTS idx_players_academy_id ON players(academy_id);
CREATE INDEX IF NOT EXISTS idx_pending_players_academy_id ON pending_players(academy_id);
CREATE INDEX IF NOT EXISTS idx_payments_academy_id ON payments(academy_id);
CREATE INDEX IF NOT EXISTS idx_expenses_academy_id ON expenses(academy_id);

-- Create indexes for rejected_players if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rejected_players') THEN
    CREATE INDEX IF NOT EXISTS idx_rejected_players_academy_id ON rejected_players(academy_id);
  END IF;
END $$;

-- Create indexes for settings if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    CREATE INDEX IF NOT EXISTS idx_settings_academy_id ON settings(academy_id);
  END IF;
END $$;

-- Create indexes for yappy_orders if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yappy_orders') THEN
    CREATE INDEX IF NOT EXISTS idx_yappy_orders_academy_id ON yappy_orders(academy_id);
  END IF;
END $$;

-- Create indexes for paguelofacil_orders if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paguelofacil_orders') THEN
    CREATE INDEX IF NOT EXISTS idx_paguelofacil_orders_academy_id ON paguelofacil_orders(academy_id);
  END IF;
END $$;

