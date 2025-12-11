#!/usr/bin/env ts-node
/**
 * Script para buscar un jugador y verificar sus pagos
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

async function searchPlayer(playerName: string) {
  console.log(`\n🔍 Buscando jugador: "${playerName}"\n`);

  // Search in players table
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*, families(*)')
    .or(`first_name.ilike.%${playerName}%,last_name.ilike.%${playerName}%`)
    .order('first_name');

  if (playersError) {
    console.error('❌ Error buscando en players:', playersError.message);
  } else {
    console.log(`✅ Jugadores encontrados (players): ${players?.length || 0}`);
    players?.forEach(player => {
      console.log(`\n  👤 ${player.first_name} ${player.last_name}`);
      console.log(`     ID: ${player.id}`);
      console.log(`     Categoría: ${player.category}`);
      console.log(`     Estado: ${player.status}`);
      console.log(`     Familia ID: ${player.family_id || 'N/A'}`);
    });
  }

  // Search in pending_players table
  const { data: pendingPlayers, error: pendingError } = await supabase
    .from('pending_players')
    .select('*')
    .or(`first_name.ilike.%${playerName}%,last_name.ilike.%${playerName}%`)
    .order('first_name');

  if (pendingError) {
    console.error('❌ Error buscando en pending_players:', pendingError.message);
  } else {
    console.log(`\n⏳ Jugadores pendientes encontrados: ${pendingPlayers?.length || 0}`);
    pendingPlayers?.forEach(player => {
      console.log(`\n  👤 ${player.first_name} ${player.last_name}`);
      console.log(`     ID: ${player.id}`);
      console.log(`     Categoría: ${player.category}`);
      console.log(`     Tutor: ${player.tutor_name}`);
    });
  }

  // Get payments for found players
  const allPlayerIds = [
    ...(players?.map(p => p.id) || []),
    ...(pendingPlayers?.map(p => p.id) || [])
  ];

  if (allPlayerIds.length > 0) {
    console.log(`\n💳 Buscando pagos para estos jugadores...\n`);
    
    // For approved players
    for (const playerId of players?.map(p => p.id) || []) {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('player_id', playerId)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error(`   ❌ Error buscando pagos para ${playerId}:`, paymentsError.message);
      } else {
        const player = players?.find(p => p.id === playerId);
        console.log(`   📋 Pagos para ${player?.first_name} ${player?.last_name}: ${payments?.length || 0}`);
        payments?.forEach(payment => {
          console.log(`      - ${payment.type} | $${payment.amount} | ${payment.method} | ${payment.payment_date}`);
          console.log(`        Estado: ${payment.status} | Proof URL: ${payment.proof_url || 'N/A'}`);
        });
      }
    }

    // For pending players - check unlinked payments
    for (const playerId of pendingPlayers?.map(p => p.id) || []) {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .is('player_id', null)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error(`   ❌ Error buscando pagos pendientes:`, paymentsError.message);
      } else {
        const player = pendingPlayers?.find(p => p.id === playerId);
        console.log(`   📋 Pagos sin vincular (posiblemente para ${player?.first_name} ${player?.last_name}): ${payments?.length || 0}`);
        payments?.forEach(payment => {
          if (payment.notes?.toLowerCase().includes(player?.first_name?.toLowerCase() || '') ||
              payment.notes?.toLowerCase().includes(player?.last_name?.toLowerCase() || '')) {
            console.log(`      - ${payment.type} | $${payment.amount} | ${payment.method} | ${payment.payment_date}`);
            console.log(`        Estado: ${payment.status} | Proof URL: ${payment.proof_url || 'N/A'}`);
            console.log(`        Notas: ${payment.notes}`);
          }
        });
      }
    }
  }
}

const playerName = process.argv[2] || 'Gabriel Schwartz';
searchPlayer(playerName).catch(console.error);

