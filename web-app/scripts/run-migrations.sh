#!/bin/bash

echo "🚀 Multi-Tenant Migration Script"
echo ""
echo "⚠️  IMPORTANT: You must run the SQL migrations in Supabase Dashboard FIRST!"
echo ""
echo "📋 Steps to follow:"
echo ""
echo "1. Go to Supabase Dashboard: https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Go to 'SQL Editor'"
echo "4. Run each migration file in this order:"
echo ""
echo "   a) migrations/create_academies_and_super_admins.sql"
echo "   b) migrations/add_academy_id_to_all_tables.sql"
echo "   c) migrations/migrate_existing_data_to_suarez_academy.sql"
echo "   d) migrations/create_rls_policies.sql"
echo ""
echo "5. After running all SQL migrations, press Enter to continue with data migration..."
read -p "Press Enter when ready..."

echo ""
echo "📝 Running data migration script..."
npx tsx scripts/migrate-to-multi-tenant-auto.ts

