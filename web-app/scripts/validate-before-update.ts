#!/usr/bin/env tsx
/**
 * Pre-Update Validation Script
 * 
 * Validates system state before applying updates/migrations.
 * Checks:
 * - Database version compatibility
 * - Backup existence
 * - Configuration validity
 * - Database connection health
 * 
 * Usage:
 *   tsx scripts/validate-before-update.ts [--skip-backup-check]
 */

import { createClient } from '@supabase/supabase-js';
import { getDatabaseConfig, validateConfig } from '../src/lib/config/client-config';
import { validateDatabaseFingerprint } from '../src/lib/config/database-fingerprint';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if backup exists
 */
function checkBackupExists(): { exists: boolean; location?: string } {
  const backupsDir = join(process.cwd(), '.backups');
  
  if (!existsSync(backupsDir)) {
    return { exists: false };
  }

  // Check for recent backup files
  try {
    const files = readdirSync(backupsDir);
    const backupFiles = files.filter(f => f.startsWith('backup_') && f.endsWith('.json'));
    
    if (backupFiles.length === 0) {
      return { exists: false };
    }

    // Get most recent backup
    const mostRecent = backupFiles.sort().reverse()[0];
    return {
      exists: true,
      location: join(backupsDir, mostRecent),
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Check database version
 */
async function checkDatabaseVersion(client: any): Promise<{ version: string | null; error?: string }> {
  try {
    const { data, error } = await client
      .from('system_versions')
      .select('version')
      .eq('status', 'applied')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return { version: null }; // No versioning system yet
      }
      return { version: null, error: error.message };
    }

    return { version: data?.version || null };
  } catch (error) {
    return { version: null, error: (error as Error).message };
  }
}

/**
 * Check database connection health
 */
async function checkDatabaseHealth(client: any): Promise<{ healthy: boolean; error?: string }> {
  try {
    // Simple query to test connection
    const { error } = await client.from('settings').select('key').limit(1);
    
    if (error) {
      // Table might not exist, but connection should work
      if (error.code === 'PGRST116') {
        return { healthy: true }; // Connection works, table doesn't exist (acceptable)
      }
      return { healthy: false, error: error.message };
    }

    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const skipBackupCheck = args.includes('--skip-backup-check');

  console.log('🔍 Pre-Update Validation\n');

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // 1. Validate configuration
  console.log('1️⃣  Validating configuration...');
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    result.valid = false;
    result.errors.push(...configValidation.errors);
    console.log('   ❌ Configuration validation failed');
    configValidation.errors.forEach(err => console.log(`      - ${err}`));
  } else {
    console.log('   ✅ Configuration valid');
  }

  // 2. Check database connection
  console.log('\n2️⃣  Checking database connection...');
  try {
    const config = getDatabaseConfig();
    const client = createClient(config.url, config.serviceRoleKey || config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const healthCheck = await checkDatabaseHealth(client);
    if (!healthCheck.healthy) {
      result.valid = false;
      result.errors.push(`Database connection failed: ${healthCheck.error}`);
      console.log(`   ❌ Connection failed: ${healthCheck.error}`);
    } else {
      console.log('   ✅ Database connection healthy');

      // Check database version
      const versionCheck = await checkDatabaseVersion(client);
      if (versionCheck.version) {
        console.log(`   📊 Current database version: ${versionCheck.version}`);
      } else {
        console.log('   ⚠️  No version tracking found (may be first migration)');
        result.warnings.push('Database version tracking not found');
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(`Database check failed: ${(error as Error).message}`);
    console.log(`   ❌ Database check failed: ${(error as Error).message}`);
  }

  // 3. Validate database fingerprint (if not skipping)
  if (!skipBackupCheck) {
    console.log('\n3️⃣  Validating database fingerprint...');
    try {
      const fingerprintCheck = await validateDatabaseFingerprint();
      if (!fingerprintCheck.valid) {
        result.warnings.push(`Fingerprint validation: ${fingerprintCheck.error}`);
        console.log(`   ⚠️  ${fingerprintCheck.error}`);
        console.log('      Current:', fingerprintCheck.current);
        if (fingerprintCheck.expected) {
          console.log('      Expected:', fingerprintCheck.expected);
        }
      } else {
        console.log('   ✅ Database fingerprint validated');
      }
    } catch (error) {
      result.warnings.push(`Fingerprint check failed: ${(error as Error).message}`);
      console.log(`   ⚠️  Fingerprint check failed: ${(error as Error).message}`);
    }
  }

  // 4. Check for backup
  if (!skipBackupCheck) {
    console.log('\n4️⃣  Checking for backup...');
    const backupCheck = checkBackupExists();
    if (!backupCheck.exists) {
      result.warnings.push('No backup found - consider creating backup before migration');
      console.log('   ⚠️  No backup found');
      console.log('      Recommendation: Run backup hook before migration');
    } else {
      console.log(`   ✅ Backup found: ${backupCheck.location}`);
    }
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  if (result.errors.length > 0) {
    console.log(`   ❌ Errors: ${result.errors.length}`);
    result.errors.forEach(err => console.log(`      - ${err}`));
  }
  if (result.warnings.length > 0) {
    console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
    result.warnings.forEach(warn => console.log(`      - ${warn}`));
  }
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('   ✅ All checks passed');
  }

  if (!result.valid) {
    console.log('\n❌ Validation failed. Please fix errors before proceeding.');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Validation passed with warnings. Review warnings above.');
    process.exit(0);
  }

  console.log('\n✅ Validation passed. Ready for update.');
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as runPreUpdateValidation };
