import * as brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = process.env.BREVO_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️ BREVO_API_KEY no está configurada en las variables de entorno. El envío de correos fallará hasta que la configures.');
} else {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
}

export const isBrevoConfigured = Boolean(apiKey);
export { apiInstance as brevo };
export type SendSmtpEmail = brevo.SendSmtpEmail;

