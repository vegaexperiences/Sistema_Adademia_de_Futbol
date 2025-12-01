import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { enrollmentSchema } from '@/lib/validations/enrollment';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[enrollment] Received request body:', JSON.stringify(body, null, 2));
    
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
    const supabase = await createClient();
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
        // Continue processing but mark as duplicate - we'll still send email in case it wasn't sent before
        // Store duplicate flag to return later
        const isDuplicate = true;
        
        // Still send email even if duplicate (in case email wasn't sent before)
        console.log('[enrollment] Duplicate detected, but will still attempt to send email');
        
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
            console.error('[enrollment] Error queuing enrollment confirmation email:', emailResult.error);
          } else {
            console.log('[enrollment] ✅ Pre-enrollment email queued successfully (duplicate case)');
          }
        } catch (emailError: any) {
          console.error('[enrollment] ❌ Error queuing enrollment confirmation email:', {
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
        gender: player.gender, // Should be "Masculino" or "Femenino" from form
        cedula: player.cedula || null, // Optional for kids sometimes
        category: player.category || 'Pendiente', // Logic to determine category could go here
        family_id: familyId,
        cedula_front_url: player.cedulaFrontFile || null, // Save front ID
        cedula_back_url: player.cedulaBackFile || null,   // Save back ID
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
      throw playersError;
    }

    if (!createdPlayers || createdPlayers.length !== data.players.length) {
      console.error('[enrollment] ❌ Players count mismatch:', {
        expected: data.players.length,
        created: createdPlayers?.length || 0,
        createdPlayers: createdPlayers,
      });
      throw new Error('Error al crear los jugadores. No se obtuvieron todos los IDs.');
    }
    
    console.log('[enrollment] ✅ Players created successfully:', createdPlayers.map(p => p.id));

    // 4. Calculate Amount
    console.log('[enrollment] Step 4: Calculating amount...');
    // Fetch enrollment price from settings or use default
    const { data: priceSetting } = await supabase
      .from('settings') 
      .select('value')
      .eq('key', 'price_enrollment')
      .single();

    const baseRate = priceSetting ? Number(priceSetting.value) : 130;
    const count = data.players.length;
    const totalAmount = baseRate * count; // No discount for enrollment
    console.log('[enrollment] Amount calculated:', { baseRate, count, totalAmount });

    // 5. Create Payment Records - one per player or one combined
    // Note: player_id must be NULL because players are in pending_players, not players table yet
    // The payment will be linked to the player when they are approved
    // Map to valid status values: 'Approved', 'Pending', 'Rejected', 'Cancelled'
    const paymentStatus = (data.paymentMethod === 'Comprobante' || 
                          data.paymentMethod === 'Transferencia' || 
                          data.paymentMethod === 'Yappy') 
                          ? 'Pending' // Needs approval
                          : data.paymentMethod === 'PagueloFacil'
                          ? 'Approved' // PagueloFacil payments are immediate
                          : 'Pending';

    // Map payment method to valid enum values
    const paymentMethodMap: Record<string, string> = {
      'Comprobante': 'cash',
      'Transferencia': 'transfer',
      'Yappy': 'yappy',
      'PagueloFacil': 'paguelofacil',
      'ACH': 'ach',
    };
    const mappedPaymentMethod = paymentMethodMap[data.paymentMethod] || 'other';

    // Insert payment record - player_id is NULL because players are still pending
    // The payment will be linked when the player is approved
    // Store pending player IDs in notes for later linking
    const paymentData: any = {
      player_id: null, // NULL because player is in pending_players, not players table
      amount: totalAmount,
      payment_type: 'enrollment', // Use correct field name and enum value
      payment_method: mappedPaymentMethod,
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Matrícula para ${count} jugador(es). Tutor: ${data.tutorName}. Pending Player IDs: ${createdPlayers.map(p => p.id).join(', ')}`,
      status: paymentStatus, // Already mapped to valid values ('Approved' or 'Pending')
    };

    // Add proof_url if provided
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
      throw paymentError;
    }

    console.log('[enrollment] ✅ Payment record created:', payment?.id);

    // 6. Send Email immediately (not queued)
    console.log('[enrollment] Attempting to send pre-enrollment email immediately to:', data.tutorEmail);
    try {
      const { sendEmailImmediately } = await import('@/lib/actions/email-queue');
      const playerNames = data.players.map(p => `${p.firstName} ${p.lastName}`).join(', ');
      
      console.log('[enrollment] Email variables:', {
        tutorName: data.tutorName,
        playerNames: playerNames,
        amount: totalAmount.toFixed(2),
        paymentMethod: data.paymentMethod,
      });
      
      // Get pending player IDs for metadata
      const pendingPlayerIds = createdPlayers.map(p => p.id);
      
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
          pending_player_ids: pendingPlayerIds,
          player_count: data.players.length,
        }
      );

      if (emailResult?.error) {
        console.error('[enrollment] ❌ Error sending enrollment confirmation email:', {
          error: emailResult.error,
          email: data.tutorEmail,
          template: 'pre_enrollment',
        });
        // Log but don't fail enrollment - email can be sent manually later
      } else {
        console.log('[enrollment] ✅ Pre-enrollment email sent immediately:', {
          email: data.tutorEmail,
          template: 'pre_enrollment',
          messageId: emailResult.messageId,
        });
      }
    } catch (emailError: any) {
      console.error('[enrollment] ❌ Exception sending enrollment confirmation email:', {
        error: emailError,
        message: emailError?.message,
        stack: emailError?.stack,
        email: data.tutorEmail,
      });
      // Don't fail the enrollment if email fails, but log it
    }

    console.log('[enrollment] ✅ Enrollment completed successfully');
    return NextResponse.json({ success: true, familyId: familyId });
  } catch (error: any) {
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
    
    // Always log full error details for debugging (even in production)
    // But don't expose to client
    const errorMessage = error?.message || 'Error desconocido';
    const errorCode = error?.code;
    
    // Don't expose internal error details to client in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Error procesando la matrícula',
        ...(isDevelopment && { 
          details: errorMessage,
          code: errorCode,
          hint: error?.hint,
        })
      },
      { status: 500 }
    );
  }
}
