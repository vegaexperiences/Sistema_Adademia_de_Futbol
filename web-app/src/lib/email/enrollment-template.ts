export const generateEnrollmentEmail = (
  logoUrl: string,
  tutorName: string,
  players: { firstName: string; lastName: string; category?: string }[],
  totalAmount: number,
  paymentMethod: string
) => {
  const playerList = players
    .map(
      (p) =>
        `<li style="margin-bottom: 8px;">
          <strong>${p.firstName} ${p.lastName}</strong>
          ${p.category ? `<span style="color: #666; font-size: 14px;">(${p.category})</span>` : ''}
        </li>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirmación de Matrícula</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .logo { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin-bottom: 15px; object-fit: contain; padding: 5px; }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
    .section:last-child { border-bottom: none; }
    .amount-box { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
    .amount-label { color: #0369a1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .amount-value { color: #0c4a6e; font-size: 32px; font-weight: 800; margin: 5px 0; }
    .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Suarez Academy Logo" class="logo" />
      <h1>Confirmación de Matrícula</h1>
    </div>
    
    <div class="content">
      <div class="section">
        <p style="font-size: 16px;">Hola <strong>${tutorName}</strong>,</p>
        <p>¡Gracias por confiar en nosotros! Hemos recibido exitosamente la solicitud de matrícula.</p>
      </div>

      <div class="section">
        <h3 style="color: #1e3a8a; margin-top: 0;">📋 Jugadores Inscritos</h3>
        <ul style="padding-left: 20px; list-style-type: disc;">
          ${playerList}
        </ul>
      </div>

      <div class="section">
        <h3 style="color: #1e3a8a; margin-top: 0;">💰 Detalles del Pago</h3>
        <div class="amount-box">
          <div class="amount-label">Total a Pagar</div>
          <div class="amount-value">$${totalAmount.toFixed(2)}</div>
          <div style="color: #64748b; font-size: 14px; margin-top: 5px;">Método: <strong>${paymentMethod}</strong></div>
        </div>
        <p style="font-size: 14px; color: #666;">
          Si seleccionaste <strong>Yappy</strong> o <strong>Transferencia</strong> y aún no has adjuntado tu comprobante, por favor responde a este correo con la imagen o contáctanos.
        </p>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Suarez Academy. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder directamente si no es necesario.</p>
    </div>
  </div>
</body>
</html>
  `;
};
