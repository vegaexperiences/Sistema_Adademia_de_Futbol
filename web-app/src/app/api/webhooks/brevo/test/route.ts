import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Test endpoint to simulate webhook events locally
 * Usage: POST /api/webhooks/brevo/test
 * Body: { event: 'delivered' | 'opened', email: 'user@example.com', messageId?: 'xxx' }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, email, messageId } = body;

    if (!event || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: event and email' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    // Find the most recent email for this address
    const { data: emailRecord } = await supabase
      .from('email_queue')
      .select('id, to_email, sent_at, brevo_email_id, delivered_at, opened_at')
      .eq('to_email', email)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (!emailRecord) {
      return NextResponse.json(
        { error: `No email found for ${email}` },
        { status: 404 }
      );
    }

    let updateField: string;
    let updateValue: string;

    switch (event) {
      case 'delivered':
        if (emailRecord.delivered_at) {
          return NextResponse.json({
            success: true,
            message: 'Email already marked as delivered',
            email: emailRecord
          });
        }
        updateField = 'delivered_at';
        updateValue = now;
        break;

      case 'opened':
        if (emailRecord.opened_at) {
          return NextResponse.json({
            success: true,
            message: 'Email already marked as opened',
            email: emailRecord
          });
        }
        updateField = 'opened_at';
        updateValue = now;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown event: ${event}. Use 'delivered' or 'opened'` },
          { status: 400 }
        );
    }

    const { error: updateError } = await supabase
      .from('email_queue')
      .update({ [updateField]: updateValue })
      .eq('id', emailRecord.id);

    if (updateError) {
      console.error('Error updating email:', updateError);
      return NextResponse.json(
        { error: 'Error updating email', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email marked as ${event}`,
      email: {
        id: emailRecord.id,
        to_email: emailRecord.to_email,
        [updateField]: updateValue
      }
    });
  } catch (error: any) {
    console.error('Error in test webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

