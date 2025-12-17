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
  
  // Try to get parameters from both query string and hash fragment
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/auth/reset-password'
  const error = requestUrl.searchParams.get('error')
  const error_code = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Log for debugging
  console.log('[Auth Callback] Processing callback', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    error,
    error_code,
    errorDescription,
    origin: requestUrl.origin,
    fullUrl: requestUrl.toString(),
  })

  // Handle error from Supabase
  if (error || error_code) {
    console.error('[Auth Callback] Error from Supabase:', {
      error,
      error_code,
      errorDescription,
    })
    
    // Provide specific error messages
    let userMessage = errorDescription || error || 'Error al procesar el enlace'
    
    if (error_code === 'otp_expired') {
      userMessage = 'El enlace de recuperación ha expirado. Por favor solicita uno nuevo.'
    }
    
    // Redirect to forgot-password page with error message
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent(userMessage)}`
    )
  }

  // Handle PKCE flow (code exchange)
  if (code) {
    const supabase = await createClient()
    
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('[Auth Callback] Error exchanging code for session:', exchangeError)
        
        // Redirect to forgot-password with error
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent('El enlace ha expirado. Por favor solicita uno nuevo.')}`
        )
      }
      
      console.log('[Auth Callback] Successfully exchanged code for session')
      
      // Successful authentication - redirect to next page
      // This will typically be /auth/reset-password for password reset flows
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
      
    } catch (error: any) {
      console.error('[Auth Callback] Unexpected error:', error)
      
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent('Error inesperado. Por favor intenta de nuevo.')}`
      )
    }
  }

  // Handle token_hash flow (older Supabase flow for email links)
  if (token_hash && type) {
    console.log('[Auth Callback] Using token_hash flow (magiclink/recovery)')
    
    const supabase = await createClient()
    
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })
      
      if (verifyError) {
        console.error('[Auth Callback] Error verifying OTP:', verifyError)
        
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent('El enlace ha expirado. Por favor solicita uno nuevo.')}`
        )
      }
      
      console.log('[Auth Callback] Successfully verified OTP')
      
      // Successful authentication - redirect to next page
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
      
    } catch (error: any) {
      console.error('[Auth Callback] Unexpected error in OTP verification:', error)
      
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent('Error al verificar el enlace. Por favor intenta de nuevo.')}`
      )
    }
  }

  // No code or token_hash provided - invalid callback
  console.warn('[Auth Callback] No code or token_hash provided in callback')
  
  return NextResponse.redirect(
    `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent('Enlace de verificación inválido. Por favor solicita uno nuevo.')}`
  )
}
