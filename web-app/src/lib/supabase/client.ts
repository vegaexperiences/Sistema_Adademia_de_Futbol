import { createBrowserClient } from '@supabase/ssr'
import { getDatabaseConfig } from '../config/client-config'

/**
 * Create Supabase Browser Client
 * 
 * Uses centralized configuration for better maintainability.
 * 
 * Architecture: Single-Tenant Replicable
 * - Each deployment connects to its own Supabase project via environment variables
 */
export function createClient() {
  // Get database configuration from centralized config
  const dbConfig = getDatabaseConfig()

  return createBrowserClient(
    dbConfig.url,
    dbConfig.anonKey
  )
}
