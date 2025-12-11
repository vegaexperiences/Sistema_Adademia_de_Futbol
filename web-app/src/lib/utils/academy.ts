/**
 * Academy utility functions (server-side only)
 * For client-side functions, see academy-client.ts
 */

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Academy as AcademyBase } from './academy-types'

// Re-export Academy type for backward compatibility
export type Academy = AcademyBase

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
  
  let query = supabase
    .from('academies')
    .select('*')
  
  if (academyId) {
    query = query.eq('id', academyId)
  } else if (academySlug) {
    query = query.eq('slug', academySlug)
  }
  
  const { data, error } = await query.single()
  
  if (error || !data) {
    console.error('Error fetching academy:', error)
    return null
  }
  
  return {
    id: data.id,
    name: data.name,
    display_name: data.display_name,
    slug: data.slug,
    domain: data.domain,
    logo_url: data.logo_url,
    logo_small_url: data.logo_small_url,
    logo_medium_url: data.logo_medium_url,
    logo_large_url: data.logo_large_url,
    favicon_16_url: data.favicon_16_url,
    favicon_32_url: data.favicon_32_url,
    apple_touch_icon_url: data.apple_touch_icon_url,
    primary_color: data.primary_color,
    secondary_color: data.secondary_color,
    settings: data.settings || {},
  }
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

