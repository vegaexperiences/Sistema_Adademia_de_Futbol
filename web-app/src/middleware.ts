import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // STEP 1: Check for routes that don't need academy context FIRST
  // This prevents any database queries or processing for these routes
  const isSuperAdminRoute = pathname.startsWith('/super-admin') || 
                           pathname.startsWith('/superadmin')
  const isDebugRoute = pathname.startsWith('/debug-test')
  const isExcludedRoute = isSuperAdminRoute || isDebugRoute
  
  // Log for debugging
  if (isExcludedRoute) {
    console.log('[Middleware] Early return for excluded route:', pathname)
  }
  
  // Early return for routes that don't need academy context
  if (isExcludedRoute) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extract domain from request
  const hostname = request.headers.get('host') || ''
  const domain = hostname.split(':')[0] // Remove port if present
  
  // Determine academy from domain
  let academySlug: string | null = null
  let academyId: string | null = null

  // Check if it's a custom domain or subdomain
  // Format: suarez.com, otra.com, or suarez.vercel.app, etc.
  const domainParts = domain.split('.')
  
  // STEP 2: Wrap academy detection in try-catch to prevent failures from blocking routes
  console.log('[Middleware] Processing route:', pathname, 'Domain:', domain)
  try {
    // If domain has 2 parts (suarez.com), the first part is the slug
    // If domain has 3+ parts (suarez.vercel.app), the first part is the slug
    if (domainParts.length >= 2) {
      const potentialSlug = domainParts[0]
      
      // Skip common subdomains like 'www', 'app', 'admin'
      if (!['www', 'app', 'admin', 'api'].includes(potentialSlug.toLowerCase())) {
        // Try to find academy by domain or slug
        const { data: academy, error: academyError } = await supabase
          .from('academies')
          .select('id, slug')
          .or(`domain.eq.${domain},slug.eq.${potentialSlug}`)
          .single()
        
        if (academy && !academyError) {
          academySlug = academy.slug
          academyId = academy.id
          console.log('[Middleware] Found academy:', academySlug, academyId)
        } else {
          console.log('[Middleware] No academy found for domain:', domain, 'Error:', academyError)
        }
      }
    }
  } catch (error) {
    // If academy detection fails, log but don't block the request
    console.error('[Middleware] Error detecting academy:', error)
    // Continue without academy context - let the route handle it
  }

  // If no academy found and accessing root domain, redirect to suarez
  if (!academyId) {
    // Check if accessing root without academy context
    const isRootDomain = domainParts.length === 2 && !domainParts[0].includes('.')
    
    if (isRootDomain || !academySlug) {
      console.log('[Middleware] No academy found, redirecting to suarez. Path:', pathname, 'IsRootDomain:', isRootDomain)
      // Redirect to suarez academy (default)
      const suarezUrl = new URL(request.url)
      suarezUrl.hostname = `suarez.${domainParts.slice(-2).join('.')}`
      return NextResponse.redirect(suarezUrl)
    }
  }
  
  console.log('[Middleware] Allowing request through. Path:', pathname, 'AcademyId:', academyId)

  // Store academy context in headers for server components
  if (academyId) {
    response.headers.set('x-academy-id', academyId)
    response.headers.set('x-academy-slug', academySlug || '')
  }

  // Store in cookies for client-side access
  if (academyId) {
    response.cookies.set('academy-id', academyId, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
    response.cookies.set('academy-slug', academySlug || '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - superadmin routes (excluded from middleware processing)
     * - debug-test route (excluded from middleware processing)
     */
    '/((?!_next/static|_next/image|favicon.ico|superadmin|debug-test|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

