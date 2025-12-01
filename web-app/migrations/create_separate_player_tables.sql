-- Create separate tables for pending, approved, and rejected players
-- This migration creates pending_players and rejected_players tables
-- The players table will only contain approved players (Active/Scholarship)

-- 1. Create pending_players table (same structure as players but without status field)
CREATE TABLE IF NOT EXISTS pending_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  cedula TEXT,
  category TEXT,
  discount_percent FLOAT DEFAULT 0,
  monthly_fee_override FLOAT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Tutor fields for single-player enrollments
  tutor_name TEXT,
  tutor_cedula TEXT,
  tutor_email TEXT,
  tutor_phone TEXT,
  custom_monthly_fee DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'current' CHECK (payment_status IN ('current', 'overdue', 'pending')),
  last_payment_date DATE,
  cedula_front_url TEXT,
  cedula_back_url TEXT,
  monthly_statement_sent_at TIMESTAMPTZ
);

-- 2. Create rejected_players table (same structure as players but without status field)
CREATE TABLE IF NOT EXISTS rejected_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  cedula TEXT,
  category TEXT,
  discount_percent FLOAT DEFAULT 0,
  monthly_fee_override FLOAT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Tutor fields for single-player enrollments
  tutor_name TEXT,
  tutor_cedula TEXT,
  tutor_email TEXT,
  tutor_phone TEXT,
  custom_monthly_fee DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'current' CHECK (payment_status IN ('current', 'overdue', 'pending')),
  last_payment_date DATE,
  cedula_front_url TEXT,
  cedula_back_url TEXT,
  monthly_statement_sent_at TIMESTAMPTZ,
  -- Rejection metadata
  rejected_at TIMESTAMPTZ DEFAULT NOW(),
  rejection_reason TEXT
);

-- 3. Remove status field from players table (it will only contain Active/Scholarship players)
-- Note: We'll keep the status field for now during migration, but it should only contain 'Active' or 'Scholarship'
-- After migration is complete, we can optionally remove it

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_players_family ON pending_players(family_id);
CREATE INDEX IF NOT EXISTS idx_pending_players_created_at ON pending_players(created_at);
CREATE INDEX IF NOT EXISTS idx_rejected_players_family ON rejected_players(family_id);
CREATE INDEX IF NOT EXISTS idx_rejected_players_created_at ON rejected_players(created_at);
CREATE INDEX IF NOT EXISTS idx_rejected_players_rejected_at ON rejected_players(rejected_at);

-- 5. Enable RLS (Row Level Security) for the new tables
ALTER TABLE pending_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejected_players ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for pending_players
CREATE POLICY "Allow authenticated users to read pending_players"
  ON pending_players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert pending_players"
  ON pending_players
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pending_players"
  ON pending_players
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete pending_players"
  ON pending_players
  FOR DELETE
  TO authenticated
  USING (true);

-- 7. Create RLS policies for rejected_players
CREATE POLICY "Allow authenticated users to read rejected_players"
  ON rejected_players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert rejected_players"
  ON rejected_players
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update rejected_players"
  ON rejected_players
  FOR UPDATE
  TO authenticated
  USING (true);

-- 8. Create trigger to update updated_at for pending_players
DROP TRIGGER IF EXISTS update_pending_players_updated_at ON pending_players;
CREATE TRIGGER update_pending_players_updated_at
  BEFORE UPDATE ON pending_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Create trigger to update updated_at for rejected_players
DROP TRIGGER IF EXISTS update_rejected_players_updated_at ON rejected_players;
CREATE TRIGGER update_rejected_players_updated_at
  BEFORE UPDATE ON rejected_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Update payments table to allow references to any player table
-- Note: We'll need to handle this carefully since payments.player_id currently references players(id)
-- For now, we'll keep the foreign key constraint on players, but we may need to create a view or
-- use a different approach if payments need to reference pending_players or rejected_players
-- This will be handled in the migration script

