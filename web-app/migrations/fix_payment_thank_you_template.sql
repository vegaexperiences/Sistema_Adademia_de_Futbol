-- Fix payment_thank_you template if it's empty or doesn't exist
-- This migration ensures the template has the correct HTML content

-- First, delete the template if it exists but is empty
DELETE FROM email_templates 
WHERE name = 'payment_thank_you' 
  AND (html_template IS NULL OR html_template = '' OR LENGTH(html_template) < 100);

-- Insert the template with full HTML content
INSERT INTO email_templates (name, subject, html_template, variables)
SELECT
  'payment_thank_you',
  '¡Gracias por su pago! - Suarez Academy',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gracias por su Pago</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e3a8a;">
      <img src="{{logoUrl}}" alt="Suarez Academy Logo" style="width: 80px; height: 80px; margin-bottom: 15px;">
      <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Suarez Academy</h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 20px 0;">
      <h2 style="color: #1e3a8a; margin-top: 0;">¡Gracias por su Pago!</h2>
      
      <p>Estimado/a <strong>{{tutorName}}</strong>,</p>
      
      <p>Queremos expresarle nuestro más sincero agradecimiento por su pago. Su compromiso y apoyo son fundamentales para el desarrollo y crecimiento de nuestros jugadores.</p>

      <!-- Payment Details Box -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #1e3a8a; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #1e3a8a; margin-top: 0; font-size: 18px;">📋 Detalles del Pago</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Jugador:</td>
            <td style="padding: 8px 0; color: #333;">{{playerName}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Tipo de Pago:</td>
            <td style="padding: 8px 0; color: #333;">{{paymentType}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Fecha de Pago:</td>
            <td style="padding: 8px 0; color: #333;">{{paymentDate}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Monto:</td>
            <td style="padding: 8px 0; color: #1e3a8a; font-size: 20px; font-weight: bold;">${{amount}} USD</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Número de Operación:</td>
            <td style="padding: 8px 0; color: #333; font-family: monospace;">{{operationId}}</td>
          </tr>
        </table>
      </div>

      <!-- Thank You Message -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold;">
          ✅ Su pago ha sido recibido y procesado exitosamente
        </p>
      </div>

      <p style="margin-top: 25px; font-size: 16px;">
        <strong>Su apoyo es invaluable para nosotros.</strong> Gracias por confiar en Suarez Academy y por ser parte de nuestra comunidad.
      </p>

      <p>Estamos comprometidos a brindar la mejor experiencia deportiva y formativa para nuestros jugadores. Su inversión nos permite continuar mejorando nuestras instalaciones, programas y servicios.</p>

      <p style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1e3a8a;">
        Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos. Estamos aquí para ayudarle.
      </p>

      <p style="margin-top: 25px; text-align: center;">
        <strong style="color: #1e3a8a; font-size: 18px;">¡Gracias nuevamente!</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
      <p style="margin: 5px 0;">© 2025 Suarez Academy. Todos los derechos reservados.</p>
      <p style="margin: 5px 0;">Este es un correo automático, por favor no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>',
  '{"tutorName": "", "playerName": "", "amount": "", "paymentType": "", "paymentDate": "", "monthYear": "", "operationId": "", "logoUrl": ""}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'payment_thank_you' AND html_template IS NOT NULL AND LENGTH(html_template) > 100
);

-- Update existing template if it exists but is empty
UPDATE email_templates
SET 
  subject = '¡Gracias por su pago! - Suarez Academy',
  html_template = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gracias por su Pago</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e3a8a;">
      <img src="{{logoUrl}}" alt="Suarez Academy Logo" style="width: 80px; height: 80px; margin-bottom: 15px;">
      <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Suarez Academy</h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 20px 0;">
      <h2 style="color: #1e3a8a; margin-top: 0;">¡Gracias por su Pago!</h2>
      
      <p>Estimado/a <strong>{{tutorName}}</strong>,</p>
      
      <p>Queremos expresarle nuestro más sincero agradecimiento por su pago. Su compromiso y apoyo son fundamentales para el desarrollo y crecimiento de nuestros jugadores.</p>

      <!-- Payment Details Box -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #1e3a8a; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #1e3a8a; margin-top: 0; font-size: 18px;">📋 Detalles del Pago</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Jugador:</td>
            <td style="padding: 8px 0; color: #333;">{{playerName}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Tipo de Pago:</td>
            <td style="padding: 8px 0; color: #333;">{{paymentType}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Fecha de Pago:</td>
            <td style="padding: 8px 0; color: #333;">{{paymentDate}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Monto:</td>
            <td style="padding: 8px 0; color: #1e3a8a; font-size: 20px; font-weight: bold;">${{amount}} USD</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: bold;">Número de Operación:</td>
            <td style="padding: 8px 0; color: #333; font-family: monospace;">{{operationId}}</td>
          </tr>
        </table>
      </div>

      <!-- Thank You Message -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold;">
          ✅ Su pago ha sido recibido y procesado exitosamente
        </p>
      </div>

      <p style="margin-top: 25px; font-size: 16px;">
        <strong>Su apoyo es invaluable para nosotros.</strong> Gracias por confiar en Suarez Academy y por ser parte de nuestra comunidad.
      </p>

      <p>Estamos comprometidos a brindar la mejor experiencia deportiva y formativa para nuestros jugadores. Su inversión nos permite continuar mejorando nuestras instalaciones, programas y servicios.</p>

      <p style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1e3a8a;">
        Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos. Estamos aquí para ayudarle.
      </p>

      <p style="margin-top: 25px; text-align: center;">
        <strong style="color: #1e3a8a; font-size: 18px;">¡Gracias nuevamente!</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
      <p style="margin: 5px 0;">© 2025 Suarez Academy. Todos los derechos reservados.</p>
      <p style="margin: 5px 0;">Este es un correo automático, por favor no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>',
  variables = '{"tutorName": "", "playerName": "", "amount": "", "paymentType": "", "paymentDate": "", "monthYear": "", "operationId": "", "logoUrl": ""}'::jsonb,
  updated_at = NOW()
WHERE name = 'payment_thank_you'
  AND (html_template IS NULL OR html_template = '' OR LENGTH(html_template) < 100);

