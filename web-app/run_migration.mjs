import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

console.log('🔄 Conectando a Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Read migration SQL
const migrationSQL = readFileSync('./migrations/2024_12_18_remove_multi_tenant.sql', 'utf-8');

console.log('📄 Leyendo migración SQL...');
console.log('⚠️  ADVERTENCIA: Esta operación es IRREVERSIBLE');
console.log('⏳ Ejecutando migración...\n');

try {
  // Execute the migration
  const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
  
  if (error) {
    console.error('❌ Error ejecutando migración:');
    console.error(error);
    process.exit(1);
  }
  
  console.log('✅ Migración ejecutada exitosamente!');
  console.log('\n📊 Validando resultado...');
  
  // Validate no academy_id columns remain
  const { data: validation, error: valError } = await supabase.rpc('exec', {
    sql: `SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND column_name = 'academy_id'`
  });
  
  if (valError) {
    console.error('⚠️  No se pudo validar, pero migración parece exitosa');
  } else if (!validation || validation.length === 0) {
    console.log('✅ VALIDACIÓN EXITOSA: No quedan columnas academy_id');
  } else {
    console.error('⚠️  Aún hay columnas academy_id:', validation);
  }
  
} catch (err) {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
}

console.log('\n🎉 ¡Proceso completado!');
