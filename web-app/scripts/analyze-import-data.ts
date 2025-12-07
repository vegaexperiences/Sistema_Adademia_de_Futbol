#!/usr/bin/env ts-node
/**
 * Script para analizar los archivos CSV antes de importar
 * Identifica jugadores pendientes vs aprobados, grupos familiares, y pagos
 */

import * as fs from 'fs';
import * as path from 'path';

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
  // Handle different date formats
  if (!date) return '';
  // Try to parse and normalize
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
    
    // Match by name and birth date, or by cedula if available
    if (normalizedCedula && pCedula) {
      return normalizedCedula === pCedula;
    }
    return normalizedName === pName && normalizedBirthDate === pBirthDate;
  });
}

async function analyze() {
  console.log('🔍 Analizando archivos CSV...\n');
  
  const mainFile = '/Users/javiervallejo/Downloads/FORMULARIO INSCRIPCIÓN ANUAL 4.csv';
  const pendingFile = '/Users/javiervallejo/Downloads/CRM Academia Suarez - FORM_MATRICULA.csv';
  
  const allRecords = parseMainFile(mainFile);
  const pendingRecords = parsePendingFile(pendingFile);
  
  console.log(`📊 Total de registros en archivo principal: ${allRecords.length}`);
  console.log(`📋 Total de registros pendientes: ${pendingRecords.length}\n`);
  
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
  
  console.log(`👥 Total de jugadores pendientes: ${allPendingPlayers.length}\n`);
  
  // Categorize players
  const playersToPending: EnrollmentRecord[] = [];
  const playersToApproved: EnrollmentRecord[] = [];
  
  allRecords.forEach(record => {
    const hasPendingPlayer = record.players.some(player => 
      findMatchingPlayer(player, allPendingPlayers)
    );
    
    if (hasPendingPlayer) {
      playersToPending.push(record);
    } else {
      playersToApproved.push(record);
    }
  });
  
  // Count total players
  let totalPendingPlayers = 0;
  let totalApprovedPlayers = 0;
  
  playersToPending.forEach(record => {
    totalPendingPlayers += record.players.length;
  });
  
  playersToApproved.forEach(record => {
    totalApprovedPlayers += record.players.length;
  });
  
  // Identify family groups
  const familyGroups = new Map<string, Array<{ tutorName: string; tutorCedula: string; playerCount: number }>>();
  
  allRecords.forEach(record => {
    const normalizedCedula = normalizeCedula(record.tutorCedula);
    if (!normalizedCedula) return;
    
    if (!familyGroups.has(normalizedCedula)) {
      familyGroups.set(normalizedCedula, []);
    }
    
    const group = familyGroups.get(normalizedCedula)!;
    group.push({
      tutorName: record.tutorName,
      tutorCedula: record.tutorCedula,
      playerCount: record.players.length
    });
  });
  
  const multiPlayerFamilies = Array.from(familyGroups.entries())
    .filter(([_, records]) => {
      const totalPlayers = records.reduce((sum, r) => sum + r.playerCount, 0);
      return totalPlayers > 1;
    });
  
  // Count payments with proof
  let paymentsWithProof = 0;
  let paymentsWithoutProof = 0;
  
  allRecords.forEach(record => {
    if (record.paymentProof && record.paymentProof.trim()) {
      paymentsWithProof++;
    } else {
      paymentsWithoutProof++;
    }
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 RESUMEN DE ANÁLISIS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📝 Registros totales: ${allRecords.length}`);
  console.log(`   ├─ A aprobaciones (pending_players): ${playersToPending.length} registros`);
  console.log(`   └─ A jugadores aprobados (players): ${playersToApproved.length} registros\n`);
  
  console.log(`👥 Jugadores totales: ${totalPendingPlayers + totalApprovedPlayers}`);
  console.log(`   ├─ A aprobaciones: ${totalPendingPlayers} jugadores`);
  console.log(`   └─ A jugadores aprobados: ${totalApprovedPlayers} jugadores\n`);
  
  console.log(`👨‍👩‍👧‍👦 Grupos familiares identificados: ${familyGroups.size}`);
  console.log(`   └─ Familias con múltiples jugadores: ${multiPlayerFamilies.length}\n`);
  
  console.log(`💳 Pagos:`);
  console.log(`   ├─ Con comprobante: ${paymentsWithProof}`);
  console.log(`   └─ Sin comprobante: ${paymentsWithoutProof}\n`);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 DETALLE DE FAMILIAS CON MÚLTIPLES JUGADORES');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  multiPlayerFamilies.slice(0, 10).forEach(([cedula, records]) => {
    const totalPlayers = records.reduce((sum, r) => sum + r.playerCount, 0);
    const tutorName = records[0].tutorName;
    console.log(`  ${tutorName} (${cedula}): ${totalPlayers} jugadores`);
  });
  
  if (multiPlayerFamilies.length > 10) {
    console.log(`  ... y ${multiPlayerFamilies.length - 10} familias más\n`);
  }
  
  console.log('\n✅ Análisis completado. Listo para importar.\n');
}

analyze().catch(console.error);

