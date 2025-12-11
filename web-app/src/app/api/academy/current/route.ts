import { NextResponse } from 'next/server'
import { getCurrentAcademy } from '@/lib/utils/academy'
import { getCurrentAcademyId } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const academyId = await getCurrentAcademyId()
    console.log('[API /academy/current] Academy ID:', academyId)
    
    // Try to get academy using getCurrentAcademy first
    let academy = await getCurrentAcademy()
    
    // If that fails, try to get it directly using academyId from cookies
    if (!academy && academyId) {
      console.log('[API /academy/current] getCurrentAcademy returned null, trying direct query with academyId:', academyId)
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('academies')
        .select('*')
        .eq('id', academyId)
        .single()
      
      if (data && !error) {
        academy = {
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
      } else {
        console.error('[API /academy/current] Error fetching academy directly:', error)
      }
    }
    
    if (!academy) {
      console.warn('[API /academy/current] Academy not found. AcademyId was:', academyId)
      return NextResponse.json(
        { error: 'Academy not found', academyId },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ academy })
  } catch (error: any) {
    console.error('[API /academy/current] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    )
  }
}

