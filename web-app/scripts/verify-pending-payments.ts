#!/usr/bin/env ts-node
/**
 * Script para verificar que todos los pagos pendientes estén correctamente vinculados
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

async function verifyPayments() {
  console.log('\n🔍 Verificando pagos pendientes con comprobantes...\n');

  // Get all pending players
  const { data: pendingPlayers } = await supabase
    .from('pending_players')
    .select('id, first_name, last_name');

  // Get all pending payments with proof_url
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .in('status', ['Pending Approval', 'Pending'])
    .not('proof_url', 'is', null);

  console.log(`📊 Total jugadores pendientes: ${pendingPlayers?.length || 0}`);
  console.log(`📊 Total pagos con comprobantes: ${payments?.length || 0}\n`);

  let fixed = 0;
  let alreadyLinked = 0;
  let notFound = 0;

  for (const player of pendingPlayers || []) {
    const playerFullName = `${player.first_name} ${player.last_name}`.toLowerCase();
    
    // Find payments that should be linked to this player
    const relatedPayments = payments?.filter(p => {
      // Already linked
      if (p.player_id === player.id) return true;
      
      // Check by name in notes
      const notes = (p.notes || '').toLowerCase();
      if (notes.includes(playerFullName)) return true;
      
      // Check by pending player ID
      if (notes.includes(`[pending_player_id: ${player.id.toLowerCase()}]`)) return true;
      
      return false;
    }) || [];

    if (relatedPayments.length > 0) {
      for (const payment of relatedPayments) {
        // Check if payment needs to be updated with pending player ID
        const notes = payment.notes || '';
        if (!notes.includes(`[PENDING_PLAYER_ID: ${player.id}]`)) {
          console.log(`🔧 Actualizando pago para ${player.first_name} ${player.last_name}...`);
          
          const { error } = await supabase
            .from('payments')
            .update({
              notes: `${notes}\n[PENDING_PLAYER_ID: ${player.id}]`,
              status: 'Pending Approval' // Ensure it's set to Pending Approval
            })
            .eq('id', payment.id);

          if (error) {
            console.error(`   ❌ Error: ${error.message}`);
          } else {
            console.log(`   ✅ Pago actualizado`);
            fixed++;
          }
        } else {
          alreadyLinked++;
        }
      }
    } else {
      notFound++;
    }
  }

  console.log(`\n✅ Verificación completada:`);
  console.log(`   ├─ Pagos actualizados: ${fixed}`);
  console.log(`   ├─ Pagos ya vinculados: ${alreadyLinked}`);
  console.log(`   └─ Jugadores sin pagos: ${notFound}\n`);
}

verifyPayments().catch(console.error);

