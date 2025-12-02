-- Fix player_accepted template if html_template is empty or null
-- This ensures the template always has valid HTML content

-- First, try to insert the template if it doesn't exist
INSERT INTO email_templates (name, subject, html_template, variables, is_active)
VALUES (
  'player_accepted',
  '¡Felicitaciones! Matrícula Aprobada - Suarez Academy',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Matrícula Aprobada</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><img src="{{logoUrl}}" alt="Logo Suarez Academy" style="width: 80px; height: 80px; margin-bottom: 20px; display: block;"><h1 style="color: #10b981; margin-top: 0;">¡Felicitaciones!{{scholarshipStatus}}</h1><p>Hola <strong>{{tutorName}}</strong>,</p>{{scholarshipMessage}}<p>Nos complace informarte que la matrícula ha sido <strong>aprobada exitosamente</strong>.</p><h3 style="color: #10b981; margin-top: 30px;">Jugadores Activos:</h3><p>{{playerNames}}</p>{{monthlyFeeSection}}<h3 style="color: #10b981; margin-top: 30px;">Próximos Pasos:</h3><ul style="padding-left: 20px; list-style-type: disc;">{{paymentReminder}}<li>Confirma los horarios de entrenamiento con tu entrenador asignado</li><li>Revisa nuestras redes sociales para novedades y eventos</li></ul><p style="margin-top: 30px; color: #666;">¡Bienvenido a Suarez Academy!</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy - Todos los derechos reservados</p></div></body></html>',
  '{"tutorName": "", "playerNames": "", "monthlyFee": "0", "scholarshipStatus": "", "scholarshipMessage": "", "scholarshipIcon": "", "scholarshipColor": "", "scholarshipBg": "", "scholarshipBorder": "", "monthlyFeeSection": "", "paymentReminder": "", "logoUrl": ""}'::jsonb,
  true
)
ON CONFLICT (name) DO NOTHING;

-- Then, update if it exists but html_template is empty or null
UPDATE email_templates
SET 
  html_template = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Matrícula Aprobada</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><img src="{{logoUrl}}" alt="Logo Suarez Academy" style="width: 80px; height: 80px; margin-bottom: 20px; display: block;"><h1 style="color: #10b981; margin-top: 0;">¡Felicitaciones!{{scholarshipStatus}}</h1><p>Hola <strong>{{tutorName}}</strong>,</p>{{scholarshipMessage}}<p>Nos complace informarte que la matrícula ha sido <strong>aprobada exitosamente</strong>.</p><h3 style="color: #10b981; margin-top: 30px;">Jugadores Activos:</h3><p>{{playerNames}}</p>{{monthlyFeeSection}}<h3 style="color: #10b981; margin-top: 30px;">Próximos Pasos:</h3><ul style="padding-left: 20px; list-style-type: disc;">{{paymentReminder}}<li>Confirma los horarios de entrenamiento con tu entrenador asignado</li><li>Revisa nuestras redes sociales para novedades y eventos</li></ul><p style="margin-top: 30px; color: #666;">¡Bienvenido a Suarez Academy!</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy - Todos los derechos reservados</p></div></body></html>',
  subject = COALESCE(subject, '¡Felicitaciones! Matrícula Aprobada - Suarez Academy'),
  is_active = true,
  updated_at = NOW()
WHERE 
  name = 'player_accepted'
  AND (html_template IS NULL OR html_template = '' OR LENGTH(TRIM(html_template)) = 0);

-- Verify result
SELECT 
  name as "Nombre",
  CASE 
    WHEN html_template IS NULL OR html_template = '' THEN '❌ VACÍO'
    WHEN LENGTH(html_template) < 100 THEN '⚠️  MUY CORTO'
    ELSE '✅ VÁLIDO'
  END as "Estado",
  LENGTH(html_template) as "Longitud HTML",
  is_active as "Activo"
FROM email_templates
WHERE name = 'player_accepted';

