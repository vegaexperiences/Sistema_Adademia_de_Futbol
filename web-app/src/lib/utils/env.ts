/**
 * Validates required environment variables on application startup
 * 
 * DEPRECATED: Use getClientConfig() from '@/lib/config/client-config' instead
 * This function is kept for backward compatibility during migration
 * 
 * @deprecated Use getClientConfig() for centralized configuration
 */
export function validateEnv() {
  const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  const missing: string[] = [];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    );
  }

  // Optional but recommended vars
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️  BREVO_API_KEY no está configurada. Los envíos de correo fallarán hasta que se agregue.');
  }

  if (!process.env.BREVO_FROM_EMAIL) {
    console.warn('⚠️  BREVO_FROM_EMAIL no está configurada. Se usará un email por defecto.');
  }

  // PagueloFacil credentials (optional - only needed if using PagueloFacil payments)
  if (!process.env.PAGUELOFACIL_ACCESS_TOKEN || !process.env.PAGUELOFACIL_CCLW) {
    console.warn('⚠️  PAGUELOFACIL_ACCESS_TOKEN y PAGUELOFACIL_CCLW no están configuradas. Los pagos con Paguelo Fácil no funcionarán.');
  }
}

// Validate on module load (only in server-side)
// Note: New code should use getClientConfig() which includes validation
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (error) {
    // Only throw in production to prevent dev issues
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.warn('⚠️  Environment validation failed:', (error as Error).message);
    }
  }
}

