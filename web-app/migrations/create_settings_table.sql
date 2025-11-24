-- Create settings table for configurable values
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing settings
INSERT INTO public.settings (key, value, description) VALUES
  ('price_enrollment', '80', 'Precio de matrícula'),
  ('price_monthly', '130', 'Precio de mensualidad regular'),
  ('price_monthly_family', '110.50', 'Precio de mensualidad familiar (después del segundo jugador)')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to read settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update settings"
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING (true);
