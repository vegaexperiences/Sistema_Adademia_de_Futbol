#!/usr/bin/env ts-node
/**
 * Script para verificar y poblar información del tutor faltante en jugadores
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyTutorInfo() {
  console.log('\n🔍 Verificando información del tutor en jugadores...\n');

  // Get all players with their families
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      family_id,
      tutor_name,
      tutor_email,
      tutor_phone,
      tutor_cedula,
      families (
        id,
        tutor_name,
        tutor_email,
        tutor_phone,
        tutor_cedula
      )
    `);

  if (playersError) {
    console.error('❌ Error obteniendo jugadores:', playersError.message);
    return;
  }

  console.log(`📊 Total jugadores: ${players?.length || 0}\n`);

  let playersWithFamilyMissingInfo = 0;
  let playersWithoutFamilyMissingInfo = 0;
  let playersFixed = 0;

  for (const player of players || []) {
    const family = Array.isArray(player.families) ? player.families[0] : player.families;
    
    if (player.family_id && family) {
      // Player has family - check if family has tutor info
      const hasTutorInfo = family.tutor_name || family.tutor_email || family.tutor_phone || family.tutor_cedula;
      
      if (!hasTutorInfo) {
        playersWithFamilyMissingInfo++;
        console.log(`⚠️  Jugador con familia pero sin info del tutor:`);
        console.log(`   ${player.first_name} ${player.last_name} (ID: ${player.id})`);
        console.log(`   Familia ID: ${family.id}`);
        console.log(`   La familia no tiene información del tutor\n`);
      }
    } else if (!player.family_id) {
      // Player without family - check if player has tutor info
      const hasTutorInfo = player.tutor_name || player.tutor_email || player.tutor_phone || player.tutor_cedula;
      
      if (!hasTutorInfo) {
        playersWithoutFamilyMissingInfo++;
        console.log(`⚠️  Jugador sin familia y sin info del tutor:`);
        console.log(`   ${player.first_name} ${player.last_name} (ID: ${player.id})\n`);
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`   ├─ Jugadores con familia sin info del tutor: ${playersWithFamilyMissingInfo}`);
  console.log(`   ├─ Jugadores sin familia sin info del tutor: ${playersWithoutFamilyMissingInfo}`);
  console.log(`   └─ Total con problemas: ${playersWithFamilyMissingInfo + playersWithoutFamilyMissingInfo}\n`);

  if (playersWithFamilyMissingInfo + playersWithoutFamilyMissingInfo === 0) {
    console.log('✅ Todos los jugadores tienen información del tutor correctamente configurada.\n');
  } else {
    console.log('💡 Nota: Los jugadores con familia obtienen la info del tutor desde la tabla families.');
    console.log('   Los jugadores sin familia deben tener la info en sus campos directos.\n');
  }
}

verifyTutorInfo().catch(console.error);

