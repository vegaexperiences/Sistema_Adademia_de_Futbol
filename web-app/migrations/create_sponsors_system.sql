-- Migration: Create Sponsors System
-- This adds comprehensive sponsor/patron management capabilities

-- 1. Create sponsors table (sponsorship levels)
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  benefits JSONB DEFAULT '[]'::jsonb, -- Array of benefit strings
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sponsor_registrations table
CREATE TABLE IF NOT EXISTS sponsor_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE NOT NULL,
  sponsor_name TEXT NOT NULL,
  sponsor_email TEXT,
  sponsor_phone TEXT,
  sponsor_cedula TEXT,
  sponsor_company TEXT, -- Optional company name
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
  notes TEXT,
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update payments table to support sponsors
-- Add sponsor_id column if it doesn't exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL;

-- Update CHECK constraint for type to include 'sponsor'
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
  
  -- Add new constraint that includes 'sponsor'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'type'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_type_check 
      CHECK (type IN ('enrollment', 'monthly', 'custom', 'charge', 'Matrícula', 'sponsor'));
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
      CHECK (payment_type IN ('enrollment', 'monthly', 'custom', 'charge', 'sponsor'));
  END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sponsors_academy_id ON sponsors(academy_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_is_active ON sponsors(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsors_display_order ON sponsors(display_order);
CREATE INDEX IF NOT EXISTS idx_sponsor_registrations_sponsor_id ON sponsor_registrations(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_registrations_payment_id ON sponsor_registrations(payment_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_registrations_academy_id ON sponsor_registrations(academy_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_registrations_status ON sponsor_registrations(status);
CREATE INDEX IF NOT EXISTS idx_payments_sponsor_id ON payments(sponsor_id);

-- 5. Enable RLS on new tables
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_registrations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for sponsors (public read, authenticated write)
CREATE POLICY "Allow public read sponsors"
  ON sponsors
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Allow authenticated users to manage sponsors"
  ON sponsors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. RLS Policies for sponsor_registrations
CREATE POLICY "Allow authenticated users to read sponsor registrations"
  ON sponsor_registrations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert sponsor registrations"
  ON sponsor_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sponsor registrations"
  ON sponsor_registrations
  FOR UPDATE
  TO authenticated
  USING (true);

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_sponsors_updated_at ON sponsors;
CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsors_updated_at();

DROP TRIGGER IF EXISTS update_sponsor_registrations_updated_at ON sponsor_registrations;
CREATE TRIGGER update_sponsor_registrations_updated_at
  BEFORE UPDATE ON sponsor_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsors_updated_at();

