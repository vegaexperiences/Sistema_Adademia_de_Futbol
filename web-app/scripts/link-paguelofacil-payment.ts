#!/usr/bin/env ts-node
/**
 * Script para vincular un pago de PagueloFacil a jugadores pendientes
 * Útil cuando el callback no pudo vincular automáticamente el pago
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function linkPagueloFacilPayment() {
  const args = process.argv.slice(2);
  const operationNumber = args[0] || 'LK-ME3HFYHDJYSI';
  const amount = args[1] ? parseFloat(args[1]) : 80.00;
  
  console.log('\n🔧 Vinculando pago de PagueloFacil a jugadores pendientes...');
  console.log('   Número de Operación:', operationNumber);
  console.log('   Monto:', `$${amount}`);
  
  // 1. Buscar el pago
  console.log('\n1️⃣ Buscando pago...');
  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .or(`notes.ilike.%${operationNumber}%,notes.ilike.%${operationNumber.toLowerCase()}%`)
    .order('payment_date', { ascending: false })
    .limit(5);
  
  let payment;
  if (paymentError) {
    console.error('❌ Error buscando pago:', paymentError.message);
    process.exit(1);
  } else if (payments && payments.length > 0) {
    payment = payments[0];
    console.log(`✅ Pago encontrado: ${payment.id}`);
    console.log(`   Estado: ${payment.status}`);
    console.log(`   Monto: $${payment.amount}`);
    console.log(`   Método: ${payment.method}`);
  } else {
    console.log('❌ No se encontró el pago. Creando uno nuevo...');
    
    // Crear el pago
    const { data: newPayment, error: createError } = await supabase
      .from('payments')
      .insert({
        player_id: null,
        amount: amount,
        type: 'enrollment',
        method: 'paguelofacil',
        payment_date: new Date().toISOString().split('T')[0],
        status: 'Approved', // La entidad ya confirmó el pago
        notes: `Pago de matrícula procesado con Paguelo Fácil. Operación: ${operationNumber}. Monto: $${amount}. Creado manualmente.`,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creando pago:', createError.message);
      process.exit(1);
    }
    
    payment = newPayment;
    console.log(`✅ Pago creado: ${payment.id}`);
  }
  
  // 2. Verificar si ya está vinculado
  if (payment.notes?.includes('Pending Player IDs:')) {
    console.log('\n✅ El pago ya está vinculado a jugadores pendientes');
    console.log('   Notas:', payment.notes.substring(0, 300) + '...');
    process.exit(0);
  }
  
  // 3. Buscar jugadores pendientes recientes (últimas 2 horas)
  console.log('\n2️⃣ Buscando jugadores pendientes recientes (últimas 2 horas)...');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: recentPlayers, error: playersError } = await supabase
    .from('pending_players')
    .select('id, first_name, last_name, family_id, created_at')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (playersError) {
    console.error('❌ Error buscando jugadores:', playersError.message);
    process.exit(1);
  }
  
  if (!recentPlayers || recentPlayers.length === 0) {
    console.log('⚠️  No se encontraron jugadores pendientes recientes');
    console.log('   El pago se creó pero no se pudo vincular automáticamente.');
    console.log('   Puedes vincularlo manualmente desde la página de aprobaciones.');
    process.exit(0);
  }
  
  // 4. Obtener precio de enrollment
  const { data: priceSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'price_enrollment')
    .single();
  
  const enrollmentPrice = priceSetting ? Number(priceSetting.value) : 80;
  const expectedPlayerCount = Math.round(amount / enrollmentPrice);
  
  console.log(`   Precio de enrollment: $${enrollmentPrice}`);
  console.log(`   Jugadores esperados: ${expectedPlayerCount}`);
  console.log(`   Jugadores encontrados: ${recentPlayers.length}`);
  
  // 5. Buscar jugadores sin pagos vinculados
  const candidates: any[] = [];
  for (const player of recentPlayers) {
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('id, notes')
      .eq('type', 'enrollment')
      .or(`notes.ilike.%Pending Player IDs: ${player.id}%,notes.ilike.%, ${player.id}%`);
    
    if (!existingPayments || existingPayments.length === 0) {
      candidates.push(player);
    }
  }
  
  if (candidates.length === 0) {
    console.log('\n⚠️  Todos los jugadores recientes ya tienen pagos vinculados');
    process.exit(0);
  }
  
  // 6. Intentar hacer match por monto
  let matchedPlayerIds: string[] = [];
  
  // Agrupar por familia
  const playersByFamily = new Map<string, any[]>();
  const individualPlayers: any[] = [];
  
  for (const player of candidates) {
    if (player.family_id) {
      if (!playersByFamily.has(player.family_id)) {
        playersByFamily.set(player.family_id, []);
      }
      playersByFamily.get(player.family_id)!.push(player);
    } else {
      individualPlayers.push(player);
    }
  }
  
  // Intentar match por familia
  for (const [familyId, familyPlayers] of playersByFamily.entries()) {
    const familyEnrollmentAmount = familyPlayers.length * enrollmentPrice;
    const amountDifference = Math.abs(familyEnrollmentAmount - amount);
    
    if (amountDifference <= 1) {
      matchedPlayerIds = familyPlayers.map(p => p.id);
      console.log(`\n✅ Match encontrado: Familia con ${familyPlayers.length} jugador(es)`);
      break;
    }
  }
  
  // Si no hay match de familia, intentar individual
  if (matchedPlayerIds.length === 0) {
    for (const player of individualPlayers) {
      const individualEnrollmentAmount = enrollmentPrice;
      const amountDifference = Math.abs(individualEnrollmentAmount - amount);
      
      if (amountDifference <= 1) {
        matchedPlayerIds = [player.id];
        console.log(`\n✅ Match encontrado: Jugador individual`);
        break;
      }
    }
  }
  
  // Si aún no hay match, tomar el más reciente
  if (matchedPlayerIds.length === 0 && expectedPlayerCount > 0) {
    matchedPlayerIds = candidates.slice(0, expectedPlayerCount).map(p => p.id);
    console.log(`\n⚠️  No se encontró match exacto. Vinculando a los ${expectedPlayerCount} jugador(es) más reciente(s) sin pago`);
  } else if (matchedPlayerIds.length === 0) {
    matchedPlayerIds = [candidates[0].id];
    console.log(`\n⚠️  No se encontró match exacto. Vinculando al jugador más reciente sin pago`);
  }
  
  // 7. Vincular el pago
  if (matchedPlayerIds.length > 0) {
    console.log(`\n3️⃣ Vinculando pago a ${matchedPlayerIds.length} jugador(es)...`);
    
    const playerIdsString = matchedPlayerIds.join(', ');
    const currentNotes = payment.notes || '';
    const updatedNotes = `${currentNotes}\n\nVinculado manualmente a jugador(es) pendiente(s): ${playerIdsString}. Pending Player IDs: ${playerIdsString}`;
    
    const { error: updateError } = await supabase
      .from('payments')
      .update({ notes: updatedNotes })
      .eq('id', payment.id);
    
    if (updateError) {
      console.error('❌ Error actualizando pago:', updateError.message);
      process.exit(1);
    }
    
    console.log('\n✅ Pago vinculado exitosamente!');
    console.log(`   Pago ID: ${payment.id}`);
    console.log(`   Jugadores vinculados: ${matchedPlayerIds.length}`);
    matchedPlayerIds.forEach((id, i) => {
      const player = candidates.find(p => p.id === id);
      if (player) {
        console.log(`   ${i + 1}. ${player.first_name} ${player.last_name} (${id})`);
      }
    });
    console.log('\n💡 El jugador ahora aparecerá en la página de aprobaciones.');
  } else {
    console.log('\n⚠️  No se pudo vincular el pago automáticamente');
    console.log('   Puedes vincularlo manualmente desde la página de aprobaciones.');
  }
}

linkPagueloFacilPayment().catch(console.error);

