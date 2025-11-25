-- Add tournament announcement and general broadcast templates
INSERT INTO email_templates (name, subject, html_template, variables)
SELECT
  'tournament_announcement',
  'Invitación Torneo: {{tournamentName}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invitación Torneo</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><img src="{{logoUrl}}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;"><h1 style="color: #4c1d95; margin-bottom: 10px;">🏆 {{tournamentName}}</h1><p>Hola <strong>{{tutorName}}</strong>,</p><p>Nos emociona invitarte a participar en el próximo torneo.</p><div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin: 20px 0;"><p style="margin: 0;"><strong>📅 Fecha:</strong> {{tournamentDate}}</p><p style="margin: 0;"><strong>📍 Lugar:</strong> {{tournamentLocation}}</p></div><p>{{additionalInfo}}</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p></div></body></html>',
  '{"tutorName": "", "tournamentName": "", "tournamentDate": "", "tournamentLocation": "", "additionalInfo": "", "logoUrl": ""}'
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'tournament_announcement'
);

INSERT INTO email_templates (name, subject, html_template, variables)
SELECT
  'general_broadcast',
  '{{customSubject}} - Suarez Academy',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comunicado</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><img src="{{logoUrl}}" alt="Logo" style="width: 80px; height: 80px; margin-bottom: 20px;"><p>Hola <strong>{{tutorName}}</strong>,</p><p>{{messageBody}}</p><p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">© 2025 Suarez Academy</p></div></body></html>',
  '{"tutorName": "", "customSubject": "", "messageBody": "", "logoUrl": ""}'
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'general_broadcast'
);

