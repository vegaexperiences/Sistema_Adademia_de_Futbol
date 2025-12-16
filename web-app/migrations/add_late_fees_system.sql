-- ============================================
-- Add Late Fees System
-- ============================================
-- This migration creates the late_fees table and adds settings
-- for configuring late fees (recargos) for overdue payments

-- Step 1: Create late_fees table
CREATE TABLE IF NOT EXISTS late_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  month_year VARCHAR(7), -- formato YYYY-MM
  original_amount DECIMAL(10,2) NOT NULL,
  late_fee_amount DECIMAL(10,2) NOT NULL,
  late_fee_type VARCHAR(20) NOT NULL CHECK (late_fee_type IN ('percentage', 'fixed')),
  late_fee_rate DECIMAL(10,2) NOT NULL, -- porcentaje o monto usado
  days_overdue INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_late_fees_player_id ON late_fees(player_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_payment_id ON late_fees(payment_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_month_year ON late_fees(month_year);
CREATE INDEX IF NOT EXISTS idx_late_fees_academy_id ON late_fees(academy_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_applied_at ON late_fees(applied_at);

-- Step 3: Enable RLS on late_fees
ALTER TABLE late_fees ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for late_fees
CREATE POLICY "Allow authenticated users to read late_fees"
  ON late_fees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert late_fees"
  ON late_fees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update late_fees"
  ON late_fees
  FOR UPDATE
  TO authenticated
  USING (true);

-- Step 5: Add default settings for late fees (if settings table exists)
-- These will be inserted only if they don't exist (global settings, academy_id = NULL)
-- Note: Settings can be academy-specific if academy_id is set, but defaults are global
DO $$
BEGIN
  -- Check if settings table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    -- Insert default late fee settings if they don't exist (global settings)
    INSERT INTO settings (key, value, academy_id)
    SELECT 'late_fee_enabled', 'false', NULL
    WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'late_fee_enabled' AND (academy_id IS NULL));
    
    INSERT INTO settings (key, value, academy_id)
    SELECT 'late_fee_type', 'percentage', NULL
    WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'late_fee_type' AND (academy_id IS NULL));
    
    INSERT INTO settings (key, value, academy_id)
    SELECT 'late_fee_value', '5', NULL
    WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'late_fee_value' AND (academy_id IS NULL));
    
    INSERT INTO settings (key, value, academy_id)
    SELECT 'late_fee_grace_days', '5', NULL
    WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'late_fee_grace_days' AND (academy_id IS NULL));
  END IF;
END $$;

-- Step 6: Add comment to document the table
COMMENT ON TABLE late_fees IS 'Registra los recargos aplicados a jugadores por pagos atrasados';
COMMENT ON COLUMN late_fees.payment_id IS 'Referencia al cargo mensual original (puede ser NULL si el cargo fue eliminado)';
COMMENT ON COLUMN late_fees.player_id IS 'Jugador al que se le aplicó el recargo';
COMMENT ON COLUMN late_fees.month_year IS 'Mes y año del cargo (formato YYYY-MM)';
COMMENT ON COLUMN late_fees.original_amount IS 'Monto original del cargo antes del recargo';
COMMENT ON COLUMN late_fees.late_fee_amount IS 'Monto del recargo aplicado';
COMMENT ON COLUMN late_fees.late_fee_type IS 'Tipo de recargo: percentage (porcentual) o fixed (precio fijo)';
COMMENT ON COLUMN late_fees.late_fee_rate IS 'Valor usado: porcentaje (ej: 5.00) o monto fijo (ej: 10.00)';
COMMENT ON COLUMN late_fees.days_overdue IS 'Días de atraso cuando se aplicó el recargo';
