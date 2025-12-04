/**
 * Get the base URL for the application
 * Automatically detects if running locally or in production
 * Supports ngrok for local development with callbacks
 */

export function getBaseUrl(): string {
  // 1. Check if NEXT_PUBLIC_APP_URL is explicitly set (for production or ngrok)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // 2. In server-side code, try to detect from environment
  if (typeof window === 'undefined') {
    // Server-side: Check Vercel environment variables
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return `https://${vercelUrl}`;
    }

    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
      // Production fallback
      return 'https://sistema-adademia-de-futbol-tura.vercel.app';
    }
  }

  // 3. Client-side or local development
  if (typeof window !== 'undefined') {
    // Use the current origin (works for both localhost and production)
    return window.location.origin;
  }

  // 4. Default fallback for local development
  return 'http://localhost:3000';
}

/**
 * Get base URL from a NextRequest (for API routes)
 * Prioritizes headers from Vercel/proxy, then falls back to getBaseUrl()
 */
export function getBaseUrlFromRequest(request?: {
  headers: {
    get: (name: string) => string | null;
  };
  url?: string;
}): string {
  // First, try explicit environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (request) {
    // Try Vercel headers first (most reliable in production)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    // Try host header
    const host = request.headers.get('host');
    if (host) {
      const protocol = host.includes('localhost') || host.includes('127.0.0.1') 
        ? 'http' 
        : 'https';
      return `${protocol}://${host}`;
    }

    // Try origin header
    const origin = request.headers.get('origin');
    if (origin) {
      return origin;
    }

    // Try to extract from request URL
    if (request.url) {
      try {
        const url = new URL(request.url);
        return `${url.protocol}//${url.host}`;
      } catch {
        // Invalid URL, continue to fallback
      }
    }
  }

  // Fallback to the general getBaseUrl function
  return getBaseUrl();
}

