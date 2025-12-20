/**
 * Centralized Client Configuration Manager
 * 
 * Provides typed, validated access to all environment variables and configuration.
 * This layer abstracts direct process.env access for better maintainability and
 * enables per-client configuration overrides in the future.
 * 
 * Architecture: Single-Tenant Replicable
 * - Each deployment (Vercel project) has its own environment variables
 * - Each deployment connects to its own Supabase project (isolated database)
 * - Configuration is validated on startup with clear error messages
 */

import { z } from 'zod';

// ============================================================================
// Configuration Schemas (Zod for validation)
// ============================================================================

const DatabaseConfigSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
  serviceRoleKey: z.string().min(1).optional(),
});

const YappyConfigSchema = z.object({
  merchantId: z.string().min(1),
  secretKey: z.string().min(1),
  domainUrl: z.string().min(1),
  environment: z.enum(['production', 'testing']).default('production'),
}).optional();

const PagueloFacilConfigSchema = z.object({
  accessToken: z.string().min(1),
  cclw: z.string().min(1),
  sandbox: z.boolean().default(false),
}).optional();

const BrevoConfigSchema = z.object({
  apiKey: z.string().min(1),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
  webhookSecret: z.string().optional(),
});

const ApplicationConfigSchema = z.object({
  siteUrl: z.string().url(),
  academyName: z.string().default('Academia'),
  academyLogo: z.string().default('/logo.png'),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

const FeatureFlagsSchema = z.object({
  enableLateFees: z.boolean().default(false),
  enableSponsorSystem: z.boolean().default(true),
  enableTournaments: z.boolean().default(true),
}).passthrough(); // Allow additional feature flags

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DatabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export interface YappyConfig {
  merchantId: string;
  secretKey: string;
  domainUrl: string;
  environment: 'production' | 'testing';
}

export interface PagueloFacilConfig {
  accessToken: string;
  cclw: string;
  sandbox: boolean;
}

export interface BrevoConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  webhookSecret?: string;
}

export interface ApplicationConfig {
  siteUrl: string;
  academyName: string;
  academyLogo: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface FeatureFlags {
  enableLateFees: boolean;
  enableSponsorSystem: boolean;
  enableTournaments: boolean;
  [key: string]: boolean; // Allow additional feature flags
}

export interface ClientConfig {
  database: DatabaseConfig;
  payments: {
    yappy?: YappyConfig;
    paguelofacil?: PagueloFacilConfig;
  };
  email: {
    brevo: BrevoConfig;
  };
  application: ApplicationConfig;
  features: FeatureFlags;
}

// ============================================================================
// Configuration Loader
// ============================================================================

let cachedConfig: ClientConfig | null = null;

/**
 * Get the base URL for the application
 * Checks multiple env vars in order of preference
 */
function getBaseUrl(): string {
  // Check explicit URL first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // In Vercel, use auto-detected URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  throw new Error(
    'Base URL not configured. Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL'
  );
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): ClientConfig {
  // Validate required database config
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const databaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!databaseUrl || !databaseAnonKey) {
    throw new Error(
      'Missing required database configuration:\n' +
      '  - NEXT_PUBLIC_SUPABASE_URL\n' +
      '  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
      'Please check your environment variables.'
    );
  }

  const database: DatabaseConfig = {
    url: databaseUrl,
    anonKey: databaseAnonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  // Validate database config schema
  DatabaseConfigSchema.parse(database);

  // Load Yappy config (optional)
  const yappyMerchantId = process.env.YAPPY_MERCHANT_ID?.trim();
  const yappySecretKey = process.env.YAPPY_SECRET_KEY?.trim();
  const yappyDomainUrl = (process.env.YAPPY_DOMAIN_URL || process.env.NEXT_PUBLIC_APP_URL || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .trim();

  let yappy: YappyConfig | undefined;
  if (yappyMerchantId && yappySecretKey && yappyDomainUrl) {
    yappy = {
      merchantId: yappyMerchantId,
      secretKey: yappySecretKey,
      domainUrl: yappyDomainUrl,
      environment: (process.env.YAPPY_ENVIRONMENT || 'production') as 'production' | 'testing',
    };
    // Validate schema
    YappyConfigSchema.parse(yappy);
  }

  // Load PagueloFácil config (optional)
  const paguelofacilAccessToken = process.env.PAGUELOFACIL_ACCESS_TOKEN?.trim();
  const paguelofacilCclw = process.env.PAGUELOFACIL_CCLW?.trim();
  
  let paguelofacil: PagueloFacilConfig | undefined;
  if (paguelofacilAccessToken && paguelofacilCclw) {
    paguelofacil = {
      accessToken: paguelofacilAccessToken.replace(/[^\x20-\x7E]/g, ''), // Clean non-ASCII
      cclw: paguelofacilCclw.replace(/[^\x20-\x7E]/g, ''), // Clean non-ASCII
      sandbox: process.env.PAGUELOFACIL_SANDBOX === 'true',
    };
  }

  // Validate required Brevo config
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoFromEmail = process.env.BREVO_FROM_EMAIL || process.env.BREVO_DEFAULT_SENDER_EMAIL;
  const brevoFromName = process.env.BREVO_FROM_NAME || process.env.BREVO_DEFAULT_SENDER_NAME || 'Academia';

  if (!brevoApiKey) {
    console.warn('⚠️  BREVO_API_KEY not configured. Email sending will fail.');
  }

  if (!brevoFromEmail) {
    console.warn('⚠️  BREVO_FROM_EMAIL not configured. Default email will be used.');
  }

  const brevo: BrevoConfig = {
    apiKey: brevoApiKey || '',
    fromEmail: brevoFromEmail || 'noreply@academy.com',
    fromName: brevoFromName,
    webhookSecret: process.env.BREVO_WEBHOOK_SECRET,
  };

  // Brevo is required, but we allow graceful degradation
  if (brevoApiKey) {
    BrevoConfigSchema.parse(brevo);
  }

  // Application config
  const siteUrl = getBaseUrl();
  const application: ApplicationConfig = {
    siteUrl,
    academyName: process.env.NEXT_PUBLIC_ACADEMY_NAME || 'Academia',
    academyLogo: process.env.NEXT_PUBLIC_ACADEMY_LOGO || process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png',
    contactPhone: process.env.ACADEMY_CONTACT_PHONE,
    contactEmail: process.env.ACADEMY_CONTACT_EMAIL,
  };

  ApplicationConfigSchema.parse(application);

  // Feature flags (from env vars, can be overridden by database)
  const features: FeatureFlags = {
    enableLateFees: process.env.FEATURE_ENABLE_LATE_FEES === 'true',
    enableSponsorSystem: process.env.FEATURE_ENABLE_SPONSOR_SYSTEM !== 'false', // Default true
    enableTournaments: process.env.FEATURE_ENABLE_TOURNAMENTS !== 'false', // Default true
  };

  const config: ClientConfig = {
    database,
    payments: {
      yappy,
      paguelofacil,
    },
    email: {
      brevo,
    },
    application,
    features,
  };

  // Log configuration loaded (without secrets)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Config] Configuration loaded:', {
      database: {
        url: database.url,
        hasAnonKey: !!database.anonKey,
        hasServiceRoleKey: !!database.serviceRoleKey,
      },
      payments: {
        yappy: yappy ? { hasConfig: true, environment: yappy.environment } : { hasConfig: false },
        paguelofacil: paguelofacil ? { hasConfig: true, sandbox: paguelofacil.sandbox } : { hasConfig: false },
      },
      email: {
        brevo: { hasApiKey: !!brevo.apiKey, fromEmail: brevo.fromEmail },
      },
      application: {
        siteUrl: application.siteUrl,
        academyName: application.academyName,
      },
      features,
    });
  }

  return config;
}

