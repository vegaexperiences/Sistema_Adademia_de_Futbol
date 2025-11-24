import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl);
  
  // Try to fetch from system_config
  const { data, error } = await supabase.from('system_config').select('*');

  if (error) {
    console.error('Error connecting/fetching:', error);
  } else {
    console.log('Success! Found system_config rows:', data);
  }
}

testConnection();
