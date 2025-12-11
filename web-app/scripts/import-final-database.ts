#!/usr/bin/env ts-node
/**
 * Script para importar la base de datos final desde archivos CSV
 * 
 * Criterios:
 * - Solo crear familias cuando hay 2+ jugadores
 * - Separar jugadores pendientes de aprobación vs aprobados
 * - Guardar links de comprobantes de pago en proof_url
 * - Los links serán visibles en el perfil del jugador
 * 
 * Uso: npx tsx scripts/import-final-database.ts
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

interface EnrollmentRecord {
  timestamp: string;
  email: string;
  tutorName: string;
  tutorPhone: string;
  tutorCedula: string;
  address: string;
  tutorCedulaUrl: string;
  paymentMethod: string;
  paymentDate: string;
  paymentProof: string;
  players: Array<{
    name: string;
    birthDate: string;
    gender: string;
    cedula: string;
    cedulaFront: string;
    cedulaBack: string;
  }>;
}

interface PendingRecord {
  timestamp: string;
  email: string;
  tutorName: string;
  tutorPhone: string;
  tutorCedula: string;
  address: string;
  paymentMethod: string;
  paymentDate: string;
  paymentProof: string;
  players: Array<{
    name: string;
    birthDate: string;
    gender: string;
    cedula: string;
    cedulaFront: string;
    cedulaBack: string;
  }>;
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
      tutorCedulaUrl: values[6] || '',
      paymentMethod: values[7] || '',
      paymentDate: values[8] || '',
      paymentProof: values[9] || '',
      players: []
    };
    
    // Player 1
    if (values[10]) {
      record.players.push({
        name: values[10],
        birthDate: values[11] || '',
        gender: values[12] || '',
        cedula: values[13] || '',
        cedulaFront: values[14] || '',
        cedulaBack: values[15] || ''
      });
    }
    
    // Player 2
    if (values[17]) {
      record.players.push({
        name: values[17],
        birthDate: values[18] || '',
        gender: '',
        cedula: values[19] || '',
        cedulaFront: values[20] || '',
        cedulaBack: values[21] || ''
      });
    }
    
    // Player 3
    if (values[23]) {
      record.players.push({
        name: values[23],
        birthDate: values[24] || '',
        gender: '',
        cedula: values[25] || '',
        cedulaFront: values[26] || '',
        cedulaBack: values[27] || ''
      });
    }
    
    records.push(record);
  }
  
  return records;
}

function parsePendingFile(filePath: string): PendingRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  
  const records: PendingRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const record: PendingRecord = {
      timestamp: values[0] || '',
      email: values[1] || '',
      tutorName: values[2] || '',
      tutorPhone: values[3] || '',
      tutorCedula: values[31] || '', // Last column
      address: values[4] || '',
      paymentMethod: values[5] || '',
      paymentDate: values[6] || '',
      paymentProof: values[7] || '',
      players: []
    };
    
    // Player 1
    if (values[8]) {
      record.players.push({
        name: values[8],
        birthDate: values[9] || '',
        gender: values[10] || '',
        cedula: values[11] || '',
        cedulaFront: values[12] || '',
        cedulaBack: values[13] || ''
      });
    }
    
    // Player 2
    if (values[16]) {
      record.players.push({
        name: values[16],
        birthDate: values[17] || '',
        gender: '',
        cedula: values[18] || '',
        cedulaFront: values[19] || '',
        cedulaBack: values[20] || ''
      });
    }
    
    // Player 3
    if (values[23]) {
      record.players.push({
        name: values[23],
        birthDate: values[24] || '',
        gender: '',
        cedula: values[25] || '',
        cedulaFront: values[26] || '',
        cedulaBack: values[27] || ''
      });
    }
    
    records.push(record);
  }
  
  return records;
}

function normalizeCedula(cedula: string): string {
  return cedula.replace(/\s+/g, '').toUpperCase();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeDate(date: string): string {
  if (!date) return '';
  return date.trim();
}

function findMatchingPlayer(
  player: { name: string; birthDate: string; cedula: string },
  pendingPlayers: Array<{ name: string; birthDate: string; cedula: string }>
): boolean {
  const normalizedName = normalizeName(player.name);
  const normalizedCedula = normalizeCedula(player.cedula);
  const normalizedBirthDate = normalizeDate(player.birthDate);
  
  return pendingPlayers.some(p => {
    const pName = normalizeName(p.name);
    const pCedula = normalizeCedula(p.cedula);
    const pBirthDate = normalizeDate(p.birthDate);
    
    if (normalizedCedula && pCedula) {
      return normalizedCedula === pCedula;
    }
    return normalizedName === pName && normalizedBirthDate === pBirthDate;
  });
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // D/M/YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD
        return new Date(match[1], parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        // DD/MM/YYYY or D/M/YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      }
    }
  }
  
  return null;
}

function mapPaymentMethod(method: string): 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'ach' | 'other' {
  if (!method) return 'cash';
  const methodLower = method.toLowerCase().trim();
  if (methodLower.includes('yappy')) return 'yappy';
  if (methodLower.includes('ach')) return 'ach';
  if (methodLower.includes('visa') || methodLower.includes('mastercard') || methodLower.includes('card') || methodLower === 'card') return 'card';
  if (methodLower.includes('paguelo') || methodLower.includes('paguelofacil')) return 'paguelofacil';
  if (methodLower.includes('transfer') || methodLower.includes('transferencia')) return 'transfer';
  if (methodLower.includes('cheque') || methodLower === 'cheque') return 'other';
  return 'cash';
}

async function importDatabase() {
  console.log('\n⚠️  ADVERTENCIA CRÍTICA ⚠️');
  console.log('Este script importará TODOS los datos desde los archivos CSV:');
  console.log('  - Creará familias SOLO cuando hay 2+ jugadores');
  console.log('  - Importará jugadores aprobados a la tabla players');
  console.log('  - Importará jugadores pendientes a la tabla pending_players');
  console.log('  - Creará registros de pagos con links de comprobantes\n');

  const answer = await askQuestion('¿Estás SEGURO de que quieres continuar? (escribe "SI" para confirmar): ');
  
  if (answer.trim().toUpperCase() !== 'SI') {
    console.log('❌ Operación cancelada.');
    rl.close();
    return;
  }

  console.log('\n🚀 Iniciando importación de datos...\n');

  try {
    const mainFile = '/Users/javiervallejo/Downloads/FORMULARIO INSCRIPCIÓN ANUAL 4.csv';
    const pendingFile = '/Users/javiervallejo/Downloads/CRM Academia Suarez - FORM_MATRICULA.csv';

    console.log('📖 Leyendo archivos CSV...');
    const allRecords = parseMainFile(mainFile);
    const pendingRecords = parsePendingFile(pendingFile);
    
    console.log(`   ✅ Archivo principal: ${allRecords.length} registros`);
    console.log(`   ✅ Archivo pendientes: ${pendingRecords.length} registros\n`);

    // Extract all pending players
    const allPendingPlayers: Array<{ name: string; birthDate: string; cedula: string; tutorCedula: string }> = [];
    pendingRecords.forEach(record => {
      record.players.forEach(player => {
        allPendingPlayers.push({
          name: player.name,
          birthDate: player.birthDate,
          cedula: player.cedula,
          tutorCedula: record.tutorCedula
        });
      });
    });

    // Categorize records
    const recordsToPending: EnrollmentRecord[] = [];
    const recordsToApproved: EnrollmentRecord[] = [];
    
    allRecords.forEach(record => {
      const hasPendingPlayer = record.players.some(player => 
        findMatchingPlayer(player, allPendingPlayers)
      );
      
      if (hasPendingPlayer) {
        recordsToPending.push(record);
      } else {
        recordsToApproved.push(record);
      }
    });

    console.log(`📊 Distribución:`);
    console.log(`   ├─ A aprobaciones: ${recordsToPending.length} registros`);
    console.log(`   └─ A jugadores aprobados: ${recordsToApproved.length} registros\n`);

    // Group records by tutor_cedula to identify families
    const familyGroups = new Map<string, EnrollmentRecord[]>();
    
    [...recordsToApproved, ...recordsToPending].forEach(record => {
      const normalizedCedula = normalizeCedula(record.tutorCedula);
      if (!normalizedCedula) return;
      
      if (!familyGroups.has(normalizedCedula)) {
        familyGroups.set(normalizedCedula, []);
      }
      familyGroups.get(normalizedCedula)!.push(record);
    });

    // Create families only for tutors with 2+ players
    console.log('👨‍👩‍👧‍👦 Creando familias (solo para 2+ jugadores)...');
    const familyMap = new Map<string, string>(); // tutorCedula -> familyId
    
    let familiesCreated = 0;
    let familiesSkipped = 0;
    
    for (const [tutorCedula, records] of familyGroups.entries()) {
      const totalPlayers = records.reduce((sum, r) => sum + r.players.length, 0);
      
      // Only create family if 2+ players
      if (totalPlayers >= 2) {
        const firstRecord = records[0];
        
        // Check if family already exists
        const { data: existingFamily } = await supabase
          .from('families')
          .select('id')
          .eq('tutor_cedula', firstRecord.tutorCedula)
          .maybeSingle();
        
        if (existingFamily) {
          familyMap.set(tutorCedula, existingFamily.id);
          console.log(`   ℹ️  Familia ya existe: ${firstRecord.tutorName} (${totalPlayers} jugadores)`);
        } else {
          const { data: family, error } = await supabase
            .from('families')
            .insert({
              name: `Familia ${firstRecord.tutorName.split(' ')[0]}`,
              tutor_name: firstRecord.tutorName,
              tutor_cedula: firstRecord.tutorCedula,
              tutor_email: firstRecord.email,
              tutor_phone: firstRecord.tutorPhone,
              tutor_cedula_url: firstRecord.tutorCedulaUrl || null
            })
            .select()
            .single();
          
          if (error) {
            console.error(`   ❌ Error creando familia para ${firstRecord.tutorName}:`, error.message);
          } else {
            familyMap.set(tutorCedula, family.id);
            familiesCreated++;
            console.log(`   ✅ Familia creada: ${firstRecord.tutorName} (${totalPlayers} jugadores)`);
          }
        }
      } else {
        familiesSkipped++;
      }
    }
    
    console.log(`\n   ✅ Total familias creadas: ${familiesCreated}`);
    console.log(`   ⏭️  Familias omitidas (1 jugador): ${familiesSkipped}\n`);

    // Import approved players
    console.log('✅ Importando jugadores aprobados...');
    let approvedPlayersCount = 0;
    let approvedPaymentsCount = 0;
    
    for (const record of recordsToApproved) {
      const familyId = familyMap.get(normalizeCedula(record.tutorCedula)) || null;
      
      for (const player of record.players) {
        const birthDate = parseDate(player.birthDate);
        const nameParts = player.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Determine category from birth date and gender
        // Use birth year to determine category (more accurate than age)
        let category = 'Sin categoría';
        if (birthDate) {
          const birthYear = birthDate.getFullYear();
          const gender = player.gender === 'Masculino' || player.gender === 'M' ? 'Masculino' : 'Femenino';
          
          // Male categories
          if (gender === 'Masculino') {
            if ([2020, 2021].includes(birthYear)) category = 'U6';
            else if ([2018, 2019].includes(birthYear)) category = 'U8';
            else if ([2016, 2017].includes(birthYear)) category = 'U10';
            else if ([2014, 2015].includes(birthYear)) category = 'U12';
            else if ([2012, 2013].includes(birthYear)) category = 'U14';
            else if ([2010, 2011].includes(birthYear)) category = 'U16';
          } else {
            // Female categories
            if ([2016, 2017].includes(birthYear)) category = 'U10';
            else if ([2014, 2015].includes(birthYear)) category = 'U12';
            else if ([2012, 2013].includes(birthYear)) category = 'U14';
            else if ([2010, 2011].includes(birthYear)) category = 'U16';
            else if (birthYear <= 2009) category = 'U18';
          }
        }
        
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .insert({
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDate?.toISOString().split('T')[0] || null,
            gender: player.gender || null,
            cedula: player.cedula || null,
            category: category,
            status: 'Active',
            family_id: familyId,
            cedula_front_url: player.cedulaFront || null,
            cedula_back_url: player.cedulaBack || null
          })
          .select()
          .single();
        
        if (playerError) {
          console.error(`   ❌ Error creando jugador ${player.name}:`, playerError.message);
        } else {
          approvedPlayersCount++;
          
          // Create enrollment payment if payment proof exists
          // Store proof URL for manual verification and payment amount setting
          if (record.paymentProof && record.paymentProof.trim()) {
            const paymentDate = parseDate(record.paymentDate) || new Date();
            const paymentMethod = mapPaymentMethod(record.paymentMethod);
            
            const { error: paymentError } = await supabase
              .from('payments')
              .insert({
                player_id: playerData.id,
                amount: 0, // Amount to be set manually after verifying proof
                type: 'enrollment',
                method: paymentMethod,
                payment_date: paymentDate.toISOString().split('T')[0],
                proof_url: record.paymentProof, // Link visible in player profile
                notes: `Pago de matrícula importado. Método: ${record.paymentMethod}. Fecha pago: ${record.paymentDate}. Verificar monto en comprobante: ${record.paymentProof}`,
                status: 'Pending' // Set to Pending until amount is verified
              });
            
            if (paymentError) {
              console.error(`   ⚠️  Error creando pago para ${player.name}:`, paymentError.message);
            } else {
              approvedPaymentsCount++;
            }
          }
        }
      }
    }
    
    console.log(`   ✅ Jugadores aprobados importados: ${approvedPlayersCount}`);
    console.log(`   ✅ Pagos creados: ${approvedPaymentsCount}\n`);

    // Import pending players
    console.log('⏳ Importando jugadores pendientes...');
    let pendingPlayersCount = 0;
    let pendingPaymentsCount = 0;
    
    for (const record of recordsToPending) {
      const familyId = familyMap.get(normalizeCedula(record.tutorCedula)) || null;
      
      for (const player of record.players) {
        const birthDate = parseDate(player.birthDate);
        const nameParts = player.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Determine category from birth date and gender
        // Use birth year to determine category (more accurate than age)
        let category = 'Sin categoría';
        if (birthDate) {
          const birthYear = birthDate.getFullYear();
          const gender = player.gender === 'Masculino' || player.gender === 'M' ? 'Masculino' : 'Femenino';
          
          // Male categories
          if (gender === 'Masculino') {
            if ([2020, 2021].includes(birthYear)) category = 'U6';
            else if ([2018, 2019].includes(birthYear)) category = 'U8';
            else if ([2016, 2017].includes(birthYear)) category = 'U10';
            else if ([2014, 2015].includes(birthYear)) category = 'U12';
            else if ([2012, 2013].includes(birthYear)) category = 'U14';
            else if ([2010, 2011].includes(birthYear)) category = 'U16';
          } else {
            // Female categories
            if ([2016, 2017].includes(birthYear)) category = 'U10';
            else if ([2014, 2015].includes(birthYear)) category = 'U12';
            else if ([2012, 2013].includes(birthYear)) category = 'U14';
            else if ([2010, 2011].includes(birthYear)) category = 'U16';
            else if (birthYear <= 2009) category = 'U18';
          }
        }
        
        const { data: playerData, error: playerError } = await supabase
          .from('pending_players')
          .insert({
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDate?.toISOString().split('T')[0] || null,
            gender: player.gender || null,
            cedula: player.cedula || null,
            category: category,
            family_id: familyId,
            tutor_name: record.tutorName,
            tutor_cedula: record.tutorCedula,
            tutor_email: record.email,
            tutor_phone: record.tutorPhone,
            cedula_front_url: player.cedulaFront || null,
            cedula_back_url: player.cedulaBack || null
          })
          .select()
          .single();
        
        if (playerError) {
          console.error(`   ❌ Error creando jugador pendiente ${player.name}:`, playerError.message);
        } else {
          pendingPlayersCount++;
          
          // Create enrollment payment if payment proof exists
          // Store proof URL for manual verification
          if (record.paymentProof && record.paymentProof.trim()) {
            const paymentDate = parseDate(record.paymentDate) || new Date();
            const paymentMethod = mapPaymentMethod(record.paymentMethod);
            
            const { error: paymentError } = await supabase
              .from('payments')
              .insert({
                player_id: null, // Will be linked when player is approved
                amount: 0, // Amount to be set manually after verifying proof
                type: 'enrollment',
                method: paymentMethod,
                payment_date: paymentDate.toISOString().split('T')[0],
                proof_url: record.paymentProof, // Link visible in player profile
                notes: `Pago de matrícula pendiente. Jugador: ${player.name}. Método: ${record.paymentMethod}. Fecha pago: ${record.paymentDate}. Verificar monto en comprobante: ${record.paymentProof}`,
                status: 'Pending'
              });
            
            if (paymentError) {
              console.error(`   ⚠️  Error creando pago pendiente para ${player.name}:`, paymentError.message);
            } else {
              pendingPaymentsCount++;
            }
          }
        }
      }
    }
    
    console.log(`   ✅ Jugadores pendientes importados: ${pendingPlayersCount}`);
    console.log(`   ✅ Pagos pendientes creados: ${pendingPaymentsCount}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`📊 Resumen:`);
    console.log(`   ├─ Familias creadas: ${familiesCreated}`);
    console.log(`   ├─ Jugadores aprobados: ${approvedPlayersCount}`);
    console.log(`   ├─ Jugadores pendientes: ${pendingPlayersCount}`);
    console.log(`   ├─ Pagos aprobados: ${approvedPaymentsCount}`);
    console.log(`   └─ Pagos pendientes: ${pendingPaymentsCount}\n`);
    console.log('💡 Nota: Los links de comprobantes están guardados en proof_url');
    console.log('   y serán visibles en el perfil de cada jugador.\n');

  } catch (error: any) {
    console.error('\n❌ Error durante la importación:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
importDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

