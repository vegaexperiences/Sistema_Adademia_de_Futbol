import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSettingsTable() {
  console.log('🚀 Creating settings table and inserting default values...\n');
  
  try {
    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('settings')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table already exists!');
      console.log('📝 Upserting default settings...\n');
    } else if (checkError.code === 'PGRST116' || checkError.message.includes('does not exist')) {
      console.log('⚠️  Table does not exist.');
      console.log('\n📋 Please create it manually in Supabase Dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard/project/djfwxmvlmvtvlydkimyt/editor');
      console.log('2. Click "SQL Editor"');
      console.log('3. Run this SQL:\n');
      console.log(`
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update" ON public.settings
  FOR UPDATE TO authenticated USING (true);
      `);
      console.log('\n4. Then run this script again\n');
      process.exit(1);
    }
    
    // Insert/update default settings
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
        console.error(`❌ Error inserting ${setting.key}:`, error.message);
      } else {
        console.log(`✅ ${setting.description}: $${setting.value}`);
      }
    }
    
    console.log('\n🎉 Settings configured successfully!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSettingsTable();
