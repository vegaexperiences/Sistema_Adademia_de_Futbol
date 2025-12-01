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
    const supabase = await createClient();

    // 1. Check if Family exists or Create new
    let familyId;
    
    const { data: existingFamily } = await supabase
      .from('families')
      .select('id')
      .eq('tutor_cedula', data.tutorCedula)
      .single();

    if (existingFamily) {
      familyId = existingFamily.id;
      // Optional: Update tutor info if needed
      await supabase
        .from('families')
        .update({
          tutor_name: data.tutorName,
          tutor_email: data.tutorEmail,
          tutor_phone: data.tutorPhone,
          tutor_cedula_url: data.cedulaTutorFile || undefined,
        })
        .eq('id', familyId);
    } else {
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

      if (familyError) throw familyError;
      familyId = newFamily.id;
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
        // Return success but indicate it's a duplicate to prevent re-submission
        return NextResponse.json({ 
          success: true, 
          familyId: familyId,
          duplicate: true,
          message: 'Esta solicitud ya fue registrada anteriormente.'
        });
      }
    }

    // 3. Create Players in pending_players table (not players table)
    const playersToInsert = data.players.map((player: any) => ({
      first_name: player.firstName,
      last_name: player.lastName,
      birth_date: player.birthDate,
      gender: player.gender, // Should be "Masculino" or "Femenino" from form
      cedula: player.cedula || null, // Optional for kids sometimes
      category: player.category || 'Pendiente', // Logic to determine category could go here
      family_id: familyId,
      cedula_front_url: player.cedulaFrontFile, // Save front ID
      cedula_back_url: player.cedulaBackFile,   // Save back ID
    }));

    // Insert and get the created player IDs directly
    const { data: createdPlayers, error: playersError } = await supabase
      .from('pending_players')
      .insert(playersToInsert)
      .select('id');

    if (playersError) {
      console.error('[enrollment] Error inserting players:', playersError);
      throw playersError;
    }

    if (!createdPlayers || createdPlayers.length !== data.players.length) {
      throw new Error('Error al crear los jugadores. No se obtuvieron todos los IDs.');
    }

    // 4. Calculate Amount
    // Fetch enrollment price from settings or use default
    const { data: priceSetting } = await supabase
      .from('settings') 
      .select('value')
      .eq('key', 'price_enrollment')
      .single();

    const baseRate = priceSetting ? Number(priceSetting.value) : 130;
    const count = data.players.length;
    const totalAmount = baseRate * count; // No discount for enrollment

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

    console.log('[enrollment] Creating payment record:', paymentData);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('[enrollment] Payment record error:', {
        error: paymentError,
        code: paymentError.code,
        message: paymentError.message,
        details: paymentError.details,
        hint: paymentError.hint,
      });
      throw paymentError;
    }

    console.log('[enrollment] ✅ Payment record created:', payment?.id);

    // 6. Send Email using queue system
    console.log('[enrollment] Attempting to send pre-enrollment email to:', data.tutorEmail);
    try {
      const { queueEmail } = await import('@/lib/actions/email-queue');
      const playerNames = data.players.map(p => `${p.firstName} ${p.lastName}`).join(', ');
      
      const emailResult = await queueEmail('pre_enrollment', data.tutorEmail, {
        tutorName: data.tutorName,
        playerNames: playerNames,
        amount: totalAmount.toFixed(2),
        paymentMethod: data.paymentMethod,
      });

      if (emailResult?.error) {
        console.error('[enrollment] Error queuing enrollment confirmation email:', emailResult.error);
      } else {
        console.log('[enrollment] ✅ Pre-enrollment email queued successfully');
      }
    } catch (emailError: any) {
      console.error('[enrollment] ❌ Error queuing enrollment confirmation email:', {
        error: emailError,
        message: emailError?.message,
        stack: emailError?.stack,
      });
      // Don't fail the enrollment if email fails, but log it
    }

    console.log('[enrollment] ✅ Enrollment completed successfully');
    return NextResponse.json({ success: true, familyId: familyId });
  } catch (error: any) {
    console.error('[enrollment] ❌ Enrollment error:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    
    // Don't expose internal error details to client in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Error procesando la matrícula',
        ...(isDevelopment && { 
          details: error?.message || JSON.stringify(error),
          code: error?.code,
          hint: error?.hint,
        })
      },
      { status: 500 }
    );
  }
}
