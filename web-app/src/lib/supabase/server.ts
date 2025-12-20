import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getDatabaseConfig } from '../config/client-config'

/**
 * Create Supabase Server Client - Single Tenant
 * 
 * Uses centralized configuration for better maintainability and isolation.
 * RLS policies have been updated to work without academy filtering.
 * 
 * Architecture: Single-Tenant Replicable
 * - Each deployment connects to its own Supabase project via environment variables
 * - Configuration is validated on startup via client-config module
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Get database configuration from centralized config
  const dbConfig = getDatabaseConfig()

  const client = createServerClient(
    dbConfig.url,
    dbConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  return client
}

// Re-export for compatibility during migration
export { getCurrentAcademyId, getCurrentAcademy } from '../utils/academy-stub';
