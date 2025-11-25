import * as brevo from '@getbrevo/brevo';
import * as dotenv from 'dotenv';

dotenv.config();

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

async function sendTestEmail() {
  try {
    const sendSmtpEmail: brevo.SendSmtpEmail = {
      sender: { 
        name: 'Suarez Academy', 
        email: process.env.BREVO_FROM_EMAIL || 'noreply@suarezacademy.com' 
      },
      to: [{ email: process.env.TEST_EMAIL || 'test@example.com' }],
      subject: 'Email de Prueba - Suarez Academy',
      htmlContent: `
        <h1>Email de Prueba</h1>
        <p>Este es un email de prueba desde Suarez Academy usando Brevo.</p>
        <p>Si recibes este email, la configuración de Brevo está funcionando correctamente.</p>
      `,
    };

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email enviado exitosamente!');
    console.log('Message ID:', result.messageId);
  } catch (error: any) {
    console.error('❌ Error enviando email:', error);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
  }
}

sendTestEmail();
