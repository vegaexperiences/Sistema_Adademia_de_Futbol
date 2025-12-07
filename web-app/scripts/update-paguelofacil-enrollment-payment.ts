#!/usr/bin/env ts-node
/**
 * Script para actualizar manualmente un pago de enrollment de PagueloFacil
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

async function updatePagueloFacilEnrollmentPayment() {
  console.log('\n🔧 Actualizar Pago de Enrollment de PagueloFacil\n');

  // Check if arguments were provided via command line
  const args = process.argv.slice(2);
  let operationNumber = args[0] || '';
  let amount = args[1] || '';
  let orderId = args[2] || '';
  let autoConfirm = args.includes('--yes') || args.includes('-y');

  // If not provided via command line, ask interactively
  if (!operationNumber) {
    operationNumber = await askQuestion('Número de Operación (ej: LK-ETILS0LHMNH9): ');
  }
  if (!amount) {
    amount = await askQuestion('Monto pagado (ej: 80.00): ');
  }
  if (!orderId && !autoConfirm) {
    orderId = await askQuestion('Order ID (opcional, presiona Enter si no lo tienes): ');
  }

  if (!operationNumber || !amount) {
    console.log('❌ Se requiere número de operación y monto');
    console.log('\nUso: npx tsx scripts/update-paguelofacil-enrollment-payment.ts <numero_operacion> <monto> [order_id] [--yes]');
    console.log('Ejemplo: npx tsx scripts/update-paguelofacil-enrollment-payment.ts LK-ETILS0LHMNH9 80.00');
    rl.close();
    return;
  }

  try {
    console.log('\n🔍 Buscando pago de enrollment...');

    let existingPayment = null;

    // 1. Search by operation number
    if (operationNumber) {
      console.log('   Buscando por número de operación:', operationNumber);
      const { data: paymentsByOper } = await supabase
        .from('payments')
        .select('*')
        .eq('type', 'enrollment')
        .eq('method', 'paguelofacil')
        .or(`notes.ilike.%${operationNumber}%,notes.ilike.%${operationNumber.toLowerCase()}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (paymentsByOper && paymentsByOper.length > 0) {
        existingPayment = paymentsByOper[0];
        console.log('   ✅ Pago encontrado por número de operación:', existingPayment.id);
      }
    }

    // 2. Search by orderId if not found
    if (!existingPayment && orderId) {
      console.log('   Buscando por orderId:', orderId);
      const { data: paymentsByOrder } = await supabase
        .from('payments')
        .select('*')
        .eq('type', 'enrollment')
        .eq('method', 'paguelofacil')
        .or(`notes.ilike.%${orderId}%,notes.ilike.%${orderId.toLowerCase()}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (paymentsByOrder && paymentsByOrder.length > 0) {
        existingPayment = paymentsByOrder[0];
        console.log('   ✅ Pago encontrado por orderId:', existingPayment.id);
      }
    }

    // 3. Search by amount if still not found
    if (!existingPayment) {
      console.log('   Buscando por monto:', amount);
      const { data: paymentsByAmount } = await supabase
        .from('payments')
        .select('*')
        .eq('type', 'enrollment')
        .eq('method', 'paguelofacil')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsByAmount && paymentsByAmount.length > 0) {
        const paymentAmount = parseFloat(amount);
        const matchingPayment = paymentsByAmount.find(p => {
          const paymentAmt = parseFloat(p.amount);
          return Math.abs(paymentAmt - paymentAmount) <= 1;
        });

        if (matchingPayment) {
          existingPayment = matchingPayment;
          console.log('   ✅ Pago encontrado por monto:', existingPayment.id);
        }
      }
    }

    if (!existingPayment) {
      console.log('\n⚠️  No se encontró ningún pago pendiente con esos criterios.');
      console.log('\n🔍 Buscando cualquier pago de enrollment reciente...');
      
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('type', 'enrollment')
        .eq('method', 'paguelofacil')
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

        const selectedIndex = await askQuestion(`\n¿Quieres actualizar alguno de estos? (1-${recentPayments.length}, o Enter para cancelar): `);
        if (selectedIndex && !isNaN(parseInt(selectedIndex))) {
          const index = parseInt(selectedIndex) - 1;
          if (index >= 0 && index < recentPayments.length) {
            existingPayment = recentPayments[index];
          }
        }
      }

      if (!existingPayment) {
        // If no payment found, offer to create a new one
        console.log('\n⚠️  No se encontró ningún pago existente.');
        const createNew = await askQuestion('¿Deseas crear un nuevo pago con estos datos? (SI/no): ');
        
        if (createNew.trim().toUpperCase() !== 'SI' && createNew.trim().toUpperCase() !== 'S') {
          console.log('❌ Operación cancelada.');
          rl.close();
          return;
        }
        
        // Create new payment
        const operationInfo = `Paguelo Fácil Operación: ${operationNumber}`;
        const paymentNotes = `Pago de matrícula procesado con Paguelo Fácil.\n${operationInfo}. Monto: $${amount}. Creado manualmente: ${new Date().toISOString()}\n\nNota: Este pago se creó manualmente porque no se encontró un pago pendiente asociado.`;
        
        const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert({
            player_id: null,
            amount: parseFloat(amount),
            type: 'enrollment',
            method: 'paguelofacil',
            payment_date: new Date().toISOString().split('T')[0],
            status: 'Approved',
            notes: paymentNotes,
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Error creando pago:', createError.message);
          rl.close();
          return;
        }
        
        console.log('\n✅ Pago creado exitosamente!');
        console.log(`   ID: ${newPayment.id}`);
        console.log(`   Estado: Approved`);
        console.log(`   Monto: $${amount}`);
        console.log(`   Número de Operación: ${operationNumber}`);
        rl.close();
        return;
      }
    }

    // Update payment
    if (existingPayment) {
      console.log(`\n📝 Pago encontrado:`);
      console.log(`   ID: ${existingPayment.id}`);
      console.log(`   Monto: $${existingPayment.amount}`);
      console.log(`   Estado actual: ${existingPayment.status}`);
      console.log(`   Fecha: ${existingPayment.created_at}`);

      let confirm = 'no';
      if (!autoConfirm) {
        confirm = await askQuestion(`\n¿Actualizar este pago? (SI/no): `);
      } else {
        confirm = 'SI';
        console.log('\n✅ Confirmación automática (--yes)');
      }
      
      if (confirm.trim().toUpperCase() !== 'SI' && confirm.trim().toUpperCase() !== 'S') {
        console.log('❌ Operación cancelada');
        rl.close();
        return;
      }

      const operationInfo = `Paguelo Fácil Operación: ${operationNumber}`;
      const updatedNotes = `${existingPayment.notes || ''}\n\n${operationInfo}. Actualizado manualmente: ${new Date().toISOString()}`;

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'Approved',
          notes: updatedNotes,
        })
        .eq('id', existingPayment.id);

      if (updateError) {
        console.error('❌ Error actualizando pago:', updateError.message);
      } else {
        console.log('\n✅ Pago actualizado exitosamente!');
        console.log(`   ID: ${existingPayment.id}`);
        console.log(`   Estado: Approved`);
        console.log(`   Número de Operación: ${operationNumber}`);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

updatePagueloFacilEnrollmentPayment().catch(console.error);

