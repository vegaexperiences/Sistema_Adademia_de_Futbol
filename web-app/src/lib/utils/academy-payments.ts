/**
 * TEMPORARY STUB - Academy payment utilities
 * Single-tenant: returns env vars directly
 */

export async function getPagueloFacilConfig(academyId: string | null) {
  // Single-tenant: return env vars directly
  return {
    enabled: true,
    api_key: process.env.PAGUELOFACIL_API_KEY || '',
    merchant_id: process.env.PAGUELOFACIL_MERCHANT_ID || '',
    environment: (process.env.PAGUELOFACIL_ENVIRONMENT || 'testing') as 'testing' | 'production',
  };
}

export async function getYappyConfig(academyId: string | null) {
  // Single-tenant: return env vars directly
  return {
    enabled: true,
    merchant_id: process.env.YAPPY_MERCHANT_ID || '',
    secret_key: process.env.YAPPY_SECRET_KEY || '',
    domain_url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    environment: (process.env.YAPPY_ENVIRONMENT || 'testing') as 'testing' | 'production',
  };
}


