/**
 * Academy Type Definitions
 * Shared type definitions for Academy interface that can be used in both client and server contexts
 */

export interface Academy {
  id: string
  name: string
  display_name: string | null
  slug: string
  domain: string | null
  logo_url: string | null
  logo_small_url: string | null
  logo_medium_url: string | null
  logo_large_url: string | null
  favicon_16_url: string | null
  favicon_32_url: string | null
  apple_touch_icon_url: string | null
  primary_color: string | null
  secondary_color: string | null
  settings: Record<string, any>
}

