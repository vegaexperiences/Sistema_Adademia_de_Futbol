#!/usr/bin/env ts-node

/**
 * Migration script to set up multi-tenant architecture (Auto mode)
 * This script:
 * 1. Creates the Suarez Academy
 * 2. Assigns all existing data to Suarez Academy
 * 3. Optionally creates a super admin user
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

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

async function main() {
  console.log('🚀 Multi-Tenant Migration Script (Auto Mode)\n')
  console.log('This script will:')
  console.log('1. Create the Suarez Academy')
  console.log('2. Assign all existing data to Suarez Academy')
  console.log('3. Skip super admin creation (run manually if needed)\n')

  try {
    // Step 1: Create Suarez Academy
    console.log('\n📝 Step 1: Creating Suarez Academy...')
    const { data: existingAcademy, error: checkError } = await supabase
      .from('academies')
      .select('id')
      .eq('slug', 'suarez')
      .single()

    let suarezAcademyId: string

    if (existingAcademy) {
      console.log('✅ Suarez Academy already exists')
      suarezAcademyId = existingAcademy.id
    } else {
      const { data: academy, error: createError } = await supabase
        .from('academies')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Suarez Academy',
          slug: 'suarez',
          domain: null,
          settings: { isDefault: true },
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating academy:', createError)
        console.log('\n⚠️  Note: You may need to run the SQL migrations first in Supabase Dashboard')
        console.log('   Run: migrations/create_academies_and_super_admins.sql\n')
        throw createError
      }

      console.log('✅ Suarez Academy created:', academy.id)
      suarezAcademyId = academy.id
    }

    // Step 2: Migrate existing data
    console.log('\n📝 Step 2: Migrating existing data...')

    const tables = [
      { name: 'families', column: 'academy_id' },
      { name: 'players', column: 'academy_id' },
      { name: 'pending_players', column: 'academy_id' },
      { name: 'payments', column: 'academy_id' },
      { name: 'expenses', column: 'academy_id' },
    ]

    for (const table of tables) {
      // Check if table exists and has academy_id column
      const { error: checkTableError } = await supabase
        .from(table.name)
        .select('id')
        .limit(1)

      if (checkTableError && checkTableError.code === 'PGRST116') {
        console.log(`⏭️  Table ${table.name} does not exist, skipping...`)
        continue
      }

      // Check if academy_id column exists by trying to select it
      const { error: columnCheckError } = await supabase
        .from(table.name)
        .select(table.column)
        .limit(1)

      if (columnCheckError && columnCheckError.message?.includes('column') && columnCheckError.message?.includes('does not exist')) {
        console.log(`⏭️  Column ${table.column} does not exist in ${table.name}, skipping...`)
        console.log(`   💡 Run migration: migrations/add_academy_id_to_all_tables.sql`)
        continue
      }

      // Update records
      const { data, error } = await supabase
        .from(table.name)
        .update({ [table.column]: suarezAcademyId })
        .is(table.column, null)
        .select('id')

      if (error) {
        console.error(`❌ Error updating ${table.name}:`, error.message)
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.log(`   💡 Run migration: migrations/add_academy_id_to_all_tables.sql`)
        }
      } else {
        const count = data?.length || 0
        console.log(`✅ Updated ${count} records in ${table.name}`)
      }
    }

    console.log('\n✅ Data migration completed successfully!')
    console.log('\n📋 Important: Make sure you have run the SQL migrations in Supabase Dashboard:')
    console.log('   1. migrations/create_academies_and_super_admins.sql')
    console.log('   2. migrations/add_academy_id_to_all_tables.sql')
    console.log('   3. migrations/migrate_existing_data_to_suarez_academy.sql (optional, data already migrated)')
    console.log('   4. migrations/create_rls_policies.sql')
    console.log('\n💡 To create a super admin, run:')
    console.log('   npx tsx scripts/migrate-to-multi-tenant.ts')
    console.log('   (and answer "yes" when asked about super admin)')
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.log('\n📋 Make sure you have:')
    console.log('   1. Run the SQL migrations in Supabase Dashboard first')
    console.log('   2. Checked that all tables and columns exist')
    process.exit(1)
  }
}

main().catch(console.error)

