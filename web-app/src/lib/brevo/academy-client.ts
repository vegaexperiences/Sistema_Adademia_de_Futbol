/**
 * Academy-specific Brevo client factory
 * Creates Brevo clients with academy-specific API keys
 */

import * as brevo from '@getbrevo/brevo'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAcademyId } from '@/lib/supabase/server'

// Cache Brevo clients per academy ID to avoid recreating
const clientCache = new Map<string, {
  transactional: brevo.TransactionalEmailsApi
  account: brevo.AccountApi
}>()

/**
 * Create a Brevo client with a specific API key
 */
export function createBrevoClient(apiKey: string): {
  transactional: brevo.TransactionalEmailsApi
  account: brevo.AccountApi
} {
  const transactionalApi = new brevo.TransactionalEmailsApi()
  const accountApi = new brevo.AccountApi()

  if (apiKey) {
    transactionalApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)
    accountApi.setApiKey(brevo.AccountApiApiKeys.apiKey, apiKey)
  }

  return {
    transactional: transactionalApi,
    account: accountApi,
  }
}

/**
 * Get Brevo client using environment variables (single-tenant mode)
 * No longer queries academy database - uses only env vars
 */
export async function getBrevoClientForAcademy(
  academyId?: string | null
): Promise<{
  transactional: brevo.TransactionalEmailsApi
  account: brevo.AccountApi
  apiKey: string
  fromEmail: string
  fromName: string
}> {
  // Single-tenant mode: use only environment variables
  const apiKey = process.env.BREVO_API_KEY || ''
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@suarezacademy.com'
  const fromName = process.env.BREVO_FROM_NAME || 'Suarez Academy'

  // Create client
  const client = createBrevoClient(apiKey)

  return {
    ...client,
    apiKey,
    fromEmail,
    fromName,
  }
}

/**
 * Clear client cache (useful for testing or when settings change)
 */
export function clearBrevoClientCache(academyId?: string) {
  if (academyId) {
    clientCache.delete(academyId)
  } else {
    clientCache.clear()
  }
}

