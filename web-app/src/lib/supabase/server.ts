import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
}

/**
 * Get current academy ID from request context
 * This is set by middleware based on the domain/subdomain
 */
export async function getCurrentAcademyId(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-academy-id')
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
