-- Migration: Update payment_reminder email template with payment link
-- This updates the payment_reminder template to include a prominent payment link button

UPDATE email_templates
SET 
  html_template = '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Pago</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eeeeee;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 15px;
    }
    h1 {
      color: #f59e0b;
      font-size: 24px;
      margin: 0;
    }
    h2 {
      color: #1e3a8a;
      font-size: 20px;
      margin-top: 25px;
      margin-bottom: 15px;
    }
    p {
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      padding: 15px 35px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      font-size: 18px;
      margin: 25px 0;
      text-align: center;
      box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eeeeee;
      font-size: 12px;
      color: #999999;
    }
    ul {
      list-style-type: disc;
      padding-left: 20px;
      margin-bottom: 15px;
    }
    .amount-box {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 25px 0;
    }
    .amount-value {
      color: #92400e;
      font-size: 36px;
      font-weight: 800;
      margin: 10px 0;
    }
    .amount-label {
      color: #92400e;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .due-date {
      color: #a16207;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{logoUrl}}" alt="Suarez Academy Logo" class="logo" />
      <h1>Recordatorio de Pago</h1>
    </div>
    
    <p>Hola <strong>{{tutorName}}</strong>,</p>
    <p>Este es un recordatorio amigable sobre el pago pendiente de la mensualidad.</p>
    
    <h2>👥 Jugadores</h2>
    <ul>
      {{{playerList}}}
    </ul>
    
    <div class="amount-box">
      <div class="amount-label">Monto a Pagar</div>
      <div class="amount-value">${{amount}}</div>
      <div class="due-date">Fecha límite: <strong>{{dueDate}}</strong></div>
    </div>
    
    <p style="margin-top: 25px; text-align: center; font-size: 16px;">
      Para ver el detalle de tu cuenta y realizar el pago de forma segura, haz clic en el siguiente botón:
    </p>
    
    <div class="button-container">
      <a href="{{paymentLink}}" class="button">💳 Pagar Ahora</a>
    </div>
    
    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
      Este enlace te llevará directamente al portal de pagos donde podrás ver tu estado de cuenta y realizar el pago usando todos los métodos disponibles.
    </p>
    
    <div class="footer">
      <p>&copy; {{current_year}} {{academy_name}}. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>',
  variables = '{"tutorName": "", "playerList": "<li>Jugador 1</li><li>Jugador 2</li>", "amount": 0, "dueDate": "", "logoUrl": "", "paymentLink": "", "academy_name": "", "current_year": 2025}'::jsonb,
  updated_at = NOW()
WHERE name = 'payment_reminder';