/**
 * Get client configuration (cached, validated)
 * 
 * @throws Error if required configuration is missing
 */
export function getClientConfig(): ClientConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Clear cached configuration (useful for testing or config reload)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  return getClientConfig().database;
}

/**
 * Get Yappy payment configuration
 * 
 * @throws Error if Yappy is not configured
 */
export function getYappyConfig(): YappyConfig {
  const config = getClientConfig();
  if (!config.payments.yappy) {
    throw new Error(
      'Yappy payment provider not configured. ' +
      'Set YAPPY_MERCHANT_ID, YAPPY_SECRET_KEY, and YAPPY_DOMAIN_URL environment variables.'
    );
  }
  return config.payments.yappy;
}

/**
 * Get PagueloFácil payment configuration
 * 
 * @throws Error if PagueloFácil is not configured
 */
export function getPagueloFacilConfig(): PagueloFacilConfig {
  const config = getClientConfig();
  if (!config.payments.paguelofacil) {
    throw new Error(
      'PagueloFácil payment provider not configured. ' +
      'Set PAGUELOFACIL_ACCESS_TOKEN and PAGUELOFACIL_CCLW environment variables.'
    );
  }
  return config.payments.paguelofacil;
}

/**
 * Get Brevo email configuration
 */
export function getBrevoConfig(): BrevoConfig {
  return getClientConfig().email.brevo;
}

/**
 * Get application configuration
 */
export function getApplicationConfig(): ApplicationConfig {
  return getClientConfig().application;
}

/**
 * Check if a feature flag is enabled
 * 
 * @param flagName Feature flag name (e.g., 'enableLateFees')
 * @returns true if feature is enabled
 */
export function isFeatureEnabled(flagName: string): boolean {
  const config = getClientConfig();
  return config.features[flagName] === true;
}

/**
 * Get all feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return getClientConfig().features;
}

// ============================================================================
// Validation Helper (for startup validation)
// ============================================================================

/**
 * Validate configuration and return errors if any
 * Useful for startup validation without throwing
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const config = getClientConfig();

    // Validate database
    if (!config.database.url || !config.database.anonKey) {
      errors.push('Database configuration incomplete');
    }

    // Validate email (warn only, not required for basic functionality)
    if (!config.email.brevo.apiKey) {
      errors.push('BREVO_API_KEY not set - email functionality will not work');
    }

    // Validate payments (optional)
    if (!config.payments.yappy && !config.payments.paguelofacil) {
      console.warn('⚠️  No payment providers configured. Payment features will not work.');
    }

  } catch (error) {
    errors.push((error as Error).message);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
