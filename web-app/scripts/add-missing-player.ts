#!/usr/bin/env ts-node
/**
 * Script para agregar un jugador que faltó en la importación
 * Específicamente para Gabriel Schwartz que está en el CSV de pendientes pero no en el principal
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

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // D/M/YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD
        return new Date(match[1], parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        // DD/MM/YYYY or D/M/YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      }
    }
  }
  
  return null;
}

function mapPaymentMethod(method: string): 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'ach' | 'other' {
  if (!method) return 'cash';
  const methodLower = method.toLowerCase().trim();
  if (methodLower.includes('yappy')) return 'yappy';
  if (methodLower.includes('ach')) return 'ach';
  if (methodLower.includes('visa') || methodLower.includes('mastercard') || methodLower === 'card') return 'card';
  if (methodLower.includes('paguelo') || methodLower.includes('paguelofacil')) return 'paguelofacil';
  if (methodLower.includes('transfer') || methodLower.includes('transferencia')) return 'transfer';
  if (methodLower.includes('cheque') || methodLower === 'cheque') return 'other';
  return 'cash';
}

async function addGabrielSchwartz() {
  console.log('\n🔧 Agregando jugador faltante: Gabriel Schwartz\n');

  // Datos del CSV de pendientes
  const playerData = {
    firstName: 'Gabriel',
    lastName: 'Schwartz',
    birthDate: '19/01/2016', // DD/MM/YYYY
    gender: 'Masculino',
    cedula: '81183820',
    cedulaFront: 'https://drive.google.com/open?id=11akpwgJMT3Jl8t1GMrHXrHoa8hGi-zN5',
    cedulaBack: 'https://drive.google.com/open?id=12ghvj9h0ML237jtxVACmmC0dGR6gZ36j',
    tutorName: 'Natasha jelenszky',
    tutorEmail: 'njelens@gmail.com',
    tutorPhone: '66760015',
    tutorCedula: '8-810-2332',
    paymentMethod: 'Yappy',
    paymentDate: '17/11/2025',
    paymentProof: 'https://drive.google.com/open?id=13kiAGSNgL_WvqivmdFhqueXD4bqHQgvC'
  };

  const birthDate = parseDate(playerData.birthDate);
  if (!birthDate) {
    console.error('❌ Error: No se pudo parsear la fecha de nacimiento');
    return;
  }

  // Calculate category
  const birthYear = birthDate.getFullYear();
  let category = 'Sin categoría';
  if ([2016, 2017].includes(birthYear)) {
    category = 'U10'; // Nacido en 2016, tiene 9 años, categoría U10
  }

  console.log(`📋 Datos del jugador:`);
  console.log(`   Nombre: ${playerData.firstName} ${playerData.lastName}`);
  console.log(`   Fecha nacimiento: ${playerData.birthDate} (${birthYear})`);
  console.log(`   Categoría: ${category}`);
  console.log(`   Tutor: ${playerData.tutorName}`);
  console.log(`   Comprobante: ${playerData.paymentProof}\n`);

  // Check if player already exists
  const { data: existingPlayer } = await supabase
    .from('pending_players')
    .select('id')
    .eq('cedula', playerData.cedula)
    .maybeSingle();

  if (existingPlayer) {
    console.log('⚠️  El jugador ya existe en pending_players');
    console.log(`   ID: ${existingPlayer.id}`);
    
    // Check if payment exists
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .is('player_id', null)
      .like('notes', `%${playerData.firstName}%${playerData.lastName}%`);
    
    if (payments && payments.length > 0) {
      console.log(`\n   💳 Pagos encontrados: ${payments.length}`);
      payments.forEach(p => {
        console.log(`      - ${p.type} | $${p.amount} | ${p.method} | Proof: ${p.proof_url || 'N/A'}`);
      });
    }
    return;
  }

  // Create pending player
  console.log('📝 Creando jugador pendiente...');
  const { data: player, error: playerError } = await supabase
    .from('pending_players')
    .insert({
      first_name: playerData.firstName,
      last_name: playerData.lastName,
      birth_date: birthDate.toISOString().split('T')[0],
      gender: playerData.gender,
      cedula: playerData.cedula,
      category: category,
      tutor_name: playerData.tutorName,
      tutor_cedula: playerData.tutorCedula,
      tutor_email: playerData.tutorEmail,
      tutor_phone: playerData.tutorPhone,
      cedula_front_url: playerData.cedulaFront,
      cedula_back_url: playerData.cedulaBack,
      family_id: null // No tiene familia (solo 1 jugador)
    })
    .select()
    .single();

  if (playerError) {
    console.error('❌ Error creando jugador:', playerError.message);
    return;
  }

  console.log(`✅ Jugador creado: ${player.id}\n`);

  // Create payment with proof
  if (playerData.paymentProof && playerData.paymentProof.trim()) {
    console.log('💳 Creando pago con comprobante...');
    const paymentDate = parseDate(playerData.paymentDate) || new Date();
    const paymentMethod = mapPaymentMethod(playerData.paymentMethod);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        player_id: null, // Will be linked when approved
        amount: 0, // To be set manually after verifying proof
        type: 'enrollment',
        method: paymentMethod,
        payment_date: paymentDate.toISOString().split('T')[0],
        proof_url: playerData.paymentProof,
        notes: `Pago de matrícula pendiente. Jugador: ${playerData.firstName} ${playerData.lastName}. Método: ${playerData.paymentMethod}. Fecha pago: ${playerData.paymentDate}. Verificar monto en comprobante: ${playerData.paymentProof}`,
        status: 'Pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Error creando pago:', paymentError.message);
    } else {
      console.log(`✅ Pago creado: ${payment.id}`);
      console.log(`   Proof URL: ${payment.proof_url}`);
    }
  }

  console.log('\n✅ Proceso completado!\n');
}

addGabrielSchwartz().catch(console.error);

