import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { enrollmentSchema } from '@/lib/validations/enrollment';

// Enrollment API endpoint - handles student enrollment requests
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('[enrollment] ========== ENROLLMENT REQUEST STARTED ==========');
  console.log('[enrollment] Timestamp:', new Date().toISOString());
  console.log('[enrollment] Request method:', request.method);
  console.log('[enrollment] Request URL:', request.url);
  console.log('[enrollment] Environment:', process.env.NODE_ENV);
  
  // Track created resources for rollback
  const createdResources: {
    familyId?: string;
    familyWasNew?: boolean;
    playerIds: string[];
    paymentId?: string;
  } = {
    playerIds: [],
  };

  const supabase = await createClient();

  // Helper function to cleanup created resources on error
  async function cleanupOnError() {
    console.log('[enrollment] 🧹 ========== STARTING ROLLBACK CLEANUP ==========');
    console.log('[enrollment] 🧹 Resources to clean up:', {
      paymentId: createdResources.paymentId,
      playerIds: createdResources.playerIds,
      familyId: createdResources.familyId,
      familyWasNew: createdResources.familyWasNew,
    });
    
    let cleanupCount = 0;
    
    try {
      // Delete payment if it was created
      if (createdResources.paymentId) {
        console.log(`[enrollment] 🧹 Deleting payment: ${createdResources.paymentId}`);
        const { error: paymentDeleteError } = await supabase
          .from('payments')
          .delete()
          .eq('id', createdResources.paymentId);
        
        if (paymentDeleteError) {
          console.error(`[enrollment] ❌ Error deleting payment ${createdResources.paymentId}:`, paymentDeleteError);
        } else {
          console.log(`[enrollment] ✅ Payment ${createdResources.paymentId} deleted successfully`);
          cleanupCount++;
        }
      }

      // Delete players if they were created
      if (createdResources.playerIds.length > 0) {
        console.log(`[enrollment] 🧹 Deleting ${createdResources.playerIds.length} players:`, createdResources.playerIds);
        const { error: playersDeleteError } = await supabase
          .from('pending_players')
          .delete()
          .in('id', createdResources.playerIds);
        
        if (playersDeleteError) {
          console.error(`[enrollment] ❌ Error deleting players:`, playersDeleteError);
        } else {
          console.log(`[enrollment] ✅ ${createdResources.playerIds.length} players deleted successfully`);
          cleanupCount += createdResources.playerIds.length;
        }
      }

      // Delete family only if it was newly created (not if it existed before)
      if (createdResources.familyId && createdResources.familyWasNew) {
        console.log(`[enrollment] 🧹 Deleting newly created family: ${createdResources.familyId}`);
        const { error: familyDeleteError } = await supabase
          .from('families')
          .delete()
          .eq('id', createdResources.familyId);
        
        if (familyDeleteError) {
          console.error(`[enrollment] ❌ Error deleting family ${createdResources.familyId}:`, familyDeleteError);
        } else {
          console.log(`[enrollment] ✅ Family ${createdResources.familyId} deleted successfully`);
          cleanupCount++;
        }
      }

      console.log(`[enrollment] ✅ ========== CLEANUP COMPLETED: ${cleanupCount} resources deleted ==========`);
    } catch (cleanupError: any) {
      console.error('[enrollment] ❌ CRITICAL ERROR during cleanup:', {
        error: cleanupError?.message,
        stack: cleanupError?.stack,
        code: cleanupError?.code,
        details: cleanupError?.details,
      });
    }
  }

  try {
    console.log('[enrollment] Step 0: Parsing request body...');
    let body;
    try {
      body = await request.json();
      console.log('[enrollment] ✅ Step 0: Request body parsed successfully');
      console.log('[enrollment] Body keys:', Object.keys(body || {}));
    } catch (jsonError: any) {
      console.error('[enrollment] ❌ Step 0: Error parsing JSON:', {
        error: jsonError?.message,
        stack: jsonError?.stack,
        name: jsonError?.name,
      });
      return NextResponse.json(
        { error: 'Error al procesar los datos del formulario. Por favor, intente nuevamente.' },
        { status: 400 }
      );
    }
    
    console.log('[enrollment] Received request body (truncated):', JSON.stringify(body, null, 2).substring(0, 500));
    
    // Validate input data
    const validationResult = enrollmentSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('[enrollment] Validation error:', {
        errors: validationResult.error.flatten().fieldErrors,
        issues: validationResult.error.issues,
      });
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: validationResult.error.flatten().fieldErrors,
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Additional validation: ensure players have required fields
    if (!data.players || data.players.length === 0) {
      console.error('[enrollment] No players provided');
      return NextResponse.json(
        { error: 'Debe agregar al menos un jugador' },
        { status: 400 }
      );
    }
    
    // Validate each player has required fields
    for (let i = 0; i < data.players.length; i++) {
      const player = data.players[i];
      if (!player.firstName || !player.lastName || !player.birthDate || !player.gender) {
        console.error(`[enrollment] Player ${i} missing required fields:`, player);
        return NextResponse.json(
          { error: `Jugador ${i + 1} tiene campos incompletos` },
          { status: 400 }
        );
      }
      
      // Ensure gender is valid
      if (!['Masculino', 'Femenino', 'Otro'].includes(player.gender)) {
        console.error(`[enrollment] Player ${i} has invalid gender:`, player.gender);
        return NextResponse.json(
          { error: `Jugador ${i + 1} tiene un género inválido` },
          { status: 400 }
        );
      }
    }
    
    console.log('[enrollment] ✅ Validation passed, processing enrollment...');
    console.log('[enrollment] Starting enrollment process...');

    // 1. Check if Family exists or Create new
    let familyId;
    console.log('[enrollment] Step 1: Checking for existing family with cedula:', data.tutorCedula);
    
    const { data: existingFamily } = await supabase
      .from('families')
      .select('id')
      .eq('tutor_cedula', data.tutorCedula)
      .single();
    
    console.log('[enrollment] Existing family check result:', { found: !!existingFamily, id: existingFamily?.id });

    if (existingFamily) {
      familyId = existingFamily.id;
      createdResources.familyId = familyId;
      createdResources.familyWasNew = false;
      console.log('[enrollment] Using existing family:', familyId);
      // Optional: Update tutor info if needed
      const { error: updateError } = await supabase
        .from('families')
        .update({
          tutor_name: data.tutorName,
          tutor_email: data.tutorEmail,
          tutor_phone: data.tutorPhone,
          tutor_cedula_url: data.cedulaTutorFile || undefined,
        })
        .eq('id', familyId);
      
      if (updateError) {
        console.error('[enrollment] Error updating family:', updateError);
        // Continue anyway, update is optional
      }
    } else {
      console.log('[enrollment] Creating new family...');
      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({
          name: `Familia ${data.tutorName.split(' ')[1] || data.tutorName}`,
          tutor_name: data.tutorName,
          tutor_cedula: data.tutorCedula,
          tutor_email: data.tutorEmail,
          tutor_phone: data.tutorPhone,
          tutor_cedula_url: data.cedulaTutorFile,
        })
        .select()
        .single();

      if (familyError) {
        console.error('[enrollment] ❌ Error creating family:', {
          error: familyError,
          code: familyError.code,
          message: familyError.message,
          details: familyError.details,
        });
        throw familyError;
      }
      familyId = newFamily.id;
      createdResources.familyId = familyId;
      createdResources.familyWasNew = true;
      console.log('[enrollment] ✅ Family created:', familyId);
    }

    // 2. Check for duplicate pending players before inserting
    // This prevents duplicate enrollments if the form is submitted multiple times
    for (const player of data.players) {
      let duplicateQuery = supabase
        .from('pending_players')
        .select('id')
        .eq('family_id', familyId)
        .eq('first_name', player.firstName)
        .eq('last_name', player.lastName)
        .eq('birth_date', player.birthDate);

      // Only check cedula if it's provided (it can be null for kids)
      if (player.cedula) {
        duplicateQuery = duplicateQuery.eq('cedula', player.cedula);
      } else {
        duplicateQuery = duplicateQuery.is('cedula', null);
      }

      const { data: existingPendingPlayer } = await duplicateQuery
        .limit(1)
        .maybeSingle();

      if (existingPendingPlayer) {
        console.warn(`[enrollment] Duplicate pending player detected: ${player.firstName} ${player.lastName} (${existingPendingPlayer.id})`);
        // Calculate amount for email
        const { data: priceSetting } = await supabase
          .from('settings') 
          .select('value')
          .eq('key', 'price_enrollment')
          .single();

        const baseRate = priceSetting ? Number(priceSetting.value) : 130;
        const count = data.players.length;
        const totalAmount = baseRate * count;

        // Send Email immediately (even for duplicates, in case it wasn't sent before)
        console.log('[enrollment] Attempting to send pre-enrollment email immediately to:', data.tutorEmail);
        try {
          const { sendEmailImmediately } = await import('@/lib/actions/email-queue');
          const playerNames = data.players.map(p => `${p.firstName} ${p.lastName}`).join(', ');
          
          const emailResult = await sendEmailImmediately(
            'pre_enrollment', 
            data.tutorEmail, 
            {
              tutorName: data.tutorName,
              playerNames: playerNames,
              amount: totalAmount.toFixed(2),
              paymentMethod: data.paymentMethod,
            },
            {
              family_id: familyId,
              email_type: 'pre_enrollment',
              player_count: data.players.length,
              is_duplicate: true,
            }
          );

          if (emailResult?.error) {
            console.error('[enrollment] Error sending enrollment confirmation email:', emailResult.error);
          } else {
            console.log('[enrollment] ✅ Pre-enrollment email sent successfully (duplicate case)');
          }
        } catch (emailError: any) {
          console.error('[enrollment] ❌ Error sending enrollment confirmation email:', {
            error: emailError,
            message: emailError?.message,
            stack: emailError?.stack,
          });
        }

        // Return success but indicate it's a duplicate
        return NextResponse.json({ 
          success: true, 
          familyId: familyId,
          duplicate: true,
          message: 'Esta solicitud ya fue registrada anteriormente. Se ha intentado enviar el correo de confirmación nuevamente.'
        });
      }
    }

    // 3. Create Players in pending_players table (not players table)
    console.log('[enrollment] Step 3: Creating pending players...');
    const playersToInsert = data.players.map((player: any) => {
      console.log(`[enrollment] Processing player: ${player.firstName} ${player.lastName}`, {
        firstName: player.firstName,
        lastName: player.lastName,
        birthDate: player.birthDate,
        gender: player.gender,
        cedula: player.cedula,
        category: player.category,
      });
      
      return {
        first_name: player.firstName,
        last_name: player.lastName,
        birth_date: player.birthDate,
        gender: player.gender,
        cedula: player.cedula || null,
        category: player.category || 'Pendiente',
        family_id: familyId,
        cedula_front_url: player.cedulaFrontFile || null,
        cedula_back_url: player.cedulaBackFile || null,
      };
    });
    
    console.log('[enrollment] Players to insert:', JSON.stringify(playersToInsert, null, 2));

    // Insert and get the created player IDs directly
    const { data: createdPlayers, error: playersError } = await supabase
      .from('pending_players')
      .insert(playersToInsert)
      .select('id');
    
    console.log('[enrollment] Players insert result:', { 
      created: createdPlayers?.length || 0, 
      error: playersError ? { code: playersError.code, message: playersError.message } : null 
    });

    if (playersError) {
      console.error('[enrollment] ❌ Error inserting players:', {
        error: playersError,
        code: playersError.code,
        message: playersError.message,
        details: playersError.details,
        hint: playersError.hint,
        playersToInsert: JSON.stringify(playersToInsert, null, 2),
      });
      await cleanupOnError();
      throw playersError;
    }

    if (!createdPlayers || createdPlayers.length !== data.players.length) {
      console.error('[enrollment] ❌ Players count mismatch:', {
        expected: data.players.length,
        created: createdPlayers?.length || 0,
        createdPlayers: createdPlayers,
      });
      await cleanupOnError();
      throw new Error('Error al crear los jugadores. No se obtuvieron todos los IDs.');
    }
    
    // Track created player IDs for rollback
    createdResources.playerIds = createdPlayers.map(p => p.id);
    console.log('[enrollment] ✅ Players created successfully:', createdResources.playerIds);

    // 4. Calculate Amount
    console.log('[enrollment] Step 4: Calculating amount...');
    const { data: priceSetting } = await supabase
      .from('settings') 
      .select('value')
      .eq('key', 'price_enrollment')
      .single();

    const baseRate = priceSetting ? Number(priceSetting.value) : 130;
    const count = data.players.length;
    const totalAmount = baseRate * count;
    console.log('[enrollment] Amount calculated:', { baseRate, count, totalAmount });

    // 5. Create Payment Records
    // For PagueloFacil, payment starts as "Pending" and will be updated to "Approved" after payment confirmation
    const paymentStatus = (data.paymentMethod === 'Comprobante' || 
                          data.paymentMethod === 'Transferencia' || 
                          data.paymentMethod === 'Yappy' ||
                          data.paymentMethod === 'PagueloFacil') 
                          ? 'Pending'
                          : 'Pending';

    const paymentMethodMap: Record<string, string> = {
      'Comprobante': 'cash',
      'Transferencia': 'transfer',
      'Yappy': 'yappy',
      'PagueloFacil': 'paguelofacil',
      'ACH': 'ach',
    };
    const mappedPaymentMethod = paymentMethodMap[data.paymentMethod] || 'other';

    // Ensure all player IDs are included in notes for proper linking
    // Format: "Matrícula para X jugador(es). Tutor: Y. Pending Player IDs: uuid1, uuid2, ..."
    const playerIdsString = createdResources.playerIds.length > 0 
      ? createdResources.playerIds.join(', ')
      : 'N/A';
    
    const paymentData: any = {
      player_id: null,
      amount: totalAmount,
      type: 'enrollment',
      method: mappedPaymentMethod,
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Matrícula para ${count} jugador(es). Tutor: ${data.tutorName}. Pending Player IDs: ${playerIdsString}`,
      status: paymentStatus,
    };
    
    // Validate that we have player IDs to link
    if (createdResources.playerIds.length === 0) {
      console.error('[enrollment] ⚠️ WARNING: No player IDs to link payment to!', {
        tutorName: data.tutorName,
        count,
        totalAmount
      });
    }

    if (data.paymentProofFile) {
      paymentData.proof_url = data.paymentProofFile;
    }

    console.log('[enrollment] Step 5: Creating payment record...');
    console.log('[enrollment] Payment data:', JSON.stringify(paymentData, null, 2));

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('[enrollment] ❌ Payment record error:', {
        error: paymentError,
        code: paymentError.code,
        message: paymentError.message,
        details: paymentError.details,
        hint: paymentError.hint,
        paymentData: JSON.stringify(paymentData, null, 2),
      });
      await cleanupOnError();
      throw paymentError;
    }

    createdResources.paymentId = payment?.id;
    console.log('[enrollment] ✅ Payment record created:', createdResources.paymentId);

    // 6. Send Email immediately (not queued) - CRITICAL: Enrollment fails if email fails
    console.log('[enrollment] Step 6: Attempting to send pre-enrollment email immediately to:', data.tutorEmail);
    const { sendEmailImmediately } = await import('@/lib/actions/email-queue');
    const playerNames = data.players.map(p => `${p.firstName} ${p.lastName}`).join(', ');
    
    console.log('[enrollment] Email variables:', {
      tutorName: data.tutorName,
      playerNames: playerNames,
      amount: totalAmount.toFixed(2),
      paymentMethod: data.paymentMethod,
    });
    
    const emailResult = await sendEmailImmediately(
      'pre_enrollment', 
      data.tutorEmail, 
      {
        tutorName: data.tutorName,
        playerNames: playerNames,
        amount: totalAmount.toFixed(2),
        paymentMethod: data.paymentMethod,
      },
      {
        family_id: familyId,
        email_type: 'pre_enrollment',
        pending_player_ids: createdResources.playerIds,
        player_count: data.players.length,
      }
    );

    // CRITICAL: If email fails, enrollment must fail and rollback will be triggered
    if (emailResult?.error) {
      console.error('[enrollment] ❌ CRITICAL: Error sending enrollment confirmation email:', {
        error: emailResult.error,
        details: emailResult.details,
        email: data.tutorEmail,
        template: 'pre_enrollment',
      });
      
      // Throw error to trigger rollback - enrollment cannot succeed without email
      throw new Error(`No se pudo enviar el correo de confirmación de matrícula: ${emailResult.error}. La matrícula ha sido cancelada y los datos no se han guardado.`);
    }

    console.log('[enrollment] ✅ Pre-enrollment email sent immediately:', {
      email: data.tutorEmail,
      template: 'pre_enrollment',
      messageId: emailResult.messageId,
    });

    console.log('[enrollment] ✅ Enrollment completed successfully');
    return NextResponse.json({ success: true, familyId: familyId });
  } catch (error: any) {
    // Cleanup on error
    await cleanupOnError();
    
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      name: error?.name,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    };
    
    console.error('[enrollment] ❌ Enrollment error:', errorDetails);
    console.error('[enrollment] ❌ Full error stack:', error?.stack);
    console.error('[enrollment] ❌ Error message:', error?.message);
    console.error('[enrollment] ❌ Error code:', error?.code);
    console.error('[enrollment] ❌ Error details:', error?.details);
    console.error('[enrollment] ❌ Error hint:', error?.hint);
    
    const errorMessage = error?.message || 'Error desconocido';
    const errorCode = error?.code;
    
    return NextResponse.json(
      { 
        error: 'Error procesando la matrícula',
        details: errorMessage,
        code: errorCode,
        hint: error?.hint,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
