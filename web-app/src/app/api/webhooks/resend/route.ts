import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Resend webhook events
// https://resend.com/docs/dashboard/webhooks/event-types

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Validate webhook (in production, verify signature)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('svix-signature');
      // Signature verification can be implemented when needed
    }

    const supabase = await createClient();
    const emailId = data.email_id;

    if (!emailId) {
      console.warn('No email_id in webhook data');
      return NextResponse.json({ received: true });
    }

    // Update email_queue based on event type
    switch (type) {
      case 'email.sent':
        // Email was sent successfully
        console.log(`Email sent: ${emailId}`);
        break;

      case 'email.delivered':
        await supabase
          .from('email_queue')
          .update({ delivered_at: new Date().toISOString() })
          .eq('resend_email_id', emailId);
        console.log(`Email delivered: ${emailId}`);
        break;

      case 'email.opened':
        await supabase
          .from('email_queue')
          .update({ opened_at: new Date().toISOString() })
          .eq('resend_email_id', emailId);
        console.log(`Email opened: ${emailId}`);
        break;

      case 'email.clicked':
        await supabase
          .from('email_queue')
          .update({ clicked_at: new Date().toISOString() })
          .eq('resend_email_id', emailId);
        console.log(`Email link clicked: ${emailId}`);
        break;

      case 'email.bounced':
        await supabase
          .from('email_queue')
          .update({ 
            bounced_at: new Date().toISOString(),
            status: 'failed',
            error_message: data.bounce?.message || 'Email bounced'
          })
          .eq('resend_email_id', emailId);
        console.log(`Email bounced: ${emailId}`);
        break;

      case 'email.complained':
        // Mark as spam
        await supabase
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: 'Marked as spam'
          })
          .eq('resend_email_id', emailId);
        console.log(`Email marked as spam: ${emailId}`);
        break;

      default:
        console.log(`Unhandled webhook event: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
