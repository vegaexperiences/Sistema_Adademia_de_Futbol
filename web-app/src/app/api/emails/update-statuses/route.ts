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
    // 2. Don't have delivered_at set yet (or need opened_at update)
    // 3. Don't have bounced_at set (not bounced)
    // 4. Are in the provided list
    
    // First, update delivered_at for emails that don't have it
    const { data: emailsToDeliver, error: fetchDeliveredError } = await supabase
      .from('email_queue')
      .select('id, sent_at, delivered_at, bounced_at')
      .in('id', emailIds)
      .is('delivered_at', null)
      .is('bounced_at', null)
      .not('sent_at', 'is', null)
      .lte('sent_at', oneHourAgo.toISOString());

    if (fetchDeliveredError) {
      console.error('Error fetching emails to deliver:', fetchDeliveredError);
      return NextResponse.json({ error: 'Error fetching emails' }, { status: 500 });
    }

    let deliveredCount = 0;
    if (emailsToDeliver && emailsToDeliver.length > 0) {
      const { error: updateDeliveredError } = await supabase
        .from('email_queue')
        .update({ delivered_at: now.toISOString() })
        .in('id', emailsToDeliver.map(e => e.id));
      
      if (updateDeliveredError) {
        console.error('Error updating delivered_at:', updateDeliveredError);
      } else {
        deliveredCount = emailsToDeliver.length;
      }
    }

    // Also update opened_at for emails that:
    // 1. Have delivered_at set (were delivered)
    // 2. Don't have opened_at set yet
    // 3. Were sent more than 2 hours ago (give time for user to open)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const { data: emailsToOpen, error: fetchOpenedError } = await supabase
      .from('email_queue')
      .select('id, sent_at, delivered_at, opened_at, bounced_at')
      .in('id', emailIds)
      .not('delivered_at', 'is', null)
      .is('opened_at', null)
      .is('bounced_at', null)
      .not('sent_at', 'is', null)
      .lte('sent_at', twoHoursAgo.toISOString());

    let openedCount = 0;
    if (!fetchOpenedError && emailsToOpen && emailsToOpen.length > 0) {
      // Only mark as opened if it's been delivered for a while (user likely opened it)
      // This is a heuristic - ideally the webhook should handle this
      const { error: updateOpenedError } = await supabase
        .from('email_queue')
        .update({ opened_at: now.toISOString() })
        .in('id', emailsToOpen.map(e => e.id));
      
      if (updateOpenedError) {
        console.error('Error updating opened_at:', updateOpenedError);
      } else {
        openedCount = emailsToOpen.length;
      }
    }

    const totalUpdated = deliveredCount + openedCount;
    
    if (totalUpdated === 0) {
      return NextResponse.json({ 
        success: true, 
        updated: 0,
        delivered: 0,
        opened: 0,
        message: 'No hay correos que actualizar (todos ya están actualizados o son muy recientes)' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      updated: totalUpdated,
      delivered: deliveredCount,
      opened: openedCount,
      message: `Se actualizaron ${deliveredCount} correo(s) como entregados y ${openedCount} como abiertos`
    });
  } catch (error: any) {
    console.error('Error in update-statuses:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

