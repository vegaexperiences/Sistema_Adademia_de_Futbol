#!/usr/bin/env ts-node
/**
 * Script para actualizar el status del pago de Gabriel Schwartz
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

async function updatePaymentStatus() {
  console.log('\n🔄 Actualizando status del pago de Gabriel Schwartz\n');

  // Find the payment
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .like('notes', '%Gabriel Schwartz%')
    .or('proof_url.ilike.%13kiAGSNgL_WvqivmdFhqueXD4bqHQgvC%');

  if (paymentsError || !payments || payments.length === 0) {
    console.error('❌ Error: No se encontró el pago');
    return;
  }

  const payment = payments[0];
  console.log(`✅ Pago encontrado: ${payment.id}`);
  console.log(`   Status actual: ${payment.status}\n`);

  // Update status to 'Pending Approval' so it shows in approvals page
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'Pending Approval'
    })
    .eq('id', payment.id);

  if (updateError) {
    console.error('❌ Error actualizando status:', updateError.message);
  } else {
    console.log('✅ Status actualizado a "Pending Approval"');
    console.log(`   El comprobante ahora será visible en la página de aprobaciones\n`);
  }
}

updatePaymentStatus().catch(console.error);

