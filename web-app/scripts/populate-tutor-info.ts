#!/usr/bin/env ts-node
/**
 * Script para poblar información del tutor desde el CSV original
 * para jugadores que no tienen información del tutor
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

interface EnrollmentRecord {
  timestamp: string;
  email: string;
  tutorName: string;
  tutorPhone: string;
  tutorCedula: string;
  address: string;
  players: Array<{
    name: string;
    birthDate: string;
    gender: string;
    cedula: string;
  }>;
}

function parseMainFile(filePath: string): EnrollmentRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  
  const records: EnrollmentRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const record: EnrollmentRecord = {
      timestamp: values[0] || '',
      email: values[1] || '',
      tutorName: values[2] || '',
      tutorPhone: values[3] || '',
      tutorCedula: values[4] || '',
      address: values[5] || '',
      players: []
    };
    
    // Player 1
    if (values[10]) {
      record.players.push({
        name: values[10],
        birthDate: values[11] || '',
        gender: values[12] || '',
        cedula: values[13] || ''
      });
    }
    
    // Player 2
    if (values[17]) {
      record.players.push({
        name: values[17],
        birthDate: values[18] || '',
        gender: '',
        cedula: values[19] || ''
      });
    }
    
    // Player 3
    if (values[23]) {
      record.players.push({
        name: values[23],
        birthDate: values[24] || '',
        gender: '',
        cedula: values[25] || ''
      });
    }
    
    records.push(record);
  }
  
  return records;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeCedula(cedula: string): string {
  return cedula.replace(/\s+/g, '').toUpperCase();
}

function findMatchingPlayer(
  playerName: string,
  playerCedula: string | null,
  playerBirthDate: string | null,
  csvRecord: EnrollmentRecord
): boolean {
  const normalizedPlayerName = normalizeName(playerName);
  const normalizedPlayerCedula = playerCedula ? normalizeCedula(playerCedula) : '';
  
  return csvRecord.players.some(p => {
    const normalizedCSVName = normalizeName(p.name);
    const normalizedCSVCedula = p.cedula ? normalizeCedula(p.cedula) : '';
    
    // Match by cedula if available
    if (normalizedPlayerCedula && normalizedCSVCedula) {
      return normalizedPlayerCedula === normalizedCSVCedula;
    }
    
    // Match by name
    return normalizedPlayerName === normalizedCSVName;
  });
}

async function populateTutorInfo() {
  console.log('\n🔧 Poblando información del tutor desde CSV...\n');

  const answer = await askQuestion('¿Estás seguro de que quieres continuar? (escribe "SI" para confirmar): ');
  
  if (answer.trim().toUpperCase() !== 'SI') {
    console.log('❌ Operación cancelada.');
    rl.close();
    return;
  }

  try {
    const csvFile = '/Users/javiervallejo/Downloads/FORMULARIO INSCRIPCIÓN ANUAL 4.csv';
    
    console.log('📖 Leyendo archivo CSV...');
    const csvRecords = parseMainFile(csvFile);
    console.log(`   ✅ ${csvRecords.length} registros leídos\n`);

    // Get all players without tutor info
    console.log('🔍 Buscando jugadores sin información del tutor...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        cedula,
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

    let playersNeedingInfo = 0;
    let playersUpdated = 0;
    let playersSkipped = 0;

    for (const player of players || []) {
      const family = Array.isArray(player.families) ? player.families[0] : player.families;
      
      // Check if player needs tutor info
      let needsInfo = false;
      if (player.family_id && family) {
        // Player has family - check if family has tutor info
        const hasTutorInfo = family.tutor_name || family.tutor_email || family.tutor_phone || family.tutor_cedula;
        needsInfo = !hasTutorInfo;
      } else if (!player.family_id) {
        // Player without family - check if player has tutor info
        const hasTutorInfo = player.tutor_name || player.tutor_email || player.tutor_phone || player.tutor_cedula;
        needsInfo = !hasTutorInfo;
      }

      if (!needsInfo) {
        continue;
      }

      playersNeedingInfo++;

      // Find matching CSV record
      const playerFullName = `${player.first_name} ${player.last_name}`;
      const matchingRecord = csvRecords.find(record => 
        findMatchingPlayer(
          playerFullName,
          player.cedula || null,
          player.birth_date || null,
          record
        )
      );

      if (!matchingRecord) {
        console.log(`   ⚠️  No se encontró en CSV: ${playerFullName}`);
        playersSkipped++;
        continue;
      }

      // Update player or family with tutor info
      if (player.family_id && family) {
        // Update family
        console.log(`   🔧 Actualizando familia para: ${playerFullName}`);
        const { error: updateError } = await supabase
          .from('families')
          .update({
            tutor_name: matchingRecord.tutorName || family.tutor_name,
            tutor_email: matchingRecord.email || family.tutor_email,
            tutor_phone: matchingRecord.tutorPhone || family.tutor_phone,
            tutor_cedula: matchingRecord.tutorCedula || family.tutor_cedula
          })
          .eq('id', family.id);

        if (updateError) {
          console.error(`      ❌ Error: ${updateError.message}`);
        } else {
          console.log(`      ✅ Familia actualizada`);
          playersUpdated++;
        }
      } else {
        // Update player directly
        console.log(`   🔧 Actualizando jugador: ${playerFullName}`);
        const { error: updateError } = await supabase
          .from('players')
          .update({
            tutor_name: matchingRecord.tutorName || player.tutor_name,
            tutor_email: matchingRecord.email || player.tutor_email,
            tutor_phone: matchingRecord.tutorPhone || player.tutor_phone,
            tutor_cedula: matchingRecord.tutorCedula || player.tutor_cedula
          })
          .eq('id', player.id);

        if (updateError) {
          console.error(`      ❌ Error: ${updateError.message}`);
        } else {
          console.log(`      ✅ Jugador actualizado`);
          playersUpdated++;
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`📊 Resumen:`);
    console.log(`   ├─ Jugadores que necesitaban info: ${playersNeedingInfo}`);
    console.log(`   ├─ Jugadores actualizados: ${playersUpdated}`);
    console.log(`   └─ Jugadores no encontrados en CSV: ${playersSkipped}\n`);

  } catch (error: any) {
    console.error('\n❌ Error durante el proceso:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

populateTutorInfo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

