#!/usr/bin/env ts-node
/**
 * Script para crear un enrollment manualmente y vincularlo a un pago existente
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

async function createEnrollmentFromPayment() {
  console.log('\n🔧 Crear Enrollment desde Pago Existente\n');

  // Get payment ID from command line or ask
  const args = process.argv.slice(2);
  const paymentId = args[0] || '';

  let payment;
  if (paymentId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();
    
    if (error || !data) {
      console.log(`❌ Pago no encontrado con ID: ${paymentId}`);
      rl.close();
      return;
    }
    payment = data;
    console.log(`\n✅ Pago encontrado: ${payment.id}`);
    console.log(`   Monto: $${payment.amount}`);
    console.log(`   Método: ${payment.method}`);
  } else {
    // List recent enrollment payments
    console.log('🔍 Buscando pagos de enrollment recientes...');
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('type', 'enrollment')
      .is('player_id', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!payments || payments.length === 0) {
      console.log('❌ No se encontraron pagos de enrollment sin jugador vinculado.');
      rl.close();
      return;
    }

    console.log('\n📋 Pagos encontrados:');
    payments.forEach((p, i) => {
      console.log(`\n  ${i + 1}. ID: ${p.id}`);
      console.log(`     Monto: $${p.amount}`);
      console.log(`     Método: ${p.method}`);
      console.log(`     Estado: ${p.status}`);
      console.log(`     Fecha: ${p.created_at}`);
      console.log(`     Notas: ${p.notes?.substring(0, 100) || 'N/A'}...`);
    });

    const selectedIndex = await askQuestion(`\n¿Qué pago quieres usar? (1-${payments.length}): `);
    const index = parseInt(selectedIndex) - 1;
    
    if (isNaN(index) || index < 0 || index >= payments.length) {
      console.log('❌ Selección inválida');
      rl.close();
      return;
    }

    payment = payments[index];
  }

  if (!payment) {
    console.log('❌ Pago no encontrado');
    rl.close();
    return;
  }

  // Get player information
  console.log('\n📝 Ingresa la información del jugador:');
  const firstName = await askQuestion('Nombre del jugador: ');
  const lastName = await askQuestion('Apellido del jugador: ');
  const birthDate = await askQuestion('Fecha de nacimiento (YYYY-MM-DD): ');
  const gender = await askQuestion('Género (Masculino/Femenino): ');
  const cedula = await askQuestion('Cédula del jugador (opcional, Enter para omitir): ');
  const category = await askQuestion('Categoría (U10/U12/U14/U16/U18, Enter para "Pendiente"): ') || 'Pendiente';

  // Get tutor information
  console.log('\n👤 Ingresa la información del tutor:');
  const tutorName = await askQuestion('Nombre completo del tutor: ');
  const tutorEmail = await askQuestion('Email del tutor: ');
  const tutorPhone = await askQuestion('Teléfono del tutor: ');
  const tutorCedula = await askQuestion('Cédula del tutor: ');

  // Check if family exists
  let familyId = null;
  const { data: existingFamily } = await supabase
    .from('families')
    .select('id')
    .eq('tutor_cedula', tutorCedula)
    .maybeSingle();

  if (existingFamily) {
    familyId = existingFamily.id;
    console.log(`\n✅ Familia existente encontrada: ${familyId}`);
  } else {
    // Create family if tutor has multiple players (we'll check after creating player)
    console.log('\n📝 No se encontró familia existente. Se creará si es necesario.');
  }

  // Create pending player
  console.log('\n📝 Creando jugador pendiente...');
  const { data: player, error: playerError } = await supabase
    .from('pending_players')
    .insert({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate || null,
      gender: gender || null,
      cedula: cedula || null,
      category: category,
      family_id: familyId,
      tutor_name: tutorName || null,
      tutor_email: tutorEmail || null,
      tutor_phone: tutorPhone || null,
      tutor_cedula: tutorCedula || null,
    })
    .select()
    .single();

  if (playerError) {
    console.error('❌ Error creando jugador:', playerError.message);
    rl.close();
    return;
  }

  console.log(`✅ Jugador creado: ${player.id}`);

  // Update payment to link it to the player
  console.log('\n💳 Vinculando pago al jugador...');
  const updatedNotes = `${payment.notes || ''}\n\nVinculado manualmente al jugador pendiente: ${firstName} ${lastName} (ID: ${player.id}). Pending Player IDs: ${player.id}`;

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      notes: updatedNotes,
    })
    .eq('id', payment.id);

  if (updateError) {
    console.error('⚠️  Error actualizando pago:', updateError.message);
  } else {
    console.log('✅ Pago vinculado al jugador');
  }

  console.log('\n✅ Enrollment creado exitosamente!');
  console.log(`   Jugador ID: ${player.id}`);
  console.log(`   Nombre: ${firstName} ${lastName}`);
  console.log(`   Pago ID: ${payment.id}`);
  console.log(`   Monto: $${payment.amount}`);
  console.log('\n💡 El jugador ahora aparecerá en la sección de aprobaciones.');

  rl.close();
}

createEnrollmentFromPayment().catch(console.error);

