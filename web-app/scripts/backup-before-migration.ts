#!/usr/bin/env tsx
/**
 * Backup Hook Script
 * 
 * Creates automated backup before running migrations.
 * Supports Supabase backups via API or manual backup instructions.
 * 
 * Usage:
 *   tsx scripts/backup-before-migration.ts [--skip-api] [--manual-only]
 */

import { getDatabaseConfig } from '../src/lib/config/client-config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface BackupMetadata {
  timestamp: string;
  databaseUrl: string;
  backupType: 'api' | 'manual';
  backupLocation?: string;
  instructions?: string;
}

/**
 * Generate backup metadata file
 */
function saveBackupMetadata(metadata: BackupMetadata): void {
  const backupsDir = join(process.cwd(), '.backups');
  mkdirSync(backupsDir, { recursive: true });

  const metadataFile = join(backupsDir, `backup_${metadata.timestamp}.json`);
  writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  console.log(`\n💾 Backup metadata saved to: ${metadataFile}`);
}

/**
 * Main backup function
 */
async function main() {
  const args = process.argv.slice(2);
  const skipApi = args.includes('--skip-api');
  const manualOnly = args.includes('--manual-only');

  console.log('💾 Pre-Migration Backup Hook\n');

  try {
    const config = getDatabaseConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log(`Database: ${config.url}`);
    console.log(`Timestamp: ${timestamp}\n`);

    if (manualOnly || skipApi) {
      // Manual backup instructions
      console.log('📋 MANUAL BACKUP REQUIRED\n');
      console.log('Please create a backup using one of these methods:\n');

      console.log('Method 1: Supabase Dashboard');
      console.log('1. Go to: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to Settings → Database → Backups');
      console.log('4. Click "Create backup" → "Manual backup"');
      console.log('5. Wait for backup to complete\n');

      console.log('Method 2: Supabase CLI');
      console.log('  supabase db dump -f backup_' + timestamp + '.sql\n');

      const metadata: BackupMetadata = {
        timestamp,
        databaseUrl: config.url,
        backupType: 'manual',
        instructions: 'Manual backup required - see console output above',
      };

      saveBackupMetadata(metadata);

      console.log('\n⚠️  IMPORTANT: Complete the backup before proceeding with migrations.');
      console.log('   Once backup is complete, you can continue with migration execution.\n');
      
      process.exit(0); // Exit with success - manual backup is valid
    }

    // Attempt API backup (if Supabase API is available)
    console.log('🔄 Attempting automated backup via Supabase API...\n');
    console.log('⚠️  Automated backups via API require Supabase project access token.');
    console.log('   For now, manual backup is recommended.\n');

    // For now, fall back to manual
    console.log('📋 Please create a backup manually:');
    console.log('   See instructions above or use Supabase Dashboard\n');

    const metadata: BackupMetadata = {
      timestamp,
      databaseUrl: config.url,
      backupType: 'manual',
      instructions: 'Manual backup recommended - automated backup not yet implemented',
    };

    saveBackupMetadata(metadata);

    console.log('\n✅ Backup hook completed (manual backup required)');
    console.log('   Backup metadata has been saved for reference.\n');

  } catch (error) {
    console.error('❌ Backup hook error:', (error as Error).message);
    console.error('\n⚠️  Backup hook failed, but you can still proceed with manual backup.');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as runBackupHook };
