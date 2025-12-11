/**
 * Academy utility functions for client-side use
 * These functions don't use server-only imports
 */

import type { Academy } from './academy-types'

// Re-export Academy type for backward compatibility
export type { Academy }

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

