#!/usr/bin/env ts-node
/**
 * Script para actualizar manualmente un pago de enrollment de Yappy
 * con el número de operación
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function updateYappyEnrollmentPayment() {
  console.log('\n🔧 Actualizar Pago de Enrollment de Yappy\n');

  const transactionId = await askQuestion('Número de Operación (ej: LK-ETILS0LHMNH9): ');
  const amount = await askQuestion('Monto pagado (ej: 80.00): ');
  const orderId = await askQuestion('Order ID (opcional, presiona Enter si no lo tienes): ');

  if (!transactionId || !amount) {
    console.log('❌ Se requiere número de operación y monto');
    rl.close();
    return;
  }

  try {
    console.log('\n🔍 Buscando pago de enrollment pendiente...');

    // Search for pending enrollment payment with matching amount
    const { data: payments, error: searchError } = await supabase
      .from('payments')
      .select('*')
      .eq('type', 'enrollment')
      .eq('method', 'yappy')
      .eq('status', 'Pending')
      .eq('amount', parseFloat(amount))
      .order('created_at', { ascending: false })
      .limit(10);

    if (searchError) {
      console.error('❌ Error buscando pagos:', searchError.message);
      rl.close();
      return;
    }

    if (!payments || payments.length === 0) {
      console.log('⚠️  No se encontraron pagos pendientes con ese monto');
      console.log('\n🔍 Buscando cualquier pago de enrollment reciente...');
      
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('type', 'enrollment')
        .eq('method', 'yappy')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentPayments && recentPayments.length > 0) {
        console.log('\n📋 Pagos recientes encontrados:');
        recentPayments.forEach((p, i) => {
          console.log(`\n  ${i + 1}. ID: ${p.id}`);
          console.log(`     Monto: $${p.amount}`);
          console.log(`     Estado: ${p.status}`);
          console.log(`     Fecha: ${p.created_at}`);
          console.log(`     Notas: ${p.notes?.substring(0, 100) || 'N/A'}...`);
        });
      }
      rl.close();
      return;
    }

    console.log(`\n✅ Se encontraron ${payments.length} pago(s) pendiente(s) con monto $${amount}:`);
    payments.forEach((p, i) => {
      console.log(`\n  ${i + 1}. ID: ${p.id}`);
      console.log(`     Fecha: ${p.created_at}`);
      console.log(`     Notas: ${p.notes?.substring(0, 150) || 'N/A'}...`);
    });

    if (payments.length === 1) {
      const payment = payments[0];
      const confirm = await askQuestion(`\n¿Actualizar este pago? (SI/no): `);
      
      if (confirm.trim().toUpperCase() !== 'SI' && confirm.trim().toUpperCase() !== 'S') {
        console.log('❌ Operación cancelada');
        rl.close();
        return;
      }

      const updatedNotes = `${payment.notes || ''}\n\nPago confirmado con Yappy. Orden: ${orderId || 'N/A'}. Transacción: ${transactionId}. Número de Operación: ${transactionId}`;

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'Approved',
          notes: updatedNotes,
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('❌ Error actualizando pago:', updateError.message);
      } else {
        console.log('\n✅ Pago actualizado exitosamente!');
        console.log(`   ID: ${payment.id}`);
        console.log(`   Estado: Approved`);
        console.log(`   Número de Operación: ${transactionId}`);
      }
    } else {
      const selectedIndex = await askQuestion(`\n¿Cuál pago quieres actualizar? (1-${payments.length}): `);
      const index = parseInt(selectedIndex) - 1;

      if (isNaN(index) || index < 0 || index >= payments.length) {
        console.log('❌ Selección inválida');
        rl.close();
        return;
      }

      const payment = payments[index];
      const updatedNotes = `${payment.notes || ''}\n\nPago confirmado con Yappy. Orden: ${orderId || 'N/A'}. Transacción: ${transactionId}. Número de Operación: ${transactionId}`;

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'Approved',
          notes: updatedNotes,
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('❌ Error actualizando pago:', updateError.message);
      } else {
        console.log('\n✅ Pago actualizado exitosamente!');
        console.log(`   ID: ${payment.id}`);
        console.log(`   Estado: Approved`);
        console.log(`   Número de Operación: ${transactionId}`);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

updateYappyEnrollmentPayment().catch(console.error);

