-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_template TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for DATE DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add monthly statement tracking to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS monthly_statement_sent_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admins)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON email_templates;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON email_queue;

CREATE POLICY "Enable all for authenticated users" ON email_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON email_queue FOR ALL TO authenticated USING (true);

-- Insert default email templates with basic HTML structures
-- Note: These can be customized later through the dashboard
INSERT INTO email_templates (name, subject, html_template, variables) VALUES
(
  'pre_enrollment', 
  'Confirmación de Matrícula - Suarez Academy', 
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Confirmación de Matrícula</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><img src="{{logoUrl}}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;"><h1 style="color: #1e3a8a;">Confirmación de Matrícula</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>¡Gracias por confiar en nosotros! Hemos recibido exitosamente la solicitud de matrícula.</p><h3>Jugadores Inscritos:</h3><p>{{playerNames}}</p><h3>Total a Pagar: ${{amount}}</h3><p>Método de pago: {{paymentMethod}}</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p></div></body></html>',
  '{"tutorName": "", "playerNames": "", "amount": 0, "paymentMethod": "", "logoUrl": ""}'
),
(
  'player_accepted', 
  '¡Felicitaciones! Matrícula Aprobada - Suarez Academy', 
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Matrícula Aprobada</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><img src="{{logoUrl}}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;"><h1 style="color: #10b981;">¡Felicitaciones!</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>Nos complace informarte que la matrícula ha sido <strong>aprobada exitosamente</strong>.</p><h3>Jugadores Activos:</h3><p>{{playerNames}}</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p></div></body></html>',
  '{"tutorName": "", "playerNames": "", "logoUrl": ""}'
),
(
  'payment_reminder', 
  'Recordatorio de Pago - Suarez Academy', 
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recordatorio de Pago</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><img src="{{logoUrl}}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;"><h1 style="color: #f59e0b;">Recordatorio de Pago</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>Este es un recordatorio amigable sobre el pago pendiente de la mensualidad.</p><h3>Jugadores:</h3><p>{{playerNames}}</p><h3>Monto a Pagar: ${{amount}}</h3><p>Fecha límite: {{dueDate}}</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p></div></body></html>',
  '{"tutorName": "", "playerNames": "", "amount": 0, "dueDate": "", "logoUrl": ""}'
),
(
  'monthly_statement', 
  'Estado de Cuenta Mensual - Suarez Academy', 
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Estado de Cuenta</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><img src="{{logoUrl}}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;"><h1 style="color: #6366f1;">Estado de Cuenta Mensual</h1><p style="color: #666;">{{month}}</p><p>Hola <strong>{{tutorName}}</strong>,</p><p>Aquí está el resumen de pagos del mes:</p><h3>Jugadores:</h3><p>{{playerNames}}</p><h3>Balance: ${{balance}}</h3><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p></div></body></html>',
  '{"tutorName": "", "playerNames": "", "month": "", "balance": 0, "logoUrl": ""}'
)
ON CONFLICT (name) DO NOTHING;
