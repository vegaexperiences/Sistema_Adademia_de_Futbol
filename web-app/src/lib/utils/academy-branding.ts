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
 * Helper to get current academy - always returns null in single-tenant mode
 * Components should use static branding from environment or defaults
 */
async function getAcademyFromServer(): Promise<Academy | null> {
  // Single-tenant mode: no academy database queries
  return null
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

