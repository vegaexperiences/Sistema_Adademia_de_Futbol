-- Migration: Add Sponsor Player Assignments
-- This allows assigning players to sponsors to track which players each sponsor is supporting

-- 1. Create sponsor_player_assignments table
CREATE TABLE IF NOT EXISTS sponsor_player_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_registration_id UUID REFERENCES sponsor_registrations(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure a player can only be assigned once to the same sponsor
  UNIQUE(sponsor_registration_id, player_id)
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sponsor_player_assignments_sponsor_registration_id ON sponsor_player_assignments(sponsor_registration_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_player_assignments_player_id ON sponsor_player_assignments(player_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_player_assignments_academy_id ON sponsor_player_assignments(academy_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_player_assignments_assigned_by ON sponsor_player_assignments(assigned_by);

-- 3. Enable RLS
ALTER TABLE sponsor_player_assignments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Allow authenticated users to read sponsor player assignments"
  ON sponsor_player_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert sponsor player assignments"
  ON sponsor_player_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sponsor player assignments"
  ON sponsor_player_assignments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete sponsor player assignments"
  ON sponsor_player_assignments
  FOR DELETE
  TO authenticated
  USING (true);

-- 5. Create trigger for updated_at
-- Use a generic updated_at function or create one if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sponsor_player_assignments_updated_at ON sponsor_player_assignments;
CREATE TRIGGER update_sponsor_player_assignments_updated_at
  BEFORE UPDATE ON sponsor_player_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

