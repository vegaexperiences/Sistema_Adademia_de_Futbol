import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // STEP 1: Check for routes that don't need academy context FIRST
  // This prevents any database queries or processing for these routes
  // CRITICAL: This check must happen before ANY other processing
  const isSuperAdminRoute = pathname.startsWith('/super-admin') || 
                           pathname.startsWith('/superadmin')
  const isDebugRoute = pathname.startsWith('/debug-test') || 
                      pathname.startsWith('/test-simple') ||
                      pathname.startsWith('/test-working') ||
                      pathname.startsWith('/test-no-dynamic') ||
                      pathname.startsWith('/test-api-route') ||
                      pathname.startsWith('/test-minimal')
  const isAuthRoute = pathname.startsWith('/login') || 
                     pathname.startsWith('/auth') ||
                     pathname.startsWith('/enrollment')
  const isExcludedRoute = isSuperAdminRoute || isDebugRoute || isAuthRoute
  
  // IMMEDIATE return for excluded routes - no processing, no logging, nothing
  // This ensures Next.js can process these routes without any interference
  if (isExcludedRoute) {
    return NextResponse.next()
  }

  // STEP 2: Protect dashboard routes - require authentication
  // This must happen BEFORE any Supabase client creation for academy detection
  if (pathname.startsWith('/dashboard')) {
    // Create minimal Supabase client just for auth check
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // For auth check, we don't need to set cookies
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    // If no user or auth error, redirect to login
    if (authError || !user) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware (for academy detection)
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

  // Refresh session if expired (for academy detection context)
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
  const isVercelDomain = domain.includes('vercel.app') || domain.includes('vercel.com')
  
  // STEP 2: Wrap academy detection in try-catch to prevent failures from blocking routes
  console.log('[Middleware] Processing route:', pathname, 'Domain:', domain)
  try {
    // First, try to find academy by exact domain match (for custom domains)
    if (domainParts.length >= 2) {
      const { data: academyByDomain, error: domainError } = await supabase
        .from('academies')
        .select('id, slug, domain_status')
        .eq('domain', domain)
        .maybeSingle()
      
      if (academyByDomain && !domainError) {
        // Found by exact domain match
        academySlug = academyByDomain.slug
        academyId = academyByDomain.id
        console.log('[Middleware] Found academy by domain:', academySlug, academyId, 'Status:', academyByDomain.domain_status)
      } else {
        // If not found by domain, try by slug (for subdomain access)
        // This allows access via {slug}.vercel.app even if custom domain is pending
        const potentialSlug = domainParts[0]
        
        // Skip common subdomains like 'www', 'app', 'admin'
        if (!['www', 'app', 'admin', 'api'].includes(potentialSlug.toLowerCase())) {
          // Try to find academy by slug
          const { data: academyBySlug, error: slugError } = await supabase
            .from('academies')
            .select('id, slug, domain_status')
            .eq('slug', potentialSlug)
            .maybeSingle()
          
          if (academyBySlug && !slugError) {
            // Found by slug - this works for Vercel subdomains and allows temporary access
            academySlug = academyBySlug.slug
            academyId = academyBySlug.id
            console.log('[Middleware] Found academy by slug:', academySlug, academyId, 'Domain status:', academyBySlug.domain_status)
          } else {
            console.log('[Middleware] No academy found for domain:', domain, 'Slug:', potentialSlug, 'Error:', slugError)
          }
        }
      }
    }
  } catch (error) {
    // If academy detection fails, log but don't block the request
    console.error('[Middleware] Error detecting academy:', error)
    // Continue without academy context - let the route handle it
  }

  // If no academy found and accessing root domain, redirect to suarez
  // BUT: Don't redirect if this is a route that doesn't need academy context
  // IMPORTANT: Only redirect if we're on a custom domain, not on Vercel preview domains
  if (!academyId) {
    // Check if accessing root without academy context
    const isRootDomain = domainParts.length === 2 && !domainParts[0].includes('.')
    const isVercelDomain = domain.includes('vercel.app') || domain.includes('vercel.com')
    
    // Only redirect if:
    // 1. Not an excluded route
    // 2. Is a root domain (not a subdomain)
    // 3. NOT a Vercel domain (to avoid breaking preview deployments)
    // 4. No academy slug found
    if (!isExcludedRoute && isRootDomain && !isVercelDomain && !academySlug) {
      console.log('[Middleware] No academy found, redirecting to suarez. Path:', pathname, 'Domain:', domain)
      // Redirect to suarez academy (default)
      const suarezUrl = new URL(request.url)
      suarezUrl.hostname = `suarez.${domainParts.slice(-2).join('.')}`
      return NextResponse.redirect(suarezUrl)
    } else {
      // On Vercel domains or when academy not found, just continue without redirect
      console.log('[Middleware] No academy found but allowing request. Path:', pathname, 'Domain:', domain, 'IsVercel:', isVercelDomain)
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
     * - image files
     * 
     * CRITICAL: We now include ALL routes in the matcher, including debug routes.
     * The middleware will handle them with early returns, which allows Vercel
     * to recognize them as valid routes while still skipping processing.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

