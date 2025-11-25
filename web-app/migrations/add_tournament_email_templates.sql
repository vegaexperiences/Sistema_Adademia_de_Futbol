-- Tournament registration email templates
INSERT INTO email_templates (name, subject, html_template, variables)
SELECT
  'tournament_registration_received',
  'Hemos recibido tu inscripción al torneo {{tournamentName}}',
  '<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Registro Recibido</title></head><body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><div style=\"max-width: 600px; margin: 0 auto; padding: 20px;\"><img src=\"{{logoUrl}}\" alt=\"Logo\" style=\"width: 80px; height: 80px; margin-bottom: 20px;\"><h1 style=\"color: #1e3a8a;\">¡Registro recibido!</h1><p>Hola <strong>{{coachName}}</strong>,</p><p>Hemos recibido la inscripción del equipo <strong>{{teamName}}</strong> para el torneo <strong>{{tournamentName}}</strong>.</p><div style=\"background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0;\"><p style=\"margin: 0;\"><strong>📅 Fecha:</strong> {{tournamentDate}}</p><p style=\"margin: 0;\"><strong>📍 Lugar:</strong> {{tournamentLocation}}</p><p style=\"margin: 0;\"><strong>🏷️ Categoría:</strong> {{category}}</p></div><p>Nos pondremos en contacto para confirmar el pago y detalles finales.</p><p style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;\">© 2025 Suarez Academy</p></div></body></html>',
  '{"coachName": "", "teamName": "", "tournamentName": "", "tournamentDate": "", "tournamentLocation": "", "category": "", "logoUrl": ""}'
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'tournament_registration_received'
);

INSERT INTO email_templates (name, subject, html_template, variables)
SELECT
  'tournament_registration_approved',
  'Tu equipo {{teamName}} fue aceptado en {{tournamentName}}',
  '<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Inscripción Aprobada</title></head><body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\"><div style=\"max-width: 600px; margin: 0 auto; padding: 20px;\"><img src=\"{{logoUrl}}\" alt=\"Logo\" style=\"width: 80px; height: 80px; margin-bottom: 20px;\"><div style=\"background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;\"><div style=\"font-size: 48px; margin-bottom: 10px;\">🎉</div><h2 style=\"color: #059669; margin: 0;\">¡Inscripción Aprobada!</h2></div><p>Hola <strong>{{coachName}}</strong>,</p><p>Tu equipo <strong>{{teamName}}</strong> ha sido aceptado para competir en el torneo <strong>{{tournamentName}}</strong>.</p><div style=\"background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 15px; margin: 20px 0;\"><p style=\"margin: 0;\"><strong>📅 Fecha:</strong> {{tournamentDate}}</p><p style=\"margin: 0;\"><strong>📍 Lugar:</strong> {{tournamentLocation}}</p><p style=\"margin: 0;\"><strong>🏷️ Categoría:</strong> {{category}}</p></div><p>{{nextSteps}}</p><p style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;\">© 2025 Suarez Academy</p></div></body></html>',
  '{"coachName": "", "teamName": "", "tournamentName": "", "tournamentDate": "", "tournamentLocation": "", "category": "", "nextSteps": "", "logoUrl": ""}'
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'tournament_registration_approved'
);

