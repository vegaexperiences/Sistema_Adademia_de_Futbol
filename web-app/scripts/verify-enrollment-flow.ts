#!/usr/bin/env ts-node
/**
 * Script para verificar el flujo completo de enrollment
 * Verifica que todos los métodos de pago funcionen correctamente
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

interface VerificationResult {
  method: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

async function verifyEnrollmentFlow() {
  console.log('\n🔍 Verificando flujo completo de enrollment...\n');

  const results: VerificationResult[] = [];

  // 1. Verificar que existan jugadores pendientes
  console.log('1️⃣ Verificando jugadores pendientes...');
  const { data: pendingPlayers, error: playersError } = await supabase
    .from('pending_players')
    .select('id, first_name, last_name, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (playersError) {
    results.push({
      method: 'Database',
      status: 'fail',
      message: `Error al consultar jugadores pendientes: ${playersError.message}`,
    });
  } else {
    results.push({
      method: 'Database',
      status: 'pass',
      message: `✅ Encontrados ${pendingPlayers?.length || 0} jugadores pendientes`,
      details: { count: pendingPlayers?.length || 0 },
    });
  }

  // 2. Verificar pagos de enrollment pendientes
  console.log('\n2️⃣ Verificando pagos de enrollment pendientes...');
  const { data: pendingPayments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, type, method, amount, status, notes, payment_date, updated_at')
    .eq('type', 'enrollment')
    .in('status', ['Pending', 'Pending Approval'])
    .order('payment_date', { ascending: false })
    .limit(10);

  if (paymentsError) {
    results.push({
      method: 'Payments',
      status: 'fail',
      message: `Error al consultar pagos pendientes: ${paymentsError.message}`,
    });
  } else {
    const paymentsByMethod = (pendingPayments || []).reduce((acc: any, p: any) => {
      acc[p.method] = (acc[p.method] || 0) + 1;
      return acc;
    }, {});

    results.push({
      method: 'Payments',
      status: 'pass',
      message: `✅ Encontrados ${pendingPayments?.length || 0} pagos de enrollment pendientes`,
      details: {
        total: pendingPayments?.length || 0,
        byMethod: paymentsByMethod,
      },
    });
  }

  // 3. Verificar vinculación de pagos a jugadores pendientes
  console.log('\n3️⃣ Verificando vinculación de pagos a jugadores...');
  if (pendingPlayers && pendingPayments) {
    let linkedCount = 0;
    let unlinkedCount = 0;

    for (const payment of pendingPayments) {
      // Check if payment notes contain player IDs
      const notes = payment.notes || '';
      const hasPlayerIds = notes.includes('Pending Player IDs:') || notes.includes('player_id');

      if (hasPlayerIds) {
        linkedCount++;
      } else {
        unlinkedCount++;
      }
    }

    results.push({
      method: 'Linking',
      status: unlinkedCount > 0 ? 'warning' : 'pass',
      message: `✅ ${linkedCount} pagos vinculados, ⚠️ ${unlinkedCount} pagos sin vincular`,
      details: {
        linked: linkedCount,
        unlinked: unlinkedCount,
      },
    });
  }

  // 4. Verificar métodos de pago específicos
  console.log('\n4️⃣ Verificando métodos de pago específicos...');

  // Yappy
  const { data: yappyPayments } = await supabase
    .from('payments')
    .select('id, status, notes')
    .eq('type', 'enrollment')
    .eq('method', 'yappy')
    .order('payment_date', { ascending: false })
    .limit(5);

  const yappyApproved = yappyPayments?.filter(p => p.status === 'Approved').length || 0;
  const yappyPending = yappyPayments?.filter(p => p.status === 'Pending' || p.status === 'Pending Approval').length || 0;

  results.push({
    method: 'Yappy',
    status: yappyPayments && yappyPayments.length > 0 ? 'pass' : 'warning',
    message: `Yappy: ${yappyApproved} aprobados, ${yappyPending} pendientes`,
    details: {
      total: yappyPayments?.length || 0,
      approved: yappyApproved,
      pending: yappyPending,
    },
  });

  // PagueloFacil
  const { data: pagueloPayments } = await supabase
    .from('payments')
    .select('id, status, notes')
    .eq('type', 'enrollment')
    .eq('method', 'paguelofacil')
    .order('payment_date', { ascending: false })
    .limit(5);

  const pagueloApproved = pagueloPayments?.filter(p => p.status === 'Approved').length || 0;
  const pagueloPending = pagueloPayments?.filter(p => p.status === 'Pending' || p.status === 'Pending Approval').length || 0;

  results.push({
    method: 'PagueloFacil',
    status: pagueloPayments && pagueloPayments.length > 0 ? 'pass' : 'warning',
    message: `PagueloFacil: ${pagueloApproved} aprobados, ${pagueloPending} pendientes`,
    details: {
      total: pagueloPayments?.length || 0,
      approved: pagueloApproved,
      pending: pagueloPending,
    },
  });

  // Transfer/Comprobante
  const { data: manualPayments } = await supabase
    .from('payments')
    .select('id, method, status, proof_url')
    .eq('type', 'enrollment')
    .in('method', ['transfer', 'cash'])
    .order('payment_date', { ascending: false })
    .limit(5);

  const manualWithProof = manualPayments?.filter(p => p.proof_url).length || 0;
  const manualWithoutProof = manualPayments?.filter(p => !p.proof_url).length || 0;

  results.push({
    method: 'Transfer/Comprobante',
    status: manualPayments && manualPayments.length > 0 ? 'pass' : 'warning',
    message: `Transfer/Comprobante: ${manualPayments?.length || 0} pagos (${manualWithProof} con comprobante, ${manualWithoutProof} sin comprobante)`,
    details: {
      total: manualPayments?.length || 0,
      withProof: manualWithProof,
      withoutProof: manualWithoutProof,
    },
  });

  // 5. Verificar configuración de métodos de pago
  console.log('\n5️⃣ Verificando configuración de métodos de pago...');
  const { data: paymentMethodsSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'payment_methods')
    .single();

  if (paymentMethodsSetting) {
    try {
      const methods = JSON.parse(paymentMethodsSetting.value);
      results.push({
        method: 'Config',
        status: 'pass',
        message: `✅ Métodos configurados: ${Object.keys(methods).filter(k => methods[k]).join(', ')}`,
        details: methods,
      });
    } catch (e) {
      results.push({
        method: 'Config',
        status: 'warning',
        message: `⚠️ Error al parsear configuración de métodos: ${e}`,
      });
    }
  } else {
    results.push({
      method: 'Config',
      status: 'warning',
      message: '⚠️ No se encontró configuración de métodos de pago',
    });
  }

  // 6. Verificar que los pagos aparezcan en aprobaciones
  console.log('\n6️⃣ Verificando que los pagos aparezcan en aprobaciones...');
  if (pendingPlayers && pendingPayments) {
    let playersWithPayments = 0;
    let playersWithoutPayments = 0;

    for (const player of pendingPlayers) {
      const playerId = player.id;
      const hasPayment = pendingPayments.some(p => {
        const notes = p.notes || '';
        return notes.includes(`Pending Player IDs: ${playerId}`) || 
               notes.includes(`Pending Player IDs: ${playerId},`) ||
               notes.includes(playerId);
      });

      if (hasPayment) {
        playersWithPayments++;
      } else {
        playersWithoutPayments++;
      }
    }

    results.push({
      method: 'Approvals',
      status: playersWithoutPayments > 0 ? 'warning' : 'pass',
      message: `✅ ${playersWithPayments} jugadores con pagos, ⚠️ ${playersWithoutPayments} jugadores sin pagos`,
      details: {
        withPayments: playersWithPayments,
        withoutPayments: playersWithoutPayments,
      },
    });
  }

  // Mostrar resultados
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESULTADOS DE VERIFICACIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');

  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${result.method}: ${result.message}`);
    if (result.details) {
      console.log(`   Detalles:`, JSON.stringify(result.details, null, 2).split('\n').join('\n   '));
    }
  });

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✅ Pasados: ${passCount} | ❌ Fallidos: ${failCount} | ⚠️ Advertencias: ${warningCount}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failCount > 0) {
    console.log('❌ Se encontraron errores críticos. Revisa los detalles arriba.\n');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️ Se encontraron advertencias. El sistema puede funcionar pero hay áreas de mejora.\n');
    process.exit(0);
  } else {
    console.log('✅ Todas las verificaciones pasaron correctamente.\n');
    process.exit(0);
  }
}

verifyEnrollmentFlow().catch(console.error);

