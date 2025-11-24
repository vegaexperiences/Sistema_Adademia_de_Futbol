export const generateMonthlyStatementEmail = (
  logoUrl: string,
  tutorName: string,
  playerNames: string[],
  month: string,
  payments: Array<{ date: string; amount: number; concept: string }>,
  balance: number
) => {
  const playerList = playerNames
    .map(name => `<li style="margin-bottom: 8px;">${name}</li>`)
    .join('');

  const paymentRows = payments
    .map(p => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${p.date}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${p.concept}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${p.amount.toFixed(2)}</td>
      </tr>
    `)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estado de Cuenta Mensual</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .logo { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin-bottom: 15px; object-fit: contain; padding: 5px; }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
    .section:last-child { border-bottom: none; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; }
    .balance-box { background-color: ${balance <= 0 ? '#d1fae5' : '#fee2e2'}; border: 2px solid ${balance <= 0 ? '#6ee7b7' : '#fca5a5'}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .balance-value { color: ${balance <= 0 ? '#059669' : '#dc2626'}; font-size: 36px; font-weight: 800; }
    .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Suarez Academy Logo" class="logo" />
      <h1>Estado de Cuenta Mensual</h1>
      <p style="color: #e0e7ff; margin: 10px 0 0 0;">${month}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <p style="font-size: 16px;">Hola <strong>${tutorName}</strong>,</p>
        <p>Aquí está el resumen de pagos del mes:</p>
      </div>

      <div class="section">
        <h3 style="color: #4f46e5; margin-top: 0;">👥 Jugadores</h3>
        <ul style="padding-left: 20px; list-style-type: disc;">
          ${playerList}
        </ul>
      </div>

      <div class="section">
        <h3 style="color: #4f46e5; margin-top: 0;">💳 Historial de Pagos</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th style="text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRows || '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #9ca3af;">No hay pagos registrados este mes</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3 style="color: #4f46e5; margin-top: 0;">📊 Balance</h3>
        <div class="balance-box">
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px;">
            ${balance <= 0 ? '✅ Al Día' : '⚠️ Pendiente'}
          </div>
          <div class="balance-value">${balance <= 0 ? '$0.00' : `$${balance.toFixed(2)}`}</div>
          ${balance > 0 ? '<p style="margin-top: 10px; font-size: 14px; color: #991b1b;">Por favor, realiza tu pago lo antes posible.</p>' : ''}
        </div>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Suarez Academy. Todos los derechos reservados.</p>
      <p>Si tienes alguna duda, no dudes en contactarnos.</p>
    </div>
  </div>
</body>
</html>
  `;
};
