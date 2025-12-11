/**
 * Academy Branding Utilities
 * Provides functions to get academy-specific branding (display name, navigation labels)
 * 
 * These functions can work in both server and client contexts.
 * For server components, they will automatically fetch the current academy.
 * For client components, pass the academy object from context.
 */

import type { Academy } from './academy-types'

/**
 * Helper to get current academy from server context (server components only)
 * This avoids importing academy.ts which has next/headers dependency
 * Uses fully dynamic imports to avoid bundling server-only code
 */
async function getAcademyFromServer(): Promise<Academy | null> {
  try {
    // Use fully dynamic imports to avoid bundling server-only code
    // This ensures the module is only loaded at runtime in server components
    const headersModule = await import('next/headers')
    const supabaseModule = await import('@/lib/supabase/server')
    
    const headersList = await headersModule.headers()
    const academyId = headersList.get('x-academy-id')
    const academySlug = headersList.get('x-academy-slug')
    
    if (!academyId && !academySlug) {
      return null
    }
    
    const supabase = await supabaseModule.createClient()
    
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
  } catch (e) {
    // If this fails (client component or other error), return null
    return null
  }
}

export interface NavigationLabels {
  home?: string
  enrollment?: string
  tournaments?: string
  access?: string
  dashboard?: string
  approvals?: string
  players?: string
  finances?: string
  tutors?: string
  families?: string
  reports?: string
  emails?: string
  settings?: string
}

// Default navigation labels (Spanish)
const DEFAULT_NAVIGATION_LABELS: Record<string, string> = {
  home: 'Inicio',
  enrollment: 'Matrícula',
  tournaments: 'Torneos',
  access: 'Acceso',
  dashboard: 'Dashboard',
  approvals: 'Aprobaciones',
  players: 'Jugadores',
  finances: 'Finanzas',
  tutors: 'Tutores',
  families: 'Familias',
  reports: 'Reportes',
  emails: 'Correos',
  settings: 'Configuración',
}

/**
 * Get display name for current academy
 * Falls back to name if display_name is not set
 * 
 * @param academy - Optional academy object. If not provided, will try to fetch from server context.
 */
export async function getAcademyDisplayName(academy?: Academy | null): Promise<string> {
  // If academy not provided, try to get it from server context (server components only)
  let currentAcademy = academy
  if (!currentAcademy) {
    currentAcademy = await getAcademyFromServer()
  }
  
  if (!currentAcademy) {
    return 'SUAREZ ACADEMY'
  }

  return currentAcademy.display_name || currentAcademy.name
}

/**
 * Get navigation label for a specific key
 * Falls back to default label if not customized
 * 
 * @param key - Navigation key (e.g., 'home', 'enrollment', etc.)
 * @param academy - Optional academy object. If not provided, will try to fetch from server context.
 */
export async function getNavigationLabel(key: string, academy?: Academy | null): Promise<string> {
  // If academy not provided, try to get it from server context (server components only)
  let currentAcademy = academy
  if (!currentAcademy) {
    currentAcademy = await getAcademyFromServer()
  }
  
  if (!currentAcademy) {
    return DEFAULT_NAVIGATION_LABELS[key] || key
  }

  const customLabels = currentAcademy.settings?.navigation as NavigationLabels | undefined
  
  if (customLabels && customLabels[key as keyof NavigationLabels]) {
    return customLabels[key as keyof NavigationLabels]!
  }

  return DEFAULT_NAVIGATION_LABELS[key] || key
}

/**
 * Get all navigation labels for current academy
 * 
 * @param academy - Optional academy object. If not provided, will try to fetch from server context.
 */
export async function getAllNavigationLabels(academy?: Academy | null): Promise<Record<string, string>> {
  const labels: Record<string, string> = {}
  
  // Get all default keys
  const keys = Object.keys(DEFAULT_NAVIGATION_LABELS)
  
  for (const key of keys) {
    labels[key] = await getNavigationLabel(key, academy)
  }
  
  return labels
}

