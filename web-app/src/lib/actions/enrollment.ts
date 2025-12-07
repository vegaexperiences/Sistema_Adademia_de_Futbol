'use server';

import { createClient } from '@/lib/supabase/server';
import { enrollmentSchema } from '@/lib/validations/enrollment';

/**
 * Helper function to create enrollment from payment callback
 * This is called after payment is confirmed by PagueloFacil/Yappy
 */
export async function createEnrollmentFromPayment(
  enrollmentData: any,
  paymentAmount: number,
  paymentMethod: 'paguelofacil' | 'yappy',
  operationNumber?: string
) {
  const supabase = await createClient();
  
  console.log('[createEnrollmentFromPayment] Starting enrollment creation from payment callback...');
  console.log('[createEnrollmentFromPayment] Payment details:', {
    amount: paymentAmount,
    method: paymentMethod,
    operationNumber,
  });

  // Track created resources for rollback
  const createdResources: {
    familyId?: string;
    familyWasNew?: boolean;
    playerIds: string[];
    paymentId?: string;
  } = {
    playerIds: [],
  };

  try {
    // Validate enrollment data
    const validatedData = enrollmentSchema.parse(enrollmentData);
    console.log('[createEnrollmentFromPayment] Data validated successfully');

    // 1. Handle Family Creation (only if 2+ players)
    let familyId: string | null = null;
    const playerCount = validatedData.players.length;

    if (playerCount >= 2) {
      console.log('[createEnrollmentFromPayment] Creating family for', playerCount, 'players');
      
      // Check if family already exists
      const { data: existingFamily } = await supabase
        .from('families')
        .select('id')
        .eq('tutor_cedula', validatedData.tutorCedula)
        .single();

      if (existingFamily) {
        familyId = existingFamily.id;
        console.log('[createEnrollmentFromPayment] Using existing family:', familyId);
      } else {
        const { data: newFamily, error: familyError } = await supabase
          .from('families')
          .insert({
            tutor_name: validatedData.tutorName,
            tutor_cedula: validatedData.tutorCedula,
            tutor_email: validatedData.tutorEmail,
            tutor_phone: validatedData.tutorPhone,
            tutor_cedula_url: validatedData.cedulaTutorFile || null,
          })
          .select()
          .single();

        if (familyError) {
          throw new Error(`Error creating family: ${familyError.message}`);
        }

        familyId = newFamily.id;
        createdResources.familyId = familyId;
        createdResources.familyWasNew = true;
        console.log('[createEnrollmentFromPayment] Created new family:', familyId);
      }
    }

    // 2. Create Pending Players
    const playerIds: string[] = [];
    for (const playerData of validatedData.players) {
      const { data: player, error: playerError } = await supabase
        .from('pending_players')
        .insert({
          first_name: playerData.firstName,
          last_name: playerData.lastName,
          birth_date: playerData.birthDate,
          gender: playerData.gender,
          cedula: playerData.cedula || null,
          category: playerData.category,
          cedula_front_url: playerData.cedulaFrontFile || null,
          cedula_back_url: playerData.cedulaBackFile || null,
          family_id: familyId,
          tutor_name: familyId ? null : validatedData.tutorName,
          tutor_cedula: familyId ? null : validatedData.tutorCedula,
          tutor_email: familyId ? null : validatedData.tutorEmail,
          tutor_phone: familyId ? null : validatedData.tutorPhone,
          tutor_cedula_url: familyId ? null : (validatedData.cedulaTutorFile || null),
        })
        .select()
        .single();

      if (playerError) {
        throw new Error(`Error creating player ${playerData.firstName} ${playerData.lastName}: ${playerError.message}`);
      }

      playerIds.push(player.id);
      createdResources.playerIds.push(player.id);
      console.log('[createEnrollmentFromPayment] Created player:', player.id, playerData.firstName, playerData.lastName);
    }

    // 3. Create Payment Record
    const playerIdsString = playerIds.join(', ');
    const operationInfo = operationNumber 
      ? `Paguelo Fácil Operación: ${operationNumber}` 
      : paymentMethod === 'yappy' 
        ? 'Yappy Comercial' 
        : 'Paguelo Fácil';
    
    const paymentNotes = `Pago de matrícula procesado con ${paymentMethod === 'paguelofacil' ? 'Paguelo Fácil' : 'Yappy Comercial'}.\n${operationInfo}. Monto: $${paymentAmount}. Confirmado: ${new Date().toISOString()}\n\nMatrícula para ${playerCount} jugador(es). Tutor: ${validatedData.tutorName}. Pending Player IDs: ${playerIdsString}`;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        player_id: null,
        amount: paymentAmount,
        type: 'enrollment',
        method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
        status: 'Approved', // Payment already confirmed by payment gateway
        notes: paymentNotes,
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Error creating payment: ${paymentError.message}`);
    }

    createdResources.paymentId = payment.id;
    console.log('[createEnrollmentFromPayment] Created payment:', payment.id);

    // Cleanup: Delete temporary enrollment data from sessionStorage if it exists
    // (This will be handled on the client side)

    return {
      success: true,
      playerIds,
      paymentId: payment.id,
      familyId,
    };
  } catch (error: any) {
    console.error('[createEnrollmentFromPayment] Error:', error);

    // Rollback: Delete created resources
    if (createdResources.playerIds.length > 0) {
      await supabase
        .from('pending_players')
        .delete()
        .in('id', createdResources.playerIds);
    }

    if (createdResources.familyId && createdResources.familyWasNew) {
      await supabase
        .from('families')
        .delete()
        .eq('id', createdResources.familyId);
    }

    if (createdResources.paymentId) {
      await supabase
        .from('payments')
        .delete()
        .eq('id', createdResources.paymentId);
    }

    return {
      success: false,
      error: error.message || 'Error creating enrollment',
    };
  }
}

