/**
 * Script to diagnose why payments are not appearing in finances
 * Specifically for Enrique Arturo Sousa-Lennox Fonseca
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnosePayments() {
  console.log('🔍 Diagnosing missing payments...\n');

  // Search for player Enrique Arturo Sousa-Lennox Fonseca
  const playerName = 'Enrique Arturo Sousa-Lennox Fonseca';
  const nameParts = playerName.split(' ');
  const firstName = nameParts.slice(0, -1).join(' ');
  const lastName = nameParts[nameParts.length - 1];

  console.log(`Searching for player: ${firstName} ${lastName}\n`);

  // Find player
  const { data: players, error: playerError } = await supabase
    .from('players')
    .select('id, first_name, last_name, academy_id, status')
    .ilike('first_name', `%${firstName}%`)
    .ilike('last_name', `%${lastName}%`);

  if (playerError) {
    console.error('Error finding player:', playerError);
    return;
  }

  if (!players || players.length === 0) {
    console.log('❌ Player not found');
    return;
  }

  console.log(`✅ Found ${players.length} player(s):`);
  players.forEach((player, idx) => {
    console.log(`  ${idx + 1}. ${player.first_name} ${player.last_name}`);
    console.log(`     ID: ${player.id}`);
    console.log(`     Academy ID: ${player.academy_id || 'NULL'}`);
    console.log(`     Status: ${player.status}`);
    console.log('');
  });

  // Get all payments for these players
  const playerIds = players.map(p => p.id);
  console.log(`\n🔍 Searching for payments for player IDs: ${playerIds.join(', ')}\n`);

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, amount, payment_date, type, method, status, academy_id, player_id, notes')
    .in('player_id', playerIds)
    .order('payment_date', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
    return;
  }

  console.log(`✅ Found ${payments?.length || 0} payment(s):\n`);

  if (!payments || payments.length === 0) {
    console.log('❌ No payments found for this player');
    return;
  }

  payments.forEach((payment, idx) => {
    console.log(`Payment ${idx + 1}:`);
    console.log(`  ID: ${payment.id}`);
    console.log(`  Amount: $${payment.amount}`);
    console.log(`  Date: ${payment.payment_date}`);
    console.log(`  Type: ${payment.type}`);
    console.log(`  Method: ${payment.method || 'NULL'}`);
    console.log(`  Status: ${payment.status || 'NULL'}`);
    console.log(`  Academy ID: ${payment.academy_id || 'NULL'}`);
    console.log(`  Player ID: ${payment.player_id}`);
    console.log(`  Notes: ${payment.notes?.substring(0, 100) || 'NULL'}...`);
    
    // Check why it might not appear
    const issues: string[] = [];
    if (parseFloat(payment.amount.toString()) <= 0) {
      issues.push('❌ Amount <= 0');
    }
    if (payment.status === 'Rejected') {
      issues.push('❌ Status is Rejected');
    }
    if (payment.status === 'Cancelled') {
      issues.push('❌ Status is Cancelled');
    }
    if (!payment.academy_id) {
      issues.push('⚠️  No academy_id (will check player\'s academy_id)');
    }
    if (!payment.player_id) {
      issues.push('❌ No player_id');
    }

    if (issues.length > 0) {
      console.log(`  Issues: ${issues.join(', ')}`);
    } else {
      console.log(`  ✅ Should appear in transactions`);
    }
    console.log('');
  });

  // Also check for payments without academy_id that might belong to these players
  console.log('\n🔍 Checking for payments without academy_id...\n');
  
  const { data: paymentsWithoutAcademy, error: paymentsWithoutAcademyError } = await supabase
    .from('payments')
    .select('id, amount, payment_date, type, method, status, academy_id, player_id, notes')
    .in('player_id', playerIds)
    .is('academy_id', null)
    .order('payment_date', { ascending: false });

  if (!paymentsWithoutAcademyError && paymentsWithoutAcademy && paymentsWithoutAcademy.length > 0) {
    console.log(`⚠️  Found ${paymentsWithoutAcademy.length} payment(s) without academy_id:\n`);
    paymentsWithoutAcademy.forEach((payment, idx) => {
      console.log(`  ${idx + 1}. Payment ${payment.id}: $${payment.amount} on ${payment.payment_date} (Status: ${payment.status || 'NULL'})`);
    });
  }
}

diagnosePayments()
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

