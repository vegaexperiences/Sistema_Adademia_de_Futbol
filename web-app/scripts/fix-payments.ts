/**
 * Script para diagnosticar y corregir pagos que no se reflejan en finanzas
 * 
 * Problemas que detecta y corrige:
 * - Pagos con status null, vacío, o diferente de 'Approved'
 * - Pagos sin academy_id
 * - Pagos sin player_id cuando deberían tenerlo
 * - Pagos con método "transfer" que no aparecen en finanzas
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface PaymentIssue {
  payment_id: string;
  issue: string;
  current_value: any;
  suggested_fix: any;
}

async function diagnosePayments() {
  console.log('🔍 Analizando pagos...\n');

  // Get all payments
  const { data: allPayments, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('❌ Error fetching payments:', error);
    return;
  }

  if (!allPayments || allPayments.length === 0) {
    console.log('ℹ️  No hay pagos en la base de datos');
    return;
  }

  console.log(`📊 Total de pagos encontrados: ${allPayments.length}\n`);

  const issues: PaymentIssue[] = [];
  const stats = {
    total: allPayments.length,
    withNullStatus: 0,
    withEmptyStatus: 0,
    withWrongStatus: 0,
    withoutAcademyId: 0,
    withoutPlayerId: 0,
    transferPayments: 0,
    transferPaymentsWithIssues: 0,
  };

  // Analyze each payment
  for (const payment of allPayments) {
    // Check status
    if (payment.status === null || payment.status === undefined) {
      issues.push({
        payment_id: payment.id,
        issue: 'status is null',
        current_value: null,
        suggested_fix: 'Approved',
      });
      stats.withNullStatus++;
    } else if (payment.status === '') {
      issues.push({
        payment_id: payment.id,
        issue: 'status is empty string',
        current_value: '',
        suggested_fix: 'Approved',
      });
      stats.withEmptyStatus++;
    } else if (payment.status !== 'Approved' && payment.status !== 'Pending' && payment.status !== 'Rejected' && payment.status !== 'Cancelled') {
      issues.push({
        payment_id: payment.id,
        issue: `status is invalid: "${payment.status}"`,
        current_value: payment.status,
        suggested_fix: 'Approved',
      });
      stats.withWrongStatus++;
    } else if (payment.status === 'Pending' && payment.method === 'transfer') {
      // Transfer payments should typically be Approved if they were manually registered
      issues.push({
        payment_id: payment.id,
        issue: 'transfer payment with Pending status (should be Approved for manual registrations)',
        current_value: payment.status,
        suggested_fix: 'Approved',
      });
      stats.transferPaymentsWithIssues++;
    }

    // Check academy_id
    if (!payment.academy_id) {
      issues.push({
        payment_id: payment.id,
        issue: 'missing academy_id',
        current_value: null,
        suggested_fix: 'needs manual assignment',
      });
      stats.withoutAcademyId++;
    }

    // Check player_id (only for non-enrollment payments that should have it)
    if (!payment.player_id && payment.type !== 'enrollment') {
      // This might be okay for enrollment payments, but we'll flag it
      if (payment.notes && payment.notes.includes('Matrícula')) {
        // Enrollment payment without player_id - might need linking
        // Don't flag as critical
      } else {
        issues.push({
          payment_id: payment.id,
          issue: 'missing player_id (non-enrollment payment)',
          current_value: null,
          suggested_fix: 'needs manual assignment',
        });
        stats.withoutPlayerId++;
      }
    }

    // Count transfer payments
    if (payment.method === 'transfer' || payment.method === 'Transferencia') {
      stats.transferPayments++;
    }
  }

  // Print statistics
  console.log('📈 Estadísticas:');
  console.log(`   Total pagos: ${stats.total}`);
  console.log(`   Pagos con status null: ${stats.withNullStatus}`);
  console.log(`   Pagos con status vacío: ${stats.withEmptyStatus}`);
  console.log(`   Pagos con status inválido: ${stats.withWrongStatus}`);
  console.log(`   Pagos sin academy_id: ${stats.withoutAcademyId}`);
  console.log(`   Pagos sin player_id: ${stats.withoutPlayerId}`);
  console.log(`   Pagos con método transfer: ${stats.transferPayments}`);
  console.log(`   Pagos transfer con problemas: ${stats.transferPaymentsWithIssues}\n`);

  // Print issues
  if (issues.length > 0) {
    console.log(`⚠️  Se encontraron ${issues.length} problemas:\n`);
    issues.slice(0, 20).forEach((issue, index) => {
      console.log(`${index + 1}. Payment ID: ${issue.payment_id}`);
      console.log(`   Problema: ${issue.issue}`);
      console.log(`   Valor actual: ${JSON.stringify(issue.current_value)}`);
      console.log(`   Solución sugerida: ${JSON.stringify(issue.suggested_fix)}\n`);
    });

    if (issues.length > 20) {
      console.log(`   ... y ${issues.length - 20} problemas más\n`);
    }
  } else {
    console.log('✅ No se encontraron problemas\n');
  }

  return { issues, stats };
}

async function fixPayments(dryRun: boolean = true) {
  console.log(dryRun ? '🔍 Modo DRY RUN - No se realizarán cambios\n' : '🔧 Modo FIX - Se corregirán los problemas\n');

  const { issues, stats } = await diagnosePayments();

  if (!issues || issues.length === 0) {
    console.log('✅ No hay problemas que corregir');
    return;
  }

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const issue of issues) {
    // Skip issues that need manual intervention
    if (issue.suggested_fix === 'needs manual assignment') {
      console.log(`⏭️  Saltando ${issue.payment_id}: requiere intervención manual`);
      skipped++;
      continue;
    }

    // Fix status issues
    if (issue.issue.includes('status')) {
      if (dryRun) {
        console.log(`[DRY RUN] Corregiría status de ${issue.payment_id} a "${issue.suggested_fix}"`);
        fixed++;
      } else {
        try {
          const { error } = await supabase
            .from('payments')
            .update({ status: issue.suggested_fix })
            .eq('id', issue.payment_id);

          if (error) {
            console.error(`❌ Error corrigiendo ${issue.payment_id}:`, error.message);
            errors++;
          } else {
            console.log(`✅ Corregido ${issue.payment_id}: status -> "${issue.suggested_fix}"`);
            fixed++;
          }
        } catch (err: any) {
          console.error(`❌ Error corrigiendo ${issue.payment_id}:`, err.message);
          errors++;
        }
      }
    }
  }

  console.log('\n📊 Resumen de correcciones:');
  console.log(`   Corregidos: ${fixed}`);
  console.log(`   Saltados (requieren manual): ${skipped}`);
  console.log(`   Errores: ${errors}`);
  console.log(`   Total problemas: ${issues.length}\n`);

  if (dryRun) {
    console.log('💡 Para aplicar las correcciones, ejecuta:');
    console.log('   npm run fix-payments -- --apply\n');
  }
}

// Main execution
const args = process.argv.slice(2);
const apply = args.includes('--apply');

fixPayments(!apply)
  .then(() => {
    console.log('✅ Análisis completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });


