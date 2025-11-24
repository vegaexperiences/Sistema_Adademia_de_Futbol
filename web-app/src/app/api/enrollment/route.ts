import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resend } from '@/lib/resend/client';

export async function POST(request: Request) {
  try {
    const data = await request.json();
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

    // 4. Create Payment Record (Pending)
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        amount: totalAmount,
        type: 'Matrícula',
        status: (data.paymentMethod === 'Comprobante' || data.paymentMethod === 'Transferencia' || data.paymentMethod === 'Yappy') ? 'Pending Approval' : 'Pending',
        method: data.paymentMethod,
        notes: `Matrícula para ${count} jugador(es). Tutor: ${data.tutorName}`,
        proof_url: data.paymentProofFile,
      });

    if (paymentError) {
      console.error('Payment record error:', paymentError);
      throw paymentError; // Throw to catch block
    }

    // 5. Send Email
    if (process.env.RESEND_API_KEY) {
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

      const emailResponse = await resend.emails.send({
        from: 'Suarez Academy <onboarding@resend.dev>',
        to: [data.tutorEmail],
        subject: 'Confirmación de Matrícula - Suarez Academy',
        html: emailHtml,
      });

      // Log email send for daily counter with Resend email ID
      const { logEmailSent } = await import('@/lib/actions/email-log');
      await logEmailSent(
        data.tutorEmail, 
        'Confirmación de Matrícula - Suarez Academy', 
        'enrollment',
        emailResponse.data?.id || null
      );
    }

    return NextResponse.json({ success: true, familyId: familyId });
  } catch (error: any) {
    console.error('Enrollment error:', error);
    return NextResponse.json(
      { error: 'Error processing enrollment', details: error.message || JSON.stringify(error) },
      { status: 500 }
    );
  }
}
