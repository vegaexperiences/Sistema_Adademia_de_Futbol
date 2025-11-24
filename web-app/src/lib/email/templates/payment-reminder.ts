export const generatePaymentReminderEmail = (
  logoUrl: string,
  tutorName: string,
  playerNames: string[],
  amount: number,
  dueDate: string
) => {
  const playerList = playerNames
    .map(name => `<li style="margin-bottom: 8px;">${name}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Recordatorio de Pago</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .logo { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin-bottom: 15px; object-fit: contain; padding: 5px; }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
    .section:last-child { border-bottom: none; }
    .amount-box { background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
    .amount-value { color: #92400e; font-size: 32px; font-weight: 800; margin: 5px 0; }
    .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Suarez Academy Logo" class="logo" />
      <h1>Recordatorio de Pago</h1>
    </div>
    
    <div class="content">
      <div class="section">
        <p style="font-size: 16px;">Hola <strong>${tutorName}</strong>,</p>
        <p>Este es un recordatorio amigable sobre el pago pendiente de la mensualidad.</p>
      </div>

      <div class="section">
        <h3 style="color: #d97706; margin-top: 0;">👥 Jugadores</h3>
        <ul style="padding-left: 20px; list-style-type: disc;">
          ${playerList}
        </ul>
      </div>

      <div class="section">
        <h3 style="color: #d97706; margin-top: 0;">💰 Detalles del Pago</h3>
        <div class="amount-box">
          <div style="color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Monto a Pagar</div>
          <div class="amount-value">$${amount.toFixed(2)}</div>
          <div style="color: #92400e; font-size: 14px; margin-top: 5px;">Fecha límite: <strong>${dueDate}</strong></div>
        </div>
      </div>

      <div class="section">
        <h3 style="color: #1e3a8a; margin-top: 0;">📲 Métodos de Pago</h3>
        <ul style="padding-left: 20px;">
          <li><strong>Yappy:</strong> @SuarezAcademy</li>
          <li><strong>Transferencia:</strong> Banco General - Cuenta de Ahorros</li>
        </ul>
        <p style="font-size: 14px; color: #666; margin-top: 15px;">
          Por favor, envía tu comprobante de pago después de realizar la transferencia.
        </p>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Suarez Academy. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
};
