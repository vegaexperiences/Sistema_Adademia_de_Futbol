import * as brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
const accountApiInstance = new brevo.AccountApi();
const apiKey = process.env.BREVO_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️ BREVO_API_KEY no está configurada en las variables de entorno. El envío de correos fallará hasta que la configures.');
} else {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  accountApiInstance.setApiKey(brevo.AccountApiApiKeys.apiKey, apiKey);
}

export const isBrevoConfigured = Boolean(apiKey);
export { apiInstance as brevo, accountApiInstance as brevoAccount };
export type SendSmtpEmail = brevo.SendSmtpEmail;

/**
 * Factory function to create Brevo clients with a specific API key
 * Used for academy-specific Brevo accounts
 */
export function createBrevoClient(apiKey: string): {
  transactional: brevo.TransactionalEmailsApi;
  account: brevo.AccountApi;
} {
  const transactionalApi = new brevo.TransactionalEmailsApi();
  const accountApi = new brevo.AccountApi();

  if (apiKey) {
    transactionalApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    accountApi.setApiKey(brevo.AccountApiApiKeys.apiKey, apiKey);
  }

  return {
    transactional: transactionalApi,
    account: accountApi,
  };
}

