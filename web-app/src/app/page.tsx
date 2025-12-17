'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page handler
 * 
 * This page handles special cases:
 * 1. Auth errors from Supabase (in hash fragment)
 * 2. Redirects to appropriate pages based on auth state
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check for auth errors in hash fragment (from Supabase redirects)
    const hash = window.location.hash;
    
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)); // Remove the #
      const error = params.get('error');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');
      
      if (error || errorCode) {
        console.log('[Root Page] Detected error in hash:', {
          error,
          errorCode,
          errorDescription,
        });
        
        // Redirect to forgot-password with error
        const message = errorDescription || error || 'Error en el enlace de verificación';
        router.replace(`/auth/forgot-password?error=${encodeURIComponent(message)}`);
        return;
      }
    }
    
    // No errors - redirect to login
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  );
}
