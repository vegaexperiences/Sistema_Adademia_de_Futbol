-- Migration: Add payment link to payment_reminder email template
-- This adds a "Pagar Ahora" button that links to the public payment portal

UPDATE email_templates
SET 
  html_template = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recordatorio de Pago</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><img src="{{logoUrl}}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;"><h1 style="color: #f59e0b;">Recordatorio de Pago</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>Este es un recordatorio amigable sobre el pago pendiente de la mensualidad.</p><h3>Jugadores:</h3><p>{{playerNames}}</p><h3>Monto a Pagar: ${{amount}}</h3><p>Fecha límite: {{dueDate}}</p><div style="text-align: center; margin: 30px 0;"><a href="{{paymentLink}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">💳 Pagar Ahora</a></div><p style="margin-top: 20px; color: #666; font-size: 14px;">O puedes realizar el pago directamente desde tu perfil en la plataforma.</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p></div></body></html>',
  variables = '{"tutorName": "", "playerNames": "", "amount": 0, "dueDate": "", "logoUrl": "", "paymentLink": ""}'::jsonb
WHERE name = 'payment_reminder';

