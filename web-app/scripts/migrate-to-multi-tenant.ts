#!/usr/bin/env ts-node

/**
 * Migration script to set up multi-tenant architecture
 * This script:
 * 1. Creates the Suarez Academy
 * 2. Assigns all existing data to Suarez Academy
 * 3. Creates a super admin user (if provided)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as readline from 'readline'

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function main() {
  console.log('🚀 Multi-Tenant Migration Script\n')
  console.log('This script will:')
  console.log('1. Create the Suarez Academy')
  console.log('2. Assign all existing data to Suarez Academy')
  console.log('3. Optionally create a super admin user\n')

  const proceed = await question('Do you want to proceed? (yes/no): ')
  if (proceed.toLowerCase() !== 'yes') {
    console.log('❌ Migration cancelled')
    rl.close()
    return
  }

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
      // Check if table exists
      const { error: checkTableError } = await supabase
        .from(table.name)
        .select('id')
        .limit(1)

      if (checkTableError && checkTableError.code === 'PGRST116') {
        console.log(`⏭️  Table ${table.name} does not exist, skipping...`)
        continue
      }

      // Update records
      const { data, error } = await supabase
        .from(table.name)
        .update({ [table.column]: suarezAcademyId })
        .is(table.column, null)
        .select('id')

      if (error) {
        console.error(`❌ Error updating ${table.name}:`, error)
      } else {
        const count = data?.length || 0
        console.log(`✅ Updated ${count} records in ${table.name}`)
      }
    }

    // Step 3: Create super admin (optional)
    console.log('\n📝 Step 3: Super Admin Setup')
    const createSuperAdmin = await question('Do you want to create a super admin user? (yes/no): ')

    if (createSuperAdmin.toLowerCase() === 'yes') {
      const email = await question('Enter super admin email: ')
      const { data: users, error: userError } = await supabase.auth.admin.listUsers()

      if (userError) {
        console.error('❌ Error fetching users:', userError)
      } else {
        const user = users.users.find((u) => u.email === email)

        if (!user) {
          console.log(`❌ User with email ${email} not found. Please create the user first in Supabase Auth.`)
        } else {
          // Check if super admin already exists
          const { data: existingSuperAdmin } = await supabase
            .from('super_admins')
            .select('id')
            .eq('user_id', user.id)
            .single()

          if (existingSuperAdmin) {
            console.log('✅ Super admin already exists for this user')
          } else {
            const { error: superAdminError } = await supabase
              .from('super_admins')
              .insert({
                user_id: user.id,
                email: user.email!,
                name: user.user_metadata?.name || user.email!,
              })

            if (superAdminError) {
              console.error('❌ Error creating super admin:', superAdminError)
            } else {
              console.log('✅ Super admin created successfully')
            }
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run the SQL migrations in Supabase Dashboard:')
    console.log('   - migrations/create_academies_and_super_admins.sql')
    console.log('   - migrations/add_academy_id_to_all_tables.sql')
    console.log('   - migrations/create_rls_policies.sql')
    console.log('2. Test the system with the Suarez Academy')
    console.log('3. Create additional academies from the Super Admin dashboard')
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main().catch(console.error)

