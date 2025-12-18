import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Routes that don't need any processing
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
  
  // IMMEDIATE return for excluded routes
  if (isExcludedRoute) {
    return NextResponse.next()
  }

  // Protect dashboard routes - require authentication
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

  // Single-tenant mode: No academy detection needed
  // Just pass through the request
  const response = NextResponse.next()
  
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
