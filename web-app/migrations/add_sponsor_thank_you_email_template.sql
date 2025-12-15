-- Migration: Add sponsor thank you email template
-- This template is sent automatically when a new sponsor registers

INSERT INTO email_templates (name, subject, html_template, variables, is_active)
VALUES (
  'sponsor_thank_you',
  '¡Gracias por ser Padrino de Suarez Academy!',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gracias por ser Padrino</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 40px 20px; text-align: center;">
              <img src="{{logoUrl}}" alt="{{academy_name}}" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">¡Gracias por ser Padrino!</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Estimado/a <strong>{{sponsor_name}}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                En nombre de <strong>{{academy_name}}</strong>, queremos expresar nuestro más sincero agradecimiento por tu generosa contribución como <strong>{{sponsor_level}}</strong>.
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Tu apoyo de <strong>${{sponsor_amount}}</strong> nos permite continuar brindando oportunidades de crecimiento y desarrollo a nuestros jóvenes futbolistas.
              </p>
              
              <!-- Sponsor Level Details -->
              <div style="background-color: #f9fafb; border-left: 4px solid #ec4899; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h2 style="color: #ec4899; font-size: 20px; margin: 0 0 15px 0;">Detalles de tu Padrinazgo</h2>
                <p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>Nivel:</strong> {{sponsor_level}}</p>
                <p style="color: #666666; font-size: 14px; margin: 5px 0;"><strong>Monto:</strong> ${{sponsor_amount}}</p>
              </div>
              
              <!-- Benefits Section -->
              <div style="margin: 30px 0;">
                <h2 style="color: #333333; font-size: 20px; margin: 0 0 15px 0;">Beneficios Incluidos</h2>
                <div style="color: #666666; font-size: 16px; line-height: 1.8;">
                  {{sponsor_benefits}}
                </div>
              </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 30px 0 20px 0;">
                Tu generosidad tiene un impacto real en la vida de nuestros jugadores. Estás invirtiendo en su futuro, su autoestima y sus sueños.
              </p>
              
              <!-- Contact Information -->
              <div style="background-color: #f9fafb; padding: 20px; margin: 30px 0; border-radius: 4px; text-align: center;">
                <p style="color: #333333; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">¿Tienes preguntas o necesitas más información?</p>
                <p style="color: #666666; font-size: 14px; margin: 5px 0;">
                  <strong>Teléfono:</strong> {{academy_contact_phone}}
                </p>
                <p style="color: #666666; font-size: 14px; margin: 5px 0;">
                  <strong>Email:</strong> <a href="mailto:{{academy_contact_email}}" style="color: #ec4899; text-decoration: none;">{{academy_contact_email}}</a>
                </p>
              </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                Nuevamente, ¡gracias por creer en nuestros chicos y ser parte de nuestra familia futbolística!
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Con gratitud,<br>
                <strong>El equipo de {{academy_name}}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                Este correo fue enviado automáticamente. Por favor, no respondas a este mensaje.
              </p>
              <p style="color: #666666; font-size: 12px; margin: 10px 0 0 0;">
                © {{academy_name}} - Todos los derechos reservados
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '{"sponsor_name": "Nombre del padrino", "sponsor_level": "Nivel de padrinazgo (Gold, Plata, Bronce)", "sponsor_amount": "Monto del padrinazgo", "sponsor_benefits": "Lista HTML de beneficios", "academy_name": "Nombre de la academia", "academy_contact_phone": "Teléfono de contacto", "academy_contact_email": "Email de contacto", "logoUrl": "URL del logo de la academia"}'::jsonb,
  true
)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

