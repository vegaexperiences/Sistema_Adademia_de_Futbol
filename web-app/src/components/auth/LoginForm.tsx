'use client';

import { useState, useRef } from 'react';
import { login } from '@/app/auth/actions';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingRef.current || loading) {
      console.warn('[LoginForm] Already submitting, ignoring duplicate call');
      return;
    }
    
    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const result = await login(formData);
      
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        isSubmittingRef.current = false;
      } else {
        // If success, redirect happens in action
        // Set a timeout to reset loading if redirect doesn't happen (shouldn't happen normally)
        setTimeout(() => {
          setLoading(false);
          isSubmittingRef.current = false;
        }, 5000);
      }
    } catch (error: any) {
      // Check if this is a redirect error - if so, it's expected
      if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message?.includes('NEXT_REDIRECT')) {
        // This is expected, redirect is happening
        return;
      }
      console.error('[LoginForm] Error:', error);
      setError('Error al iniciar sesión. Por favor intenta de nuevo.');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 mb-2">
            Correo Electrónico
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base font-medium"
            placeholder="tu@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base font-medium"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-red-800 text-sm font-semibold text-center">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end">
        <div className="text-sm">
          <a
            href="/auth/forgot-password"
            className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3.5 px-6 border border-transparent text-base font-bold rounded-xl text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-500/50"
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
          }}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-5 w-5" />
              <span>Ingresando...</span>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <span>Ingresar</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
