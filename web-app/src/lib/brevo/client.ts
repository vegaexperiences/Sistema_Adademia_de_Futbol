import * as brevo from '@getbrevo/brevo';
import { getBrevoConfig } from '../config/client-config';

const apiInstance = new brevo.TransactionalEmailsApi();
const accountApiInstance = new brevo.AccountApi();

/**
 * Initialize Brevo clients with API key from centralized config
 */
function initializeBrevoClients(): void {
  try {
    const config = getBrevoConfig();
    if (!config.apiKey) {
      console.warn('⚠️ BREVO_API_KEY no está configurada. El envío de correos fallará hasta que la configures.');
    } else {
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, config.apiKey);
      accountApiInstance.setApiKey(brevo.AccountApiApiKeys.apiKey, config.apiKey);
    }
  } catch (error) {
    console.warn('⚠️ Brevo configuration error:', (error as Error).message);
  }
}

// Initialize on module load
initializeBrevoClients();

export const isBrevoConfigured = ((): boolean => {
  try {
    const config = getBrevoConfig();
    return Boolean(config.apiKey);
  } catch {
    return false;
  }
})();

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

