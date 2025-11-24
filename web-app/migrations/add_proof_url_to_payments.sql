-- Add proof_url column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Insert default payment methods configuration
-- Using 'settings' table instead of 'system_config'
INSERT INTO settings (key, value, description)
VALUES ('payment_methods', '{"yappy": true, "transfer": true, "proof": false}', 'Configuración de métodos de pago activos')
ON CONFLICT (key) DO NOTHING;
