import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { emailIds } = await request.json();

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Invalid email IDs' }, { status: 400 });
    }

    const supabase = await createClient();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    // Update emails that:
    // 1. Were sent more than 1 hour ago
    // 2. Don't have delivered_at set yet
    // 3. Don't have bounced_at set (not bounced)
    // 4. Are in the provided list
    const { data: emailsToUpdate, error: fetchError } = await supabase
      .from('email_queue')
      .select('id, sent_at, delivered_at, bounced_at')
      .in('id', emailIds)
      .is('delivered_at', null)
      .is('bounced_at', null)
      .not('sent_at', 'is', null)
      .lte('sent_at', oneHourAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching emails to update:', fetchError);
      return NextResponse.json({ error: 'Error fetching emails' }, { status: 500 });
    }

    if (!emailsToUpdate || emailsToUpdate.length === 0) {
      return NextResponse.json({ 
        success: true, 
        updated: 0, 
        message: 'No hay correos que actualizar (todos ya están actualizados o son muy recientes)' 
      });
    }

    // Update delivered_at for these emails
    const { error: updateError } = await supabase
      .from('email_queue')
      .update({ delivered_at: now.toISOString() })
      .in('id', emailsToUpdate.map(e => e.id));

    if (updateError) {
      console.error('Error updating email statuses:', updateError);
      return NextResponse.json({ error: 'Error updating emails' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      updated: emailsToUpdate.length,
      message: `Se actualizaron ${emailsToUpdate.length} correo(s) como entregados`
    });
  } catch (error: any) {
    console.error('Error in update-statuses:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

