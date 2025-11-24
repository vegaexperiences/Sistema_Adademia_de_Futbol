-- Add document columns to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS cedula_front_url text,
ADD COLUMN IF NOT EXISTS cedula_back_url text;

-- Add document column to families table (for tutor)
ALTER TABLE families
ADD COLUMN IF NOT EXISTS tutor_cedula_url text;
