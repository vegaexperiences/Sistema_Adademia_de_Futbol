import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running settings table migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'create_settings_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error('Error executing statement:', error);
        // Try direct query instead
        const { error: directError } = await supabase.from('settings').select('*').limit(1);
        if (directError && directError.code === '42P01') {
          // Table doesn't exist, create it manually
          console.log('Creating table manually...');
          await createTableManually();
          return;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify settings were created
    const { data, error } = await supabase.from('settings').select('*');
    if (error) {
      console.error('Error verifying settings:', error);
    } else {
      console.log(`✅ Found ${data?.length || 0} settings in database`);
      data?.forEach(setting => {
        console.log(`  - ${setting.key}: ${setting.value}`);
      });
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function createTableManually() {
  // Create settings manually using Supabase client
  const { error: tableError } = await supabase
    .from('settings')
    .select('*')
    .limit(1);
  
  if (tableError && tableError.code === '42P01') {
    console.log('Table does not exist. Please create it manually in Supabase Dashboard.');
    console.log('\nGo to: SQL Editor in Supabase Dashboard');
    console.log('And run the contents of: migrations/create_settings_table.sql');
    process.exit(1);
  }
  
  // Insert default settings
  const defaultSettings = [
    { key: 'price_enrollment', value: '80', description: 'Precio de matrícula' },
    { key: 'price_monthly', value: '130', description: 'Precio de mensualidad regular' },
    { key: 'price_monthly_family', value: '110.50', description: 'Precio de mensualidad familiar (después del segundo jugador)' }
  ];
  
  for (const setting of defaultSettings) {
    const { error } = await supabase
      .from('settings')
      .upsert(setting, { onConflict: 'key' });
    
    if (error) {
      console.error(`Error inserting ${setting.key}:`, error);
    } else {
      console.log(`✅ Inserted setting: ${setting.key} = ${setting.value}`);
    }
  }
}

runMigration();
