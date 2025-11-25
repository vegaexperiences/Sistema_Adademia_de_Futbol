-- Add secondary_email column to families table
ALTER TABLE families
ADD COLUMN IF NOT EXISTS secondary_email text;

