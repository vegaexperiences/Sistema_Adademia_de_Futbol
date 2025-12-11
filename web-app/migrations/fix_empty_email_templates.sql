-- Script para corregir templates de email vacíos: monthly_statement y payment_reminder
-- Este script actualiza estos templates si están vacíos con contenido HTML válido

-- ============================================
-- CORREGIR monthly_statement
-- ============================================
UPDATE email_templates
SET 
  html_template = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Estado de Cuenta Mensual</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><img src="{{logoUrl}}" alt="Logo Suarez Academy" style="width: 80px; height: 80px; margin-bottom: 20px; display: block;"><h1 style="color: #6366f1; margin-top: 0;">Estado de Cuenta Mensual</h1><p style="color: #666; font-size: 14px;">{{month}}</p><p>Hola <strong>{{tutorName}}</strong>,</p><p>Aquí está el resumen de pagos del mes:</p><h3 style="color: #6366f1; margin-top: 30px;">Jugadores:</h3><p>{{playerNames}}</p><div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;"><div style="color: #4338ca; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px;">Balance</div><div style="color: #312e81; font-size: 36px; font-weight: 800; margin: 10px 0;">${{balance}}</div></div><p style="margin-top: 30px; color: #666;">Si tienes alguna duda, no dudes en contactarnos.</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy - Todos los derechos reservados</p></div></body></html>',
  subject = COALESCE(subject, 'Estado de Cuenta Mensual - Suarez Academy'),
  variables = COALESCE(variables, '{"tutorName": "", "playerNames": "", "month": "", "balance": 0, "logoUrl": ""}'::jsonb),
  is_active = true,
  updated_at = NOW()
WHERE 
  name = 'monthly_statement'
  AND (html_template IS NULL OR html_template = '' OR LENGTH(TRIM(html_template)) = 0);

-- ============================================
-- CORREGIR payment_reminder
-- ============================================
UPDATE email_templates
SET 
  html_template = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recordatorio de Pago</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><img src="{{logoUrl}}" alt="Logo Suarez Academy" style="width: 80px; height: 80px; margin-bottom: 20px; display: block;"><h1 style="color: #f59e0b; margin-top: 0;">Recordatorio de Pago</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>Este es un recordatorio amigable sobre el pago pendiente de la mensualidad.</p><h3 style="color: #f59e0b; margin-top: 30px;">Jugadores:</h3><p>{{playerNames}}</p><div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;"><div style="color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px;">Monto a Pagar</div><div style="color: #78350f; font-size: 36px; font-weight: 800; margin: 10px 0;">${{amount}}</div><div style="color: #a16207; font-size: 14px; margin-top: 10px;">Fecha límite: {{dueDate}}</div></div><p style="margin-top: 30px; color: #666;">Por favor, realiza tu pago antes de la fecha límite para evitar inconvenientes.</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy - Todos los derechos reservados</p></div></body></html>',
  subject = COALESCE(subject, 'Recordatorio de Pago - Suarez Academy'),
  variables = COALESCE(variables, '{"tutorName": "", "playerNames": "", "amount": 0, "dueDate": "", "logoUrl": ""}'::jsonb),
  is_active = true,
  updated_at = NOW()
WHERE 
  name = 'payment_reminder'
  AND (html_template IS NULL OR html_template = '' OR LENGTH(TRIM(html_template)) = 0);

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================
SELECT 
  name as "Nombre",
  subject as "Asunto",
  CASE 
    WHEN html_template IS NULL OR html_template = '' THEN '❌ VACÍO'
    WHEN LENGTH(html_template) < 100 THEN '⚠️  MUY CORTO'
    ELSE '✅ VÁLIDO'
  END as "Estado",
  LENGTH(html_template) as "Longitud HTML",
  is_active as "Activo"
FROM email_templates
WHERE name IN ('monthly_statement', 'payment_reminder')
ORDER BY name;

