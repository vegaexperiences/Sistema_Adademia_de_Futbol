-- Add Tutor columns to players table for single-player enrollments
-- Using IF NOT EXISTS to avoid errors if columns were already added
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutor_name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutor_cedula text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutor_email text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutor_phone text;

-- Make family_id nullable (it already is, but just to be sure of intent)
ALTER TABLE players ALTER COLUMN family_id DROP NOT NULL;
