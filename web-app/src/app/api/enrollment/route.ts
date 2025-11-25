import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { brevo, SendSmtpEmail } from '@/lib/brevo/client';
import { enrollmentSchema } from '@/lib/validations/enrollment';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validationResult = enrollmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: validationResult.error.flatten().fieldErrors 
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

    // 2. Create Players linked to Family
    const playersToInsert = data.players.map((player: any) => ({
      first_name: player.firstName,
      last_name: player.lastName,
      birth_date: player.birthDate,
      gender: player.gender,
      cedula: player.cedula || null, // Optional for kids sometimes
      category: player.category || 'Pendiente', // Logic to determine category could go here
      family_id: familyId,
      status: 'Pending', // Pending payment verification
      cedula_front_url: player.cedulaFrontFile, // Save front ID
      cedula_back_url: player.cedulaBackFile,   // Save back ID
    }));

    const { error: playersError } = await supabase
      .from('players')
      .insert(playersToInsert);

    if (playersError) throw playersError;

    // 3. Calculate Amount
    // Fetch enrollment price from settings or use default
    const { data: priceSetting } = await supabase
      .from('settings') 
      .select('value')
      .eq('key', 'price_enrollment')
      .single();

    const baseRate = priceSetting ? Number(priceSetting.value) : 130;
    const count = data.players.length;
    const totalAmount = baseRate * count; // No discount for enrollment

    // Get created player IDs
    const { data: createdPlayers, error: fetchPlayersError } = await supabase
      .from('players')
      .select('id')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(count);

    if (fetchPlayersError || !createdPlayers || createdPlayers.length !== count) {
      throw new Error('Error al obtener los jugadores creados');
    }

    // 4. Create Payment Records - one per player or one combined
    // Using combined approach: one payment for all players in enrollment
    const paymentStatus = (data.paymentMethod === 'Comprobante' || 
                          data.paymentMethod === 'Transferencia' || 
                          data.paymentMethod === 'Yappy') 
                          ? 'Pending Approval' 
                          : 'Pending';

    // Insert payment record linked to the first player (primary)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        player_id: createdPlayers[0].id, // Link to first player
        amount: totalAmount,
        type: 'Matrícula',
        status: paymentStatus,
        method: data.paymentMethod,
        notes: `Matrícula para ${count} jugador(es). Tutor: ${data.tutorName}. Jugadores: ${createdPlayers.map(p => p.id).join(', ')}`,
        proof_url: data.paymentProofFile,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record error:', paymentError);
      throw paymentError;
    }

    // If multiple players, create additional payment records for tracking
    if (count > 1) {
      for (let i = 1; i < createdPlayers.length; i++) {
        await supabase
          .from('payments')
          .insert({
            player_id: createdPlayers[i].id,
            amount: 0, // No additional charge, already included in main payment
            type: 'Matrícula',
            status: paymentStatus,
            method: data.paymentMethod,
            notes: `Matrícula compartida (pago principal registrado en jugador principal). Tutor: ${data.tutorName}`,
            proof_url: data.paymentProofFile,
          });
      }
    }

    // 5. Send Email
    if (process.env.BREVO_API_KEY) {
      const { generateEnrollmentEmail } = await import('@/lib/email/enrollment-template');
      
      // Get logo URL from public folder (deployed URLs will use the deployed domain)
      const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 'https://cdn-icons-png.flaticon.com/512/1857/1857924.png';
      
      const emailHtml = generateEnrollmentEmail(
        logoUrl,
        data.tutorName,
        data.players,
        totalAmount,
        data.paymentMethod
      );

      const sendSmtpEmail: SendSmtpEmail = {
        sender: { name: 'Suarez Academy', email: process.env.BREVO_FROM_EMAIL || 'noreply@suarezacademy.com' },
        to: [{ email: data.tutorEmail }],
        subject: 'Confirmación de Matrícula - Suarez Academy',
        htmlContent: emailHtml,
      };

      const emailResponse = await brevo.sendTransacEmail(sendSmtpEmail);

      // Brevo returns { response, body } where body contains the messageId
      const messageId = emailResponse.body?.messageId || (emailResponse as any).messageId;

      // Log email send for daily counter with Brevo email ID
      const { logEmailSent } = await import('@/lib/actions/email-log');
      await logEmailSent(
        data.tutorEmail, 
        'Confirmación de Matrícula - Suarez Academy', 
        'enrollment',
        messageId || null
      );
    }

    return NextResponse.json({ success: true, familyId: familyId });
  } catch (error: any) {
    console.error('Enrollment error:', error);
    
    // Don't expose internal error details to client in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Error procesando la matrícula',
        ...(isDevelopment && { details: error.message || JSON.stringify(error) })
      },
      { status: 500 }
    );
  }
}
