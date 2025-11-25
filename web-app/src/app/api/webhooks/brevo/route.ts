import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

// Brevo webhook events
// https://developers.brevo.com/docs/webhooks-2

// GET method for webhook URL validation
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Brevo webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}

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

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('Invalid JSON in webhook body:', e);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    console.log('Brevo webhook received:', JSON.stringify(data, null, 2));
    
    // Brevo webhook format can vary - handle both formats
    // Format 1: { event: 'delivered', 'message-id': 'xxx', ... }
    // Format 2: { event: 'delivered', messageId: 'xxx', ... }
    // Format 3: Array of events: [{ event: 'delivered', 'message-id': 'xxx' }, ...]
    let events = Array.isArray(data) ? data : [data];
    
    const supabase = await createClient();
    let processed = 0;
    
    for (const eventData of events) {
      const event = eventData.event || eventData['event'];
      let messageId = eventData['message-id'] || eventData.messageId || eventData['message_id'] || eventData.message_id;

      if (!messageId) {
        console.warn('No message-id in webhook event:', eventData);
        continue;
      }
      
      if (!event) {
        console.warn('No event in webhook data:', eventData);
        continue;
      }
      
      // Clean messageId - remove angle brackets if present
      messageId = messageId.replace(/^<|>$/g, '').trim();
      
      processed++;

      // Update email_queue based on event type
      switch (event) {
      case 'sent':
        // Email was sent successfully
        console.log(`Email sent: ${messageId}`);
        break;

      case 'delivered':
        const { data: deliveredEmail, error: deliveredError } = await supabase
          .from('email_queue')
          .update({ delivered_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId)
          .select('id')
          .single();
        
        if (deliveredError || !deliveredEmail) {
          // Try to find by partial match (in case format differs)
          const { data: partialMatch } = await supabase
            .from('email_queue')
            .select('id, brevo_email_id')
            .like('brevo_email_id', `%${messageId.split('@')[0]}%`)
            .limit(1)
            .single();
          
          if (partialMatch) {
            await supabase
              .from('email_queue')
              .update({ delivered_at: new Date().toISOString() })
              .eq('id', partialMatch.id);
            console.log(`Email delivered (partial match): ${messageId} (email_queue id: ${partialMatch.id})`);
          } else {
            console.warn(`Could not find email with brevo_email_id: ${messageId}`, deliveredError);
          }
        } else {
          console.log(`Email delivered: ${messageId} (email_queue id: ${deliveredEmail.id})`);
        }
        break;

      case 'opened':
      case 'unique_opened':
        // unique_opened is the same as opened - first time email is opened
        const { data: openedEmail, error: openedError } = await supabase
          .from('email_queue')
          .update({ opened_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId)
          .select('id')
          .single();
        
        if (openedError || !openedEmail) {
          // Try to find by partial match
          const { data: partialMatch } = await supabase
            .from('email_queue')
            .select('id, brevo_email_id')
            .like('brevo_email_id', `%${messageId.split('@')[0]}%`)
            .limit(1)
            .single();
          
          if (partialMatch) {
            await supabase
              .from('email_queue')
              .update({ opened_at: new Date().toISOString() })
              .eq('id', partialMatch.id);
            console.log(`Email opened (partial match): ${messageId} (email_queue id: ${partialMatch.id})`);
          } else {
            console.warn(`Could not find email with brevo_email_id: ${messageId}`, openedError);
          }
        } else {
          console.log(`Email opened: ${messageId} (email_queue id: ${openedEmail.id})`);
        }
        break;

      case 'click':
        const { data: clickedEmail, error: clickedError } = await supabase
          .from('email_queue')
          .update({ clicked_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId)
          .select('id')
          .single();
        
        if (clickedError || !clickedEmail) {
          console.warn(`Could not find email with brevo_email_id: ${messageId}`, clickedError);
        } else {
          console.log(`Email link clicked: ${messageId} (email_queue id: ${clickedEmail.id})`);
        }
        break;

      case 'bounce':
      case 'hardBounce':
      case 'softBounce':
        await supabase
          .from('email_queue')
          .update({ 
            bounced_at: new Date().toISOString(),
            status: 'failed',
            error_message: eventData.reason || eventData['reason'] || 'Email bounced'
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

      case 'request':
        // This is just a webhook test/validation event, ignore it
        console.log(`Webhook validation request received: ${messageId}`);
        break;

      default:
        console.log(`Unhandled webhook event: ${event} for message ${messageId}`);
    }
    }

    // Revalidate email settings page to update counters
    revalidatePath('/dashboard/settings/emails');

    return NextResponse.json({ received: true, processed });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

