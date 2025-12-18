import { config } from 'dotenv';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = 'Th3m0stw@nt3dtopg';

console.log('🚀 Intentando ejecutar migración via API REST...\n');

// Read the SAFE migration
const migration = readFileSync('./migrations/2024_12_18_remove_multi_tenant_SAFE.sql', 'utf-8');

// Try using Supabase REST API with service key
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ query: migration })
});

console.log('Status:', response.status);
const result = await response.text();
console.log('Response:', result);
