export const generateAcceptedEmail = (
  logoUrl: string,
  tutorName: string,
  playerNames: string[]
) => {
  const playerList = playerNames
    .map(name => `<li style="margin-bottom: 8px;"><strong>${name}</strong></li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>¡Matrícula Aprobada!</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .logo { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin-bottom: 15px; object-fit: contain; padding: 5px; }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
    .section:last-child { border-bottom: none; }
    .success-box { background-color: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .success-icon { font-size: 48px; margin-bottom: 10px; }
    .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Suarez Academy Logo" class="logo" />
      <h1>¡Felicitaciones!</h1>
    </div>
    
    <div class="content">
      <div class="success-box">
        <div class="success-icon">🎉</div>
        <h2 style="color: #059669; margin: 0;">Matrícula Aprobada</h2>
      </div>

      <div class="section">
        <p style="font-size: 16px;">Hola <strong>${tutorName}</strong>,</p>
        <p>Nos complace informarte que la matrícula ha sido <strong>aprobada exitosamente</strong>.</p>
      </div>

      <div class="section">
        <h3 style="color: #059669; margin-top: 0;">✅ Jugadores Activos</h3>
        <ul style="padding-left: 20px; list-style-type: disc;">
          ${playerList}
        </ul>
      </div>

      <div class="section">
        <h3 style="color: #1e3a8a; margin-top: 0;">📅 Próximos Pasos</h3>
        <ul style="padding-left: 20px;">
          <li>Confirma los horarios de entrenamiento con tu entrenador asignado</li>
          <li>Asegúrate de completar el pago mensual antes del día 5 de cada mes</li>
          <li>Revisa nuestras redes sociales para novedades y eventos</li>
        </ul>
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
