/**
 * Validates required environment variables on application startup
 */
export function validateEnv() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'BREVO_API_KEY',
  ];

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

  // Validate optional but recommended vars
  if (!process.env.BREVO_FROM_EMAIL) {
    console.warn('⚠️  BREVO_FROM_EMAIL no está configurada. Se usará un email por defecto.');
  }
}

// Validate on module load (only in server-side)
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

