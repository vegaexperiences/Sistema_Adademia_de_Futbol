/**
 * Academy Logo Utilities
 * Provides functions to get academy-specific logos and favicons with fallbacks
 * 
 * These functions can work in both server and client contexts.
 * For server components, they will automatically fetch the current academy.
 * For client components, pass the academy object from context.
 */

import type { Academy } from './academy-types'

export type LogoSize = 'small' | 'medium' | 'large' | 'main'
export type FaviconSize = 16 | 32

/**
 * Helper to get current academy - always returns null in single-tenant mode
 * Components should use static logo URLs from environment or defaults
 */
async function getAcademyFromServer(): Promise<Academy | null> {
  // Single-tenant mode: no academy database queries
  return null
}

/**
 * Get logo URL for current academy
 * Falls back to main logo_url, then default logo.png
 * 
 * @param size - Logo size to retrieve
 * @param academy - Optional academy object. If not provided, will try to fetch from server context.
 */
export async function getAcademyLogo(size: LogoSize = 'main', academy?: Academy | null): Promise<string> {
  // If academy not provided, try to get it from server context (server components only)
  let currentAcademy = academy
  if (!currentAcademy) {
    currentAcademy = await getAcademyFromServer()
  }
  
  if (!currentAcademy) {
    return '/logo.png'
  }

  // Try to get the requested size
  let logoUrl: string | null = null
  
  switch (size) {
    case 'small':
      logoUrl = currentAcademy.logo_small_url
      break
    case 'medium':
      logoUrl = currentAcademy.logo_medium_url
      break
    case 'large':
      logoUrl = currentAcademy.logo_large_url
      break
    case 'main':
      logoUrl = currentAcademy.logo_url
      break
  }

  // If requested size not found, try fallback order: main -> large -> medium -> small -> default
  if (!logoUrl) {
    if (currentAcademy.logo_url) logoUrl = currentAcademy.logo_url
    else if (currentAcademy.logo_large_url) logoUrl = currentAcademy.logo_large_url
    else if (currentAcademy.logo_medium_url) logoUrl = currentAcademy.logo_medium_url
    else if (currentAcademy.logo_small_url) logoUrl = currentAcademy.logo_small_url
  }

  return logoUrl || '/logo.png'
}

/**
 * Get favicon URL for current academy
 * Falls back to main logo, then default favicon
 * 
 * @param size - Favicon size (16 or 32)
 * @param academy - Optional academy object. If not provided, will try to fetch from server context.
 */
export async function getAcademyFavicon(size: FaviconSize = 32, academy?: Academy | null): Promise<string> {
  // If academy not provided, try to get it from server context (server components only)
  let currentAcademy = academy
  if (!currentAcademy) {
    currentAcademy = await getAcademyFromServer()
  }
  
  if (!currentAcademy) {
    return size === 16 ? '/favicon-16x16.png' : '/favicon-32x32.png'
  }

  let faviconUrl: string | null = null
  
  if (size === 16) {
    faviconUrl = currentAcademy.favicon_16_url
  } else {
    faviconUrl = currentAcademy.favicon_32_url
  }

  // Fallback order: other favicon size -> main logo -> default
  if (!faviconUrl) {
    if (size === 16 && currentAcademy.favicon_32_url) {
      faviconUrl = currentAcademy.favicon_32_url
    } else if (size === 32 && currentAcademy.favicon_16_url) {
      faviconUrl = currentAcademy.favicon_16_url
    } else if (currentAcademy.logo_url) {
      faviconUrl = currentAcademy.logo_url
    } else if (currentAcademy.logo_small_url) {
      faviconUrl = currentAcademy.logo_small_url
    }
  }

  if (faviconUrl) {
    return faviconUrl
  }

  // Default fallback
  return size === 16 ? '/favicon-16x16.png' : '/favicon-32x32.png'
}

/**
 * Get Apple Touch Icon URL for current academy
 * Falls back to main logo, then default
 * 
 * @param academy - Optional academy object. If not provided, will try to fetch from server context.
 */
export async function getAcademyAppleTouchIcon(academy?: Academy | null): Promise<string> {
  // If academy not provided, try to get it from server context (server components only)
  let currentAcademy = academy
  if (!currentAcademy) {
    currentAcademy = await getAcademyFromServer()
  }
  
  if (!currentAcademy) {
    return '/apple-touch-icon.png'
  }

  if (currentAcademy.apple_touch_icon_url) {
    return currentAcademy.apple_touch_icon_url
  }

  // Fallback order: large logo -> main logo -> medium -> default
  if (currentAcademy.logo_large_url) {
    return currentAcademy.logo_large_url
  }
  if (currentAcademy.logo_url) {
    return currentAcademy.logo_url
  }
  if (currentAcademy.logo_medium_url) {
    return currentAcademy.logo_medium_url
  }

  return '/apple-touch-icon.png'
}

/**
 * Get all logo URLs for current academy
 * Useful for components that need multiple sizes
 * 
 * @param academy - Optional academy object. If not provided, will try to fetch from server context.
 */
export async function getAllAcademyLogos(academy?: Academy | null): Promise<{
  main: string
  small: string
  medium: string
  large: string
  favicon16: string
  favicon32: string
  appleTouchIcon: string
}> {
  const [main, small, medium, large, favicon16, favicon32, appleTouchIcon] = await Promise.all([
    getAcademyLogo('main', academy),
    getAcademyLogo('small', academy),
    getAcademyLogo('medium', academy),
    getAcademyLogo('large', academy),
    getAcademyFavicon(16, academy),
    getAcademyFavicon(32, academy),
    getAcademyAppleTouchIcon(academy),
  ])

  return {
    main,
    small,
    medium,
    large,
    favicon16,
    favicon32,
    appleTouchIcon,
  }
}

