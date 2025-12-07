'use server';

import { createClient } from '@/lib/supabase/server';
import { enrollmentSchema } from '@/lib/validations/enrollment';

/**
 * Helper function to create enrollment from payment callback
 * This is called after payment is confirmed by PagueloFacil/Yappy
 * 
 * IMPORTANT: This function does NOT perform rollback because:
 * - The payment has already been confirmed by the payment gateway
 * - The money has already been processed
 * - Players must remain in the database to appear in approvals
 * - Even if there are errors, we keep what was created so it can be manually fixed
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

  // Track created resources for logging (NOT for rollback - payment already confirmed)
  const createdResources: {
    familyId?: string | null;
    familyWasNew?: boolean;
    playerIds: string[];
    paymentId?: string;
  } = {
    playerIds: [],
  };

  try {
    // Normalize enrollment data before validation
    let normalizedData = { ...enrollmentData };
    
    // Normalize tutorCedula: pad with zeros if too short (minimum 7 chars)
    if (normalizedData.tutorCedula && typeof normalizedData.tutorCedula === 'string') {
      const originalCedula = normalizedData.tutorCedula.trim();
      if (originalCedula.length > 0 && originalCedula.length < 7) {
        normalizedData.tutorCedula = originalCedula.padStart(7, '0');
        console.log('[createEnrollmentFromPayment] 🔧 Normalized tutorCedula:', {
          original: originalCedula,
          normalized: normalizedData.tutorCedula,
          originalLength: originalCedula.length,
          normalizedLength: normalizedData.tutorCedula.length,
        });
      } else {
        normalizedData.tutorCedula = originalCedula;
      }
    }
    
    // Normalize tutorPhone: remove spaces and special characters, keep only digits
    if (normalizedData.tutorPhone && typeof normalizedData.tutorPhone === 'string') {
      const originalPhone = normalizedData.tutorPhone.trim();
      // Remove common phone formatting characters but keep the digits
      const cleanedPhone = originalPhone.replace(/[\s\-\(\)\.]/g, '');
      if (cleanedPhone.length >= 7) {
        normalizedData.tutorPhone = cleanedPhone;
        if (cleanedPhone !== originalPhone) {
          console.log('[createEnrollmentFromPayment] 🔧 Normalized tutorPhone:', {
            original: originalPhone,
            normalized: cleanedPhone,
          });
        }
      }
    }
    
    // Normalize player data
    if (normalizedData.players && Array.isArray(normalizedData.players)) {
      normalizedData.players = normalizedData.players.map((player: any) => {
        const normalizedPlayer = { ...player };
        
        // Normalize player cedula if present
        if (normalizedPlayer.cedula && typeof normalizedPlayer.cedula === 'string') {
          normalizedPlayer.cedula = normalizedPlayer.cedula.trim();
        }
        
        // Ensure category has a default value
        if (!normalizedPlayer.category || normalizedPlayer.category.trim() === '') {
          normalizedPlayer.category = 'Pendiente';
        }
        
        return normalizedPlayer;
      });
    }
    
    console.log('[createEnrollmentFromPayment] 📋 Normalized enrollment data:', {
      tutorName: normalizedData.tutorName,
      tutorCedula: normalizedData.tutorCedula,
      tutorCedulaLength: normalizedData.tutorCedula?.length || 0,
      tutorEmail: normalizedData.tutorEmail,
      tutorPhone: normalizedData.tutorPhone,
      playerCount: normalizedData.players?.length || 0,
    });
    
    // Validate normalized enrollment data
    const validationResult = enrollmentSchema.safeParse(normalizedData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.error('[createEnrollmentFromPayment] ❌ Validation failed:', {
        errors,
        enrollmentData: {
          tutorName: normalizedData.tutorName,
          tutorCedula: normalizedData.tutorCedula,
          tutorCedulaLength: normalizedData.tutorCedula?.length || 0,
          tutorEmail: normalizedData.tutorEmail,
          tutorPhone: normalizedData.tutorPhone,
          tutorPhoneLength: normalizedData.tutorPhone?.length || 0,
          playerCount: normalizedData.players?.length || 0,
        },
        originalEnrollmentData: {
          tutorCedula: enrollmentData.tutorCedula,
          tutorCedulaLength: enrollmentData.tutorCedula?.length || 0,
        },
      });
      
      // Try to provide helpful error message
      const errorMessages: string[] = [];
      if (errors.tutorCedula) {
        errorMessages.push(`Cédula del tutor inválida: ${errors.tutorCedula.join(', ')}. Valor recibido: "${enrollmentData.tutorCedula}" (${enrollmentData.tutorCedula?.length || 0} caracteres)`);
      }
      if (errors.tutorPhone) {
        errorMessages.push(`Teléfono del tutor inválido: ${errors.tutorPhone.join(', ')}`);
      }
      if (errors.tutorEmail) {
        errorMessages.push(`Email del tutor inválido: ${errors.tutorEmail.join(', ')}`);
      }
      if (errors.players) {
        errorMessages.push(`Datos de jugadores inválidos: ${errors.players.join(', ')}`);
      }
      
      throw new Error(`Datos de enrollment inválidos: ${errorMessages.join('; ')}`);
    }
    
    const validatedData = validationResult.data;
    console.log('[createEnrollmentFromPayment] ✅ Data validated successfully');

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
          // Note: tutor_cedula_url is stored in families table, not in pending_players
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
    console.error('[createEnrollmentFromPayment] ❌ Error during enrollment creation:', error);
    console.error('[createEnrollmentFromPayment] ⚠️ Payment was already confirmed by gateway, so NO rollback will be performed');
    console.error('[createEnrollmentFromPayment] 📋 Resources created before error (these will be kept):', {
      playerIds: createdResources.playerIds,
      familyId: createdResources.familyId,
      paymentId: createdResources.paymentId,
    });

    // IMPORTANT: NO ROLLBACK - The payment has already been confirmed by PagueloFacil/Yappy
    // The money has already been processed, so we MUST keep the players and payment
    // that were created, even if there was an error. They will appear in approvals
    // and can be manually fixed if needed.
    // 
    // This is different from /api/enrollment which handles direct payments (ACH/Transferencia)
    // that haven't been processed yet - those can still be rolled back.

    return {
      success: false,
      error: error.message || 'Error creating enrollment',
      // Return created resources so callbacks can handle them
      playerIds: createdResources.playerIds,
      paymentId: createdResources.paymentId,
      familyId: createdResources.familyId,
    };
  }
}

