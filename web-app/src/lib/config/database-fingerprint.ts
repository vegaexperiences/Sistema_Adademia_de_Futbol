/**
 * Database Fingerprinting System
 * 
 * Generates and validates unique fingerprints for each database instance
 * to prevent accidental cross-client operations (e.g., running migrations on wrong database).
 * 
 * Architecture: Single-Tenant Replicable
 * - Each database gets a unique fingerprint
 * - Fingerprint is stable (doesn't change over time)
 * - Used to validate operations before execution
 */

import { createClient } from '@supabase/supabase-js';
import { getDatabaseConfig } from './client-config';
import crypto from 'crypto';

export interface DatabaseFingerprint {
  fingerprint: string;
  projectUrl: string;
  firstUserId?: string;
  firstRecordTimestamp?: string;
  createdAt: string;
}

/**
 * Generate a stable fingerprint for the current database
 * 
 * Uses:
 * - Supabase project URL (always unique per project)
 * - First user ID (if exists, stable identifier)
 * - First record timestamp (if exists, stable identifier)
 * 
 * Returns a SHA256 hash that uniquely identifies this database
 */
export async function getDatabaseFingerprint(): Promise<string> {
  const config = getDatabaseConfig();
  
  // Create admin client for fingerprinting (needs to read auth.users)
  const adminClient = createClient(
    config.url,
    config.serviceRoleKey || config.anonKey, // Use service role if available
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Get project URL (extract from Supabase URL)
  const projectUrl = config.url;

  // Try to get first user ID (stable identifier)
  let firstUserId: string | undefined;
  try {
    const { data: users } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (users?.users && users.users.length > 0) {
      firstUserId = users.users[0].id;
    }
  } catch (error) {
    // If we can't access users, that's okay - use other identifiers
    console.warn('[Fingerprint] Could not access users:', (error as Error).message);
  }

  // Try to get first record timestamp from a stable table (players or families)
  let firstRecordTimestamp: string | undefined;
  try {
    const { data: players } = await adminClient
      .from('players')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (players?.created_at) {
      firstRecordTimestamp = players.created_at;
    } else {
      // Try families table
      const { data: families } = await adminClient
        .from('families')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (families?.created_at) {
        firstRecordTimestamp = families.created_at;
      }
    }
  } catch (error) {
    // If tables don't exist yet, that's okay
    console.warn('[Fingerprint] Could not access records:', (error as Error).message);
  }

  // Generate fingerprint from stable identifiers
  const fingerprintData = {
    projectUrl,
    firstUserId,
    firstRecordTimestamp,
  };

  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintData))
    .digest('hex');

  return fingerprint;
}

/**
 * Store fingerprint in database (in system_versions table or separate fingerprint table)
 * 
 * This allows verification that we're operating on the correct database
 */
export async function storeDatabaseFingerprint(fingerprint: string): Promise<void> {
  const config = getDatabaseConfig();
  const client = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Try to store in a fingerprint table, or use system_versions metadata
  // For now, we'll use a settings-like approach
  try {
    // Store fingerprint in settings table (if exists) or create a simple fingerprint record
    const { error } = await client
      .from('settings')
      .upsert(
        {
          key: 'database_fingerprint',
          value: fingerprint,
          description: 'Unique database fingerprint for migration safety',
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.warn('[Fingerprint] Could not store fingerprint in settings:', error.message);
      // Fallback: just log it
      console.log('[Fingerprint] Current database fingerprint:', fingerprint);
    }
  } catch (error) {
    console.warn('[Fingerprint] Could not store fingerprint:', (error as Error).message);
  }
}

/**
 * Get stored fingerprint from database
 */
export async function getStoredFingerprint(): Promise<string | null> {
  const config = getDatabaseConfig();
  const client = createClient(config.url, config.serviceRoleKey || config.anonKey);

  try {
    const { data, error } = await client
      .from('settings')
      .select('value')
      .eq('key', 'database_fingerprint')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.value as string;
  } catch (error) {
    return null;
  }
}

/**
 * Validate that current database fingerprint matches expected
 * 
 * @param expectedFingerprint Expected fingerprint (from environment or config)
 * @returns true if fingerprint matches, false otherwise
 */
export async function validateDatabaseFingerprint(
  expectedFingerprint?: string
): Promise<{ valid: boolean; current: string; expected?: string; error?: string }> {
  try {
    const currentFingerprint = await getDatabaseFingerprint();

    // If expected fingerprint provided, validate against it
    if (expectedFingerprint) {
      const valid = currentFingerprint === expectedFingerprint;
      return {
        valid,
        current: currentFingerprint,
        expected: expectedFingerprint,
        error: valid ? undefined : 'Database fingerprint mismatch - wrong database detected',
      };
    }

    // Otherwise, check if stored fingerprint matches
    const storedFingerprint = await getStoredFingerprint();
    if (storedFingerprint) {
      const valid = currentFingerprint === storedFingerprint;
      return {
        valid,
        current: currentFingerprint,
        expected: storedFingerprint,
        error: valid ? undefined : 'Database fingerprint changed - possible database swap detected',
      };
    }

    // No stored fingerprint - first run, store it
    await storeDatabaseFingerprint(currentFingerprint);
    return {
      valid: true,
      current: currentFingerprint,
    };
  } catch (error) {
    return {
      valid: false,
      current: '',
      error: (error as Error).message,
    };
  }
}
