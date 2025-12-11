#!/usr/bin/env ts-node

/**
 * Script to create initial super admin
 * Creates super admin for vegaexperiences@gmail.com
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
  console.log('🚀 Creating Initial Super Admin\n')
  console.log('Email: vegaexperiences@gmail.com\n')

  try {
    // Get user by email from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      process.exit(1)
    }

    const user = users.find(u => u.email === 'vegaexperiences@gmail.com')

    if (!user) {
      console.error('❌ User with email vegaexperiences@gmail.com not found.')
      console.log('\n💡 The user must exist in Supabase Auth first.')
      console.log('   Please create the user account by:')
      console.log('   1. Going to Supabase Dashboard → Authentication → Users')
      console.log('   2. Creating a new user with email: vegaexperiences@gmail.com')
      console.log('   3. Or having the user sign up through the application\n')
      process.exit(1)
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
    })

    // Check if super admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingAdmin) {
      console.log('✅ Super admin already exists for this user')
      console.log('   Super Admin ID:', existingAdmin.id)
      return
    }

    // Create super admin
    const { data: newAdmin, error: createError } = await supabase
      .from('super_admins')
      .insert({
        user_id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email!,
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating super admin:', createError)
      process.exit(1)
    }

    console.log('✅ Super admin created successfully!')
    console.log('   Super Admin ID:', newAdmin.id)
    console.log('   Email:', newAdmin.email)
    console.log('\n🎉 You can now access the super admin dashboard at:')
    console.log('   /super-admin/academies')
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)

