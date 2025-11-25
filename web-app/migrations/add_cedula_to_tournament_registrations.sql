-- Add coach_cedula field to tournament_registrations table
ALTER TABLE tournament_registrations
ADD COLUMN IF NOT EXISTS coach_cedula TEXT;

