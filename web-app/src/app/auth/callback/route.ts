import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth Callback Handler
 * 
 * This route handles OAuth and email verification callbacks from Supabase Auth.
 * It's used for:
 * - Password reset flows
 * - Email confirmations
 * - OAuth provider callbacks
 * 
 * Multi-Academy Support:
 * - Works for any academy domain automatically
 * - Preserves the origin domain throughout the flow
 * - No hardcoded URLs - fully dynamic
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/auth/reset-password'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Log for debugging
  console.log('[Auth Callback] Processing callback', {
    hasCode: !!code,
    next,
    error,
    errorDescription,
    origin: requestUrl.origin,
  })

  // Handle error from Supabase
  if (error) {
    console.error('[Auth Callback] Error from Supabase:', {
      error,
      errorDescription,
    })
    
    // Redirect to login with error message
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient()
    
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('[Auth Callback] Error exchanging code for session:', exchangeError)
        
        // Redirect to login with error
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent('Error al procesar el enlace de verificación. Por favor intenta de nuevo.')}`
        )
      }
      
      console.log('[Auth Callback] Successfully exchanged code for session')
      
      // Successful authentication - redirect to next page
      // This will typically be /auth/reset-password for password reset flows
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
      
    } catch (error: any) {
      console.error('[Auth Callback] Unexpected error:', error)
      
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('Error inesperado. Por favor intenta de nuevo.')}`
      )
    }
  }

  // No code provided - invalid callback
  console.warn('[Auth Callback] No code provided in callback')
  
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=${encodeURIComponent('Enlace de verificación inválido.')}`
  )
}
