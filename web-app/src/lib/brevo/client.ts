import * as brevo from '@getbrevo/brevo';

// Validar que la API key esté configurada
if (!process.env.BREVO_API_KEY) {
  console.error('⚠️ BREVO_API_KEY no está configurada en las variables de entorno');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BREVO_API_KEY es requerida en producción');
  }
}

const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = process.env.BREVO_API_KEY || '';

if (apiKey) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
}

export { apiInstance as brevo };
export type SendSmtpEmail = brevo.SendSmtpEmail;

