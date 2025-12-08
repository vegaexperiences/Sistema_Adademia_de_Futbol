/**
 * Academy utility functions
 */

import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface Academy {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  settings: Record<string, any>
}

/**
 * Get current academy ID from headers (server-side)
 */
export async function getAcademyIdFromHeaders(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-academy-id')
}

/**
 * Get current academy slug from headers (server-side)
 */
export async function getAcademySlugFromHeaders(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-academy-slug')
}

/**
 * Get current academy from database (server-side)
 */
export async function getCurrentAcademy(): Promise<Academy | null> {
  const academyId = await getAcademyIdFromHeaders()
  const academySlug = await getAcademySlugFromHeaders()
  
  if (!academyId && !academySlug) {
    return null
  }

  const supabase = await createClient()
  
  const query = supabase
    .from('academies')
    .select('*')
    .single()
  
  if (academyId) {
    query.eq('id', academyId)
  } else if (academySlug) {
    query.eq('slug', academySlug)
  }
  
  const { data, error } = await query
  
  if (error || !data) {
    console.error('Error fetching academy:', error)
    return null
  }
  
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    domain: data.domain,
    logo_url: data.logo_url,
    primary_color: data.primary_color,
    secondary_color: data.secondary_color,
    settings: data.settings || {},
  }
}

/**
 * Get current academy ID from cookies (client-side)
 */
export function getAcademyIdFromCookies(): string | null {
  if (typeof window === 'undefined') return null
  
  const cookies = document.cookie.split('; ')
  const academyCookie = cookies.find(c => c.startsWith('academy-id='))
  
  if (!academyCookie) return null
  
  return academyCookie.split('=')[1]
}

/**
 * Get current academy slug from cookies (client-side)
 */
export function getAcademySlugFromCookies(): string | null {
  if (typeof window === 'undefined') return null
  
  const cookies = document.cookie.split('; ')
  const academyCookie = cookies.find(c => c.startsWith('academy-slug='))
  
  if (!academyCookie) return null
  
  return academyCookie.split('=')[1]
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  return true
}

