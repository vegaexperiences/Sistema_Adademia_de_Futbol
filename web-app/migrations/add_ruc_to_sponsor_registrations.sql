-- Migration: Add RUC field to sponsor_registrations table
-- This allows sponsors to provide their company RUC (tax ID) when registering

-- Add sponsor_ruc column to sponsor_registrations table
ALTER TABLE sponsor_registrations 
ADD COLUMN IF NOT EXISTS sponsor_ruc TEXT;

-- Add comment to document the field
COMMENT ON COLUMN sponsor_registrations.sponsor_ruc IS 'RUC (tax ID) of the company making the sponsorship donation. Optional field.';

