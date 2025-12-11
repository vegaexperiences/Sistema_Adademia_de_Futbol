import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const academyId = await getCurrentAcademyId()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Set the academy_id session variable for RLS policies
  // This allows the RLS policies to work correctly
  if (academyId) {
    try {
      // Use rpc to set the session variable
      const { error: rpcError } = await client.rpc('set_academy_context', { 
        academy_id: academyId 
      })
      
      if (rpcError) {
        console.warn('[createClient] Could not set academy context via RPC:', rpcError.message)
        // RLS will still work with explicit filters in queries
      } else {
        console.log('[createClient] ✅ Academy context set for RLS:', academyId)
      }
    } catch (error: any) {
      // Silently fail - RLS will still work with explicit filters
      console.warn('[createClient] Could not set academy context:', error?.message || error)
    }
  }

  return client
}

/**
 * Get current academy ID from request context
 * This is set by middleware based on the domain/subdomain
 * Falls back to cookies if headers are not available
 */
export async function getCurrentAcademyId(): Promise<string | null> {
  try {
    // First, try to get from headers (set by middleware)
    const headersList = await headers()
    const academyIdFromHeaders = headersList.get('x-academy-id')
    
    if (academyIdFromHeaders) {
      console.log('[getCurrentAcademyId] Found in headers:', academyIdFromHeaders)
      return academyIdFromHeaders
    }
    
    // Fallback to cookies (also set by middleware)
    const cookieStore = await cookies()
    const academyIdFromCookies = cookieStore.get('academy-id')?.value
    
    if (academyIdFromCookies) {
      console.log('[getCurrentAcademyId] Found in cookies:', academyIdFromCookies)
      return academyIdFromCookies
    }
    
    console.warn('[getCurrentAcademyId] ⚠️ No academy ID found in headers or cookies')
    return null
  } catch (error) {
    console.error('[getCurrentAcademyId] Error getting academy ID:', error)
    return null
  }
}

/**
 * Helper to add academy filter to a query
 * This ensures all queries are filtered by the current academy
 */
export async function withAcademyFilter<T extends { eq: (column: string, value: any) => any }>(
  query: T
): Promise<T> {
  const academyId = await getCurrentAcademyId()
  
  if (academyId) {
    return query.eq('academy_id', academyId) as T
  }
  
  // If no academy context, return query as-is
  // This allows super admin queries to work
  return query
}

/**
 * Helper to ensure academy_id is set when inserting records
 */
export async function withAcademyInsert<T extends { insert: (data: any) => any }>(
  query: T,
  data: any
): Promise<any> {
  const academyId = await getCurrentAcademyId()
  
  if (academyId && !data.academy_id) {
    data.academy_id = academyId
  }
  
  return query.insert(data)
}
