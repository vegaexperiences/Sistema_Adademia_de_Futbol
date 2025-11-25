-- Add updated_at column to players table if it doesn't exist
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure the trigger exists (it should already exist from create_payments_system.sql)
-- But we'll make sure it's properly set up
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

