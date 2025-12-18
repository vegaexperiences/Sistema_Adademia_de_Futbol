import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Single-tenant mode: Return default/static academy info
  return NextResponse.json({
    academy: {
      id: 'default',
      name: process.env.NEXT_PUBLIC_ACADEMY_NAME || 'Suarez Academy',
      display_name: process.env.NEXT_PUBLIC_ACADEMY_DISPLAY_NAME || 'Suarez Academy',
      slug: 'suarez',
      domain: null,
      logo_url: process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png',
      logo_small_url: null,
      logo_medium_url: null,
      logo_large_url: null,
      favicon_16_url: null,
      favicon_32_url: null,
      apple_touch_icon_url: null,
      primary_color: null,
      secondary_color: null,
      settings: {},
    }
  })
}

