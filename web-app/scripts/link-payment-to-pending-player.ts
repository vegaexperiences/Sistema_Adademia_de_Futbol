#!/usr/bin/env ts-node
/**
 * Script para vincular un pago a un jugador pendiente
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

async function linkPaymentToGabriel() {
  console.log('\n🔗 Vinculando pago a Gabriel Schwartz\n');

  // Find the player
  const { data: player, error: playerError } = await supabase
    .from('pending_players')
    .select('id, first_name, last_name')
    .eq('cedula', '81183820')
    .single();

  if (playerError || !player) {
    console.error('❌ Error: No se encontró el jugador');
    return;
  }

  console.log(`✅ Jugador encontrado: ${player.first_name} ${player.last_name} (ID: ${player.id})\n`);

  // Find the payment
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .is('player_id', null)
    .like('notes', '%Gabriel Schwartz%')
    .eq('proof_url', 'https://drive.google.com/u/0/open?usp=forms_web&id=13kiAGSNgL_WvqivmdFhqueXD4bqHQgvC');

  if (paymentsError) {
    console.error('❌ Error buscando pagos:', paymentsError.message);
    return;
  }

  if (!payments || payments.length === 0) {
    console.log('⚠️  No se encontró el pago. Buscando por proof_url alternativo...');
    
    // Try alternative URL format
    const { data: altPayments } = await supabase
      .from('payments')
      .select('*')
      .is('player_id', null)
      .like('notes', '%Gabriel Schwartz%')
      .or('proof_url.ilike.%13kiAGSNgL_WvqivmdFhqueXD4bqHQgvC%');

    if (altPayments && altPayments.length > 0) {
      console.log(`✅ Pago encontrado (formato alternativo): ${altPayments[0].id}\n`);
      
      // Update payment to link it to pending player
      // Note: We'll store the pending player ID in notes since payments table expects player_id from players table
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          notes: `${altPayments[0].notes || ''}\n[PENDING_PLAYER_ID: ${player.id}]`
        })
        .eq('id', altPayments[0].id);

      if (updateError) {
        console.error('❌ Error actualizando pago:', updateError.message);
      } else {
        console.log('✅ Pago actualizado con referencia al jugador pendiente');
        console.log(`   El comprobante está disponible en: ${altPayments[0].proof_url}`);
        console.log(`   Nota: Los pagos de jugadores pendientes se muestran en la sección de aprobaciones\n`);
      }
      return;
    }
    
    console.error('❌ No se encontró el pago');
    return;
  }

  const payment = payments[0];
  console.log(`✅ Pago encontrado: ${payment.id}`);
  console.log(`   Monto: $${payment.amount}`);
  console.log(`   Método: ${payment.method}`);
  console.log(`   Proof URL: ${payment.proof_url}\n`);

  // Update payment to link it to pending player
  // Note: We'll store the pending player ID in notes since payments table expects player_id from players table
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      notes: `${payment.notes || ''}\n[PENDING_PLAYER_ID: ${player.id}]`
    })
    .eq('id', payment.id);

  if (updateError) {
    console.error('❌ Error actualizando pago:', updateError.message);
  } else {
    console.log('✅ Pago actualizado con referencia al jugador pendiente');
    console.log(`   El comprobante está disponible en: ${payment.proof_url}`);
    console.log(`   Nota: Los pagos de jugadores pendientes se muestran en la sección de aprobaciones\n`);
  }
}

linkPaymentToGabriel().catch(console.error);

