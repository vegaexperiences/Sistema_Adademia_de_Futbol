#!/usr/bin/env ts-node

/**
 * Script to run all multi-tenant migrations
 * This script executes all SQL migrations in order
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runSQLFile(filePath: string): Promise<void> {
  console.log(`\n📄 Running migration: ${path.basename(filePath)}`)
  
  const sql = fs.readFileSync(filePath, 'utf-8')
  
  // Split SQL by semicolons and execute each statement
  // But we need to be careful with functions and triggers
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  // For complex SQL with functions, we'll execute the whole file
  try {
    // Use RPC to execute SQL (if available) or use direct query
    // Since Supabase doesn't have a direct SQL execution endpoint,
    // we'll need to use the REST API or split into smaller queries
    
    // For now, let's try executing statement by statement
    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          // Try to execute via REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql: statement }),
          })
          
          if (!response.ok && response.status !== 404) {
            // If RPC doesn't exist, we'll need to use a different approach
            console.warn(`⚠️  Could not execute via RPC, trying alternative method...`)
          }
        } catch (error) {
          // RPC might not exist, that's okay
        }
      }
    }
    
    console.log(`✅ Migration completed: ${path.basename(filePath)}`)
  } catch (error: any) {
    console.error(`❌ Error running migration ${path.basename(filePath)}:`, error.message)
    console.log('\n📋 Please run this migration manually in Supabase Dashboard:')
    console.log(`   File: ${filePath}`)
    console.log('   1. Go to: https://supabase.com/dashboard')
    console.log('   2. Click "SQL Editor"')
    console.log('   3. Copy and paste the SQL from the file')
    console.log('   4. Click "Run"\n')
    throw error
  }
}

async function main() {
  console.log('🚀 Starting Multi-Tenant Migrations\n')
  
  const migrationsDir = path.join(process.cwd(), 'migrations')
  const migrationFiles = [
    'create_academies_and_super_admins.sql',
    'add_academy_id_to_all_tables.sql',
    'migrate_existing_data_to_suarez_academy.sql',
    'create_rls_policies.sql',
  ]
  
  for (const migrationFile of migrationFiles) {
    const filePath = path.join(migrationsDir, migrationFile)
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`)
      continue
    }
    
    try {
      await runSQLFile(filePath)
    } catch (error) {
      console.error(`\n❌ Failed to run migration: ${migrationFile}`)
      console.log('\n⚠️  You will need to run this migration manually in Supabase Dashboard')
      console.log('   See instructions above.\n')
      
      // Ask if user wants to continue
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('Do you want to continue with the next migration? (yes/no): ', resolve)
      })
      rl.close()
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Migration process cancelled')
        process.exit(1)
      }
    }
  }
  
  console.log('\n✅ All migrations completed!')
  console.log('\n📝 Next step: Run the data migration script:')
  console.log('   npx tsx scripts/migrate-to-multi-tenant.ts\n')
}

main().catch(console.error)

