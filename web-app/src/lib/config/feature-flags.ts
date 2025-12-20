/**
 * Feature Flag System
 * 
 * Provides unified feature flag management with:
 * - Database-based flags (per-client overrides)
 * - Environment variable fallback
 * - Type-safe access
 * - Caching for performance
 * 
 * Architecture: Single-Tenant Replicable
 * - Each client database can have its own feature flags
 * - Environment variables provide defaults
 * - Database flags override environment variables
 */

import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags as getEnvFeatureFlags } from './client-config';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  environment_override?: Record<string, boolean>;
}

let cachedFlags: Map<string, boolean> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000; // Cache for 1 minute

/**
 * Load feature flags from database
 */
async function loadDatabaseFlags(): Promise<Map<string, boolean>> {
  const supabase = await createClient();
  const flags = new Map<string, boolean>();

  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('key, enabled, environment_override');

    if (error) {
      // Table might not exist yet - that's okay, return empty map
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return flags;
      }
      console.warn('[FeatureFlags] Error loading flags from database:', error.message);
      return flags;
    }

    if (data) {
      const environment = process.env.NODE_ENV || 'development';
      
      for (const flag of data) {
        // Check for environment-specific override
        if (flag.environment_override && typeof flag.environment_override === 'object') {
          const envOverride = flag.environment_override[environment];
          if (typeof envOverride === 'boolean') {
            flags.set(flag.key, envOverride);
            continue;
          }
        }

        // Use database value
        flags.set(flag.key, flag.enabled);
      }
    }
  } catch (error) {
    console.warn('[FeatureFlags] Error loading flags:', (error as Error).message);
  }

  return flags;
}

/**
 * Get all feature flags (database + environment)
 * 
 * Priority:
 * 1. Database flags (if available)
 * 2. Environment variable flags
 */
async function getAllFlags(): Promise<Map<string, boolean>> {
  // Check cache
  const now = Date.now();
  if (cachedFlags && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedFlags;
  }

  // Load database flags
  const dbFlags = await loadDatabaseFlags();

  // Load environment flags
  const envFlags = getEnvFeatureFlags();
  const envFlagsMap = new Map<string, boolean>();
  for (const [key, value] of Object.entries(envFlags)) {
    envFlagsMap.set(key, value);
  }

  // Merge: database flags override environment flags
  const allFlags = new Map<string, boolean>();
  
  // Start with environment flags
  for (const [key, value] of envFlagsMap) {
    allFlags.set(key, value);
  }

  // Override with database flags
  for (const [key, value] of dbFlags) {
    allFlags.set(key, value);
  }

  // Cache result
  cachedFlags = allFlags;
  cacheTimestamp = now;

  return allFlags;
}

/**
 * Check if a feature flag is enabled
 * 
 * @param flagName Feature flag name (e.g., 'enableLateFees')
 * @returns true if feature is enabled
 */
export async function getFeatureFlag(flagName: string): Promise<boolean> {
  const flags = await getAllFlags();
  return flags.get(flagName) === true;
}

/**
 * Get multiple feature flags at once
 * 
 * @param flagNames Array of feature flag names
 * @returns Map of flag names to enabled status
 */
export async function getFeatureFlags(flagNames: string[]): Promise<Map<string, boolean>> {
  const allFlags = await getAllFlags();
  const result = new Map<string, boolean>();

  for (const name of flagNames) {
    result.set(name, allFlags.get(name) === true);
  }

  return result;
}

/**
 * Get all feature flags
 * 
 * @returns Map of all feature flags
 */
export async function getAllFeatureFlags(): Promise<Map<string, boolean>> {
  return getAllFlags();
}

/**
 * Clear feature flag cache (useful for testing or after updates)
 */
export function clearFeatureFlagCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}

/**
 * Set a feature flag in the database (admin function)
 * 
 * @param key Feature flag key
 * @param enabled Enabled status
 * @param description Optional description
 */
export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('feature_flags')
      .upsert(
        {
          key,
          enabled,
          description: description || null,
        },
        { onConflict: 'key' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    // Clear cache to force reload
    clearFeatureFlagCache();

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Convenience functions for common feature flags
 */

export async function isLateFeesEnabled(): Promise<boolean> {
  return getFeatureFlag('enable_late_fees');
}

export async function isSponsorSystemEnabled(): Promise<boolean> {
  return getFeatureFlag('enable_sponsor_system');
}

export async function isTournamentsEnabled(): Promise<boolean> {
  return getFeatureFlag('enable_tournaments');
}
