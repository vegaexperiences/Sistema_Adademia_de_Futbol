import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Brevo webhook events
// https://developers.brevo.com/docs/webhooks-2

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-brevo-signature');
    const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;

    // Validate webhook signature for security
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);
    console.log('Brevo webhook received:', JSON.stringify(data, null, 2));
    
    // Brevo webhook format can vary - handle both formats
    const event = data.event || data['event'];
    const messageId = data['message-id'] || data.messageId || data['message_id'];
    const eventData = data;

    if (!messageId) {
      console.warn('No message-id in webhook data:', data);
      return NextResponse.json({ received: true });
    }
    
    if (!event) {
      console.warn('No event in webhook data:', data);
      return NextResponse.json({ received: true });
    }

    const supabase = await createClient();

    // Update email_queue based on event type
    switch (event) {
      case 'sent':
        // Email was sent successfully
        console.log(`Email sent: ${messageId}`);
        break;

      case 'delivered':
        await supabase
          .from('email_queue')
          .update({ delivered_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId);
        console.log(`Email delivered: ${messageId}`);
        break;

      case 'opened':
        await supabase
          .from('email_queue')
          .update({ opened_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId);
        console.log(`Email opened: ${messageId}`);
        break;

      case 'click':
        await supabase
          .from('email_queue')
          .update({ clicked_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId);
        console.log(`Email link clicked: ${messageId}`);
        break;

      case 'bounce':
      case 'hardBounce':
      case 'softBounce':
        await supabase
          .from('email_queue')
          .update({ 
            bounced_at: new Date().toISOString(),
            status: 'failed',
            error_message: eventData.reason || 'Email bounced'
          })
          .eq('brevo_email_id', messageId);
        console.log(`Email bounced: ${messageId}`);
        break;

      case 'spam':
        // Mark as spam
        await supabase
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: 'Marked as spam'
          })
          .eq('brevo_email_id', messageId);
        console.log(`Email marked as spam: ${messageId}`);
        break;

      case 'blocked':
        await supabase
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: 'Email blocked'
          })
          .eq('brevo_email_id', messageId);
        console.log(`Email blocked: ${messageId}`);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
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

