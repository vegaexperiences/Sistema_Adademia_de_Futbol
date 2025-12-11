-- Fix pre_enrollment template: create if doesn't exist, update if empty
-- This ensures the template always has valid HTML content

-- First, try to insert the template if it doesn't exist
INSERT INTO email_templates (name, subject, html_template, variables, is_active)
VALUES (
  'pre_enrollment',
  'Confirmación de Matrícula - Suarez Academy',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Confirmación de Matrícula</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><img src="{{logoUrl}}" alt="Logo Suarez Academy" style="width: 80px; height: 80px; margin-bottom: 20px; display: block;"><h1 style="color: #1e3a8a; margin-top: 0;">Confirmación de Matrícula</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>¡Gracias por confiar en nosotros! Hemos recibido exitosamente la solicitud de matrícula.</p><h3 style="color: #1e3a8a; margin-top: 30px;">Jugadores Inscritos:</h3><p>{{playerNames}}</p><div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;"><div style="color: #0369a1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px;">TOTAL A PAGAR</div><div style="color: #0c4a6e; font-size: 36px; font-weight: 800; margin: 10px 0;">${{amount}}</div><div style="color: #64748b; font-size: 14px; margin-top: 10px;">Método de pago: {{paymentMethod}}</div></div><p style="margin-top: 30px; color: #666;">Estaremos revisando tu solicitud y te notificaremos cuando sea aprobada.</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy - Todos los derechos reservados</p></div></body></html>',
  '{"tutorName": "", "playerNames": "", "amount": 0, "paymentMethod": "", "logoUrl": ""}'::jsonb,
  true
)
ON CONFLICT (name) DO NOTHING;

-- Then, update if it exists but html_template is empty or null
UPDATE email_templates
SET 
  html_template = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Confirmación de Matrícula</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><img src="{{logoUrl}}" alt="Logo Suarez Academy" style="width: 80px; height: 80px; margin-bottom: 20px; display: block;"><h1 style="color: #1e3a8a; margin-top: 0;">Confirmación de Matrícula</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>¡Gracias por confiar en nosotros! Hemos recibido exitosamente la solicitud de matrícula.</p><h3 style="color: #1e3a8a; margin-top: 30px;">Jugadores Inscritos:</h3><p>{{playerNames}}</p><div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;"><div style="color: #0369a1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px;">TOTAL A PAGAR</div><div style="color: #0c4a6e; font-size: 36px; font-weight: 800; margin: 10px 0;">${{amount}}</div><div style="color: #64748b; font-size: 14px; margin-top: 10px;">Método de pago: {{paymentMethod}}</div></div><p style="margin-top: 30px; color: #666;">Estaremos revisando tu solicitud y te notificaremos cuando sea aprobada.</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy - Todos los derechos reservados</p></div></body></html>',
  subject = COALESCE(subject, 'Confirmación de Matrícula - Suarez Academy'),
  is_active = true,
  updated_at = NOW()
WHERE 
  name = 'pre_enrollment'
  AND (html_template IS NULL OR html_template = '' OR LENGTH(TRIM(html_template)) = 0);

