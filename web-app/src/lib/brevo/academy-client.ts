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
 * Get Brevo client for a specific academy
 * Loads API key from academy settings, falls back to global env var
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
  // If no academy ID provided, try to get from context
  if (!academyId) {
    academyId = await getCurrentAcademyId()
  }

  // Check cache first
  if (academyId && clientCache.has(academyId)) {
    const cached = clientCache.get(academyId)!
    // Get academy settings for fromEmail/fromName
    const supabase = await createClient()
    const { data: academy } = await supabase
      .from('academies')
      .select('settings')
      .eq('id', academyId)
      .single()

    const emailSettings = academy?.settings?.email || {}
    const apiKey = emailSettings.brevo_api_key || process.env.BREVO_API_KEY || ''
    
    return {
      ...cached,
      apiKey,
      fromEmail: emailSettings.brevo_from_email || process.env.BREVO_FROM_EMAIL || 'noreply@suarezacademy.com',
      fromName: emailSettings.brevo_from_name || 'Suarez Academy',
    }
  }

  // Load academy settings
  let apiKey = process.env.BREVO_API_KEY || ''
  let fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@suarezacademy.com'
  let fromName = 'Suarez Academy'

  if (academyId) {
    const supabase = await createClient()
    const { data: academy, error } = await supabase
      .from('academies')
      .select('settings')
      .eq('id', academyId)
      .single()

    if (!error && academy?.settings?.email) {
      const emailSettings = academy.settings.email
      // Use academy-specific Brevo API key if configured
      if (emailSettings.brevo_api_key) {
        apiKey = emailSettings.brevo_api_key
      }
      if (emailSettings.brevo_from_email) {
        fromEmail = emailSettings.brevo_from_email
      }
      if (emailSettings.brevo_from_name) {
        fromName = emailSettings.brevo_from_name
      }
    }
  }

  // Create client
  const client = createBrevoClient(apiKey)

  // Cache if we have academy ID
  if (academyId && apiKey) {
    clientCache.set(academyId, client)
  }

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

