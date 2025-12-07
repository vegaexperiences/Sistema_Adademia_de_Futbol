#!/usr/bin/env ts-node
/**
 * Script para limpiar TODOS los datos de la base de datos
 * ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos de forma PERMANENTE
 * 
 * Uso: npx tsx scripts/clear-all-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function clearAllData() {
  console.log('\n⚠️  ADVERTENCIA CRÍTICA ⚠️');
  console.log('Este script eliminará TODOS los datos de la base de datos:');
  console.log('  - Todos los jugadores (aprobados, pendientes, rechazados)');
  console.log('  - Todas las familias');
  console.log('  - Todas las transacciones y pagos');
  console.log('  - Todos los gastos');
  console.log('  - Todo el personal y sus pagos');
  console.log('  - Todos los torneos y registros');
  console.log('  - Toda la cola de correos');
  console.log('  - Todas las órdenes de Yappy\n');

  const answer = await askQuestion('¿Estás SEGURO de que quieres continuar? (escribe "SI" para confirmar): ');
  
  if (answer.trim().toUpperCase() !== 'SI') {
    console.log('❌ Operación cancelada.');
    rl.close();
    return;
  }

  console.log('\n🚀 Iniciando limpieza de datos...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(process.cwd(), 'scripts', 'clear-all-data-complete.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Remove comments and split by semicolons
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 0 
          && !trimmed.startsWith('--') 
          && !trimmed.startsWith('BEGIN')
          && !trimmed.startsWith('COMMIT')
          && !trimmed.startsWith('SELECT')
          && !trimmed.toUpperCase().startsWith('UNION ALL');
      });

    // Define tables in correct order (respecting foreign keys)
    const tablesToClear = [
      'yappy_orders',
      'payments',
      'staff_payments',
      'expense_recurrence',
      'expenses',
      'expense_categories',
      'staff',
      'tournament_registrations',
      'tournaments',
      'email_queue',
      'pending_players',
      'rejected_players',
      'players',
      'families'
    ];

    // Clear each table
    for (const tableName of tablesToClear) {
      console.log(`🗑️  Limpiando tabla: ${tableName}...`);
      
      try {
        // First, check if table exists and get count
        const { data: allData, error: selectError, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (selectError) {
          if (selectError.code === 'PGRST116' || selectError.message.includes('does not exist')) {
            console.log(`   ⚠️  ${tableName}: La tabla no existe (se omite)`);
          } else {
            console.log(`   ⚠️  ${tableName}: ${selectError.message}`);
          }
          continue;
        }

        const recordCount = count || 0;
        
        if (recordCount === 0) {
          console.log(`   ✅ ${tableName}: Ya está vacía`);
          continue;
        }

        // Fetch all IDs in batches and delete
        let deletedCount = 0;
        let offset = 0;
        const batchSize = 1000;

        while (true) {
          const { data: batch, error: batchError } = await supabase
            .from(tableName)
            .select('id')
            .range(offset, offset + batchSize - 1);

          if (batchError) {
            console.error(`   ❌ Error obteniendo datos de ${tableName}:`, batchError.message);
            break;
          }

          if (!batch || batch.length === 0) {
            break;
          }

          const ids = batch.map(row => row.id);
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .in('id', ids);

          if (deleteError) {
            console.error(`   ❌ Error eliminando de ${tableName}:`, deleteError.message);
            break;
          }

          deletedCount += ids.length;
          offset += batchSize;

          if (batch.length < batchSize) {
            break;
          }
        }

        console.log(`   ✅ ${tableName}: ${deletedCount} registros eliminados`);
      } catch (err: any) {
        console.log(`   ⚠️  ${tableName}: ${err.message}`);
      }
    }

    // Verify cleanup
    console.log('\n📊 Verificando limpieza...\n');
    
    const tables = [
      'families',
      'players',
      'pending_players',
      'rejected_players',
      'payments',
      'expenses',
      'staff',
      'staff_payments',
      'expense_categories',
      'expense_recurrence',
      'email_queue',
      'tournaments',
      'tournament_registrations',
      'yappy_orders'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ⚠️  ${table}: No se pudo verificar (${error.message})`);
        } else {
          const countValue = count || 0;
          const status = countValue === 0 ? '✅' : '⚠️';
          console.log(`   ${status} ${table}: ${countValue} registros`);
        }
      } catch (err: any) {
        console.log(`   ⚠️  ${table}: Error al verificar (${err.message})`);
      }
    }

    console.log('\n✅ Limpieza completada!\n');
    console.log('La base de datos está lista para cargar datos finales.\n');

  } catch (error: any) {
    console.error('\n❌ Error durante la limpieza:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
clearAllData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

