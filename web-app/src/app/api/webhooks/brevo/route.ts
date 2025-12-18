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

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('Invalid JSON in webhook body:', e);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    console.log('📧 Brevo webhook received:', JSON.stringify(data, null, 2));
    console.log('📧 Webhook signature:', signature ? 'present' : 'missing');
    console.log('📧 Webhook URL:', request.url);
    
    // Brevo webhook format can vary - handle both formats
    // Format 1: { event: 'delivered', 'message-id': 'xxx', ... }
    // Format 2: { event: 'delivered', messageId: 'xxx', ... }
    // Format 3: Array of events: [{ event: 'delivered', 'message-id': 'xxx' }, ...]
    const events = Array.isArray(data) ? data : [data];
    
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
      
      // Find email in email_queue (single-tenant)
      const { data: emailRecord } = await supabase
        .from('email_queue')
        .select('id, brevo_email_id')
        .or(`brevo_email_id.eq.${messageId},brevo_email_id.ilike.%${messageId}%`)
        .limit(1)
        .maybeSingle()
      
      // Single-tenant: use env var for webhook secret
      const webhookSecret = process.env.BREVO_WEBHOOK_SECRET || null
      
      // Validate webhook signature (single-tenant)
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
      
      console.log('📧 Webhook validated:', {
        messageId,
        event,
      });
      
      processed++;

      // Update email_queue based on event type
      switch (event) {
      case 'sent':
        // Email was sent successfully
        console.log(`Email sent: ${messageId}`);
        break;

      case 'delivered':
        // Try brevo_email_id first, then resend_email_id as fallback
        let deliveredEmail = null;
        
        // First try exact match with brevo_email_id
        const { data: brevoDelivered, error: brevoError } = await supabase
          .from('email_queue')
          .update({ delivered_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId)
          .select('id, brevo_email_id')
          .single();
        
        if (brevoError || !brevoDelivered) {
          // Try resend_email_id as fallback (for old emails)
          const { data: resendDelivered, error: resendError } = await supabase
            .from('email_queue')
            .update({ delivered_at: new Date().toISOString() })
            .eq('resend_email_id', messageId)
            .select('id, resend_email_id')
            .single();
          
          if (resendDelivered && !resendError) {
            deliveredEmail = resendDelivered;
            console.log(`Email delivered (resend_email_id): ${messageId} (email_queue id: ${deliveredEmail.id})`);
          } else {
            // Try partial match - Brevo messageId might have extra info
            const messageIdBase = messageId.split('@')[0] || messageId.split('<')[0] || messageId;
            const { data: partialMatches } = await supabase
              .from('email_queue')
              .select('id, brevo_email_id, resend_email_id')
              .or(`brevo_email_id.ilike.%${messageIdBase}%,resend_email_id.ilike.%${messageIdBase}%`)
              .limit(5);
            
            if (partialMatches && partialMatches.length > 0) {
              // Update the first match
              const match = partialMatches[0];
              await supabase
                .from('email_queue')
                .update({ delivered_at: new Date().toISOString() })
                .eq('id', match.id);
              console.log(`Email delivered (partial match): ${messageId} -> ${match.brevo_email_id || match.resend_email_id} (email_queue id: ${match.id})`);
            } else {
              // Last resort: try to find by to_email if we have it in the webhook
              // Also try to match by date (within last 7 days) to find recent emails
              const toEmail = eventData.email || eventData['email'] || eventData.to;
              const eventDate = eventData.date || eventData['date'] || eventData.timestamp;
              
              if (toEmail) {
                // First try exact match with most recent email
                let { data: emailMatch } = await supabase
                  .from('email_queue')
                  .select('id, to_email, sent_at, brevo_email_id')
                  .eq('to_email', toEmail)
                  .eq('status', 'sent')
                  .order('sent_at', { ascending: false })
                  .limit(1)
                  .single();
                
                // If no exact match, try to find emails sent in the last 7 days
                if (!emailMatch) {
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  
                  const { data: recentEmails } = await supabase
                    .from('email_queue')
                    .select('id, to_email, sent_at, brevo_email_id')
                    .eq('to_email', toEmail)
                    .eq('status', 'sent')
                    .gte('sent_at', sevenDaysAgo.toISOString())
                    .order('sent_at', { ascending: false })
                    .limit(5);
                  
                  if (recentEmails && recentEmails.length > 0) {
                    // Use the most recent one
                    emailMatch = recentEmails[0];
                    console.log(`Found ${recentEmails.length} recent emails for ${toEmail}, using most recent`);
                  }
                }
                
                if (emailMatch) {
                  await supabase
                    .from('email_queue')
                    .update({ delivered_at: new Date().toISOString() })
                    .eq('id', emailMatch.id);
                  console.log(`Email delivered (by email match): ${messageId} -> ${toEmail} (email_queue id: ${emailMatch.id}, sent_at: ${emailMatch.sent_at})`);
                } else {
                  console.warn(`Could not find email with messageId: ${messageId} or email: ${toEmail}. Webhook data:`, JSON.stringify(eventData, null, 2));
                }
              } else {
                console.warn(`Could not find email with messageId: ${messageId} (no email address in webhook). Full event:`, JSON.stringify(eventData, null, 2));
              }
            }
          }
        } else {
          deliveredEmail = brevoDelivered;
          console.log(`Email delivered: ${messageId} (email_queue id: ${deliveredEmail.id})`);
        }
        break;

      case 'opened':
      case 'unique_opened':
        // unique_opened is the same as opened - first time email is opened
        console.log(`📧 [Webhook] Email opened event received:`, {
          event,
          messageId,
          messageIdLength: messageId?.length || 0,
          messageIdCleaned: messageId,
          toEmail: eventData.email || eventData['email'] || eventData.to || 'N/A',
          fullEventData: JSON.stringify(eventData, null, 2),
        });
        
        // Try brevo_email_id first, then resend_email_id as fallback
        let openedEmail = null;
        
        // First try exact match with brevo_email_id
        console.log(`📧 [Webhook] Attempting to find email with brevo_email_id: ${messageId}`);
        const { data: brevoOpened, error: brevoOpenedErr } = await supabase
          .from('email_queue')
          .update({ opened_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId)
          .select('id, brevo_email_id, to_email, sent_at')
          .single();
        
        if (brevoOpenedErr || !brevoOpened) {
          console.log(`📧 [Webhook] No exact match found with brevo_email_id:`, {
            error: brevoOpenedErr?.message || 'No error but no match',
            errorCode: brevoOpenedErr?.code,
            messageId,
          });
          // Try resend_email_id as fallback (for old emails)
          console.log(`📧 [Webhook] Trying resend_email_id as fallback: ${messageId}`);
          const { data: resendOpened, error: resendOpenedErr } = await supabase
            .from('email_queue')
            .update({ opened_at: new Date().toISOString() })
            .eq('resend_email_id', messageId)
            .select('id, resend_email_id, to_email, sent_at')
            .single();
          
          if (resendOpened && !resendOpenedErr) {
            openedEmail = resendOpened;
            console.log(`📧 [Webhook] ✅ Email opened (resend_email_id):`, {
              messageId,
              emailQueueId: openedEmail.id,
              toEmail: openedEmail.to_email,
              sentAt: openedEmail.sent_at,
            });
          } else {
            console.log(`📧 [Webhook] No match with resend_email_id, trying partial match`);
            // Try partial match - Brevo messageId might have extra info
            const messageIdBase = messageId.split('@')[0] || messageId.split('<')[0] || messageId;
            console.log(`📧 [Webhook] Searching for partial match with base: ${messageIdBase}`);
            const { data: partialMatches } = await supabase
              .from('email_queue')
              .select('id, brevo_email_id, resend_email_id, to_email, sent_at')
              .or(`brevo_email_id.ilike.%${messageIdBase}%,resend_email_id.ilike.%${messageIdBase}%`)
              .limit(5);
            
            console.log(`📧 [Webhook] Partial match results:`, {
              found: partialMatches?.length || 0,
              matches: partialMatches?.map(m => ({
                id: m.id,
                brevo_email_id: m.brevo_email_id,
                resend_email_id: m.resend_email_id,
                to_email: m.to_email,
              })),
            });
            
            if (partialMatches && partialMatches.length > 0) {
              // Update the first match
              const match = partialMatches[0];
              await supabase
                .from('email_queue')
                .update({ opened_at: new Date().toISOString() })
                .eq('id', match.id);
              console.log(`📧 [Webhook] ✅ Email opened (partial match):`, {
                originalMessageId: messageId,
                matchedId: match.brevo_email_id || match.resend_email_id,
                emailQueueId: match.id,
                toEmail: match.to_email,
              });
              } else {
                // Last resort: try to find by to_email if we have it in the webhook
                // Also try to match by date (within last 7 days) to find recent emails
                const toEmail = eventData.email || eventData['email'] || eventData.to;
                const eventDate = eventData.date || eventData['date'] || eventData.timestamp;
                
                console.log(`📧 [Webhook] Trying last resort match by email address:`, {
                  toEmail,
                  eventDate,
                  messageId,
                });
                
                if (toEmail) {
                  // First try exact match with most recent email
                  let { data: emailMatch } = await supabase
                    .from('email_queue')
                    .select('id, to_email, sent_at, brevo_email_id, resend_email_id')
                    .eq('to_email', toEmail)
                    .eq('status', 'sent')
                    .order('sent_at', { ascending: false })
                    .limit(1)
                    .single();
                  
                  // If no exact match, try to find emails sent in the last 7 days
                  if (!emailMatch) {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    
                    const { data: recentEmails } = await supabase
                      .from('email_queue')
                      .select('id, to_email, sent_at, brevo_email_id, resend_email_id')
                      .eq('to_email', toEmail)
                      .eq('status', 'sent')
                      .gte('sent_at', sevenDaysAgo.toISOString())
                      .order('sent_at', { ascending: false })
                      .limit(5);
                    
                    if (recentEmails && recentEmails.length > 0) {
                      // Use the most recent one
                      emailMatch = recentEmails[0];
                      console.log(`📧 [Webhook] Found ${recentEmails.length} recent emails for ${toEmail}, using most recent`);
                    }
                  }
                  
                  if (emailMatch) {
                    await supabase
                      .from('email_queue')
                      .update({ opened_at: new Date().toISOString() })
                      .eq('id', emailMatch.id);
                    console.log(`📧 [Webhook] ✅ Email opened (by email match):`, {
                      messageId,
                      toEmail,
                      emailQueueId: emailMatch.id,
                      sentAt: emailMatch.sent_at,
                      brevo_email_id: emailMatch.brevo_email_id,
                      resend_email_id: emailMatch.resend_email_id,
                    });
                  } else {
                    console.warn(`📧 [Webhook] ❌ Could not find email with messageId: ${messageId} or email: ${toEmail}. Webhook data:`, JSON.stringify(eventData, null, 2));
                  }
                } else {
                  console.warn(`📧 [Webhook] ❌ Could not find email with messageId: ${messageId} (no email address in webhook). Full event:`, JSON.stringify(eventData, null, 2));
                }
              }
          }
        } else {
          openedEmail = brevoOpened;
          console.log(`📧 [Webhook] ✅ Email opened (exact match with brevo_email_id):`, {
            messageId,
            emailQueueId: openedEmail.id,
            toEmail: openedEmail.to_email,
            sentAt: openedEmail.sent_at,
          });
        }
        break;

      case 'click':
        // Try brevo_email_id first, then resend_email_id as fallback
        let clickedEmail = null;
        let clickedError = null;
        
        const { data: brevoClicked, error: brevoClickedErr } = await supabase
          .from('email_queue')
          .update({ clicked_at: new Date().toISOString() })
          .eq('brevo_email_id', messageId)
          .select('id')
          .single();
        
        if (brevoClickedErr && (brevoClickedErr.message?.includes('brevo_email_id') || brevoClickedErr.code === '42703')) {
          // Column doesn't exist, try resend_email_id
          const { data: resendClicked, error: resendClickedErr } = await supabase
            .from('email_queue')
            .update({ clicked_at: new Date().toISOString() })
            .eq('resend_email_id', messageId)
            .select('id')
            .single();
          
          clickedEmail = resendClicked;
          clickedError = resendClickedErr;
        } else {
          clickedEmail = brevoClicked;
          clickedError = brevoClickedErr;
        }
        
        if (clickedError || !clickedEmail) {
          console.warn(`Could not find email with messageId: ${messageId}`, clickedError);
        } else {
          console.log(`Email link clicked: ${messageId} (email_queue id: ${clickedEmail.id})`);
        }
        break;

      case 'bounce':
      case 'hardBounce':
      case 'softBounce':
        // Try brevo_email_id first, then resend_email_id
        let bounceResult = await supabase
          .from('email_queue')
          .update({ 
            bounced_at: new Date().toISOString(),
            status: 'failed',
            error_message: eventData.reason || eventData['reason'] || 'Email bounced'
          })
          .eq('brevo_email_id', messageId);
        
        if (bounceResult.error && (bounceResult.error.message?.includes('brevo_email_id') || bounceResult.error.code === '42703')) {
          bounceResult = await supabase
            .from('email_queue')
            .update({ 
              bounced_at: new Date().toISOString(),
              status: 'failed',
              error_message: eventData.reason || eventData['reason'] || 'Email bounced'
            })
            .eq('resend_email_id', messageId);
        }
        console.log(`Email bounced: ${messageId}`);
        break;

      case 'spam':
        // Mark as spam - try brevo_email_id first, then resend_email_id
        let spamResult = await supabase
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: 'Marked as spam'
          })
          .eq('brevo_email_id', messageId);
        
        if (spamResult.error && (spamResult.error.message?.includes('brevo_email_id') || spamResult.error.code === '42703')) {
          spamResult = await supabase
            .from('email_queue')
            .update({ 
              status: 'failed',
              error_message: 'Marked as spam'
            })
            .eq('resend_email_id', messageId);
        }
        console.log(`Email marked as spam: ${messageId}`);
        break;

      case 'blocked':
        // Try brevo_email_id first, then resend_email_id
        let blockedResult = await supabase
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: 'Email blocked'
          })
          .eq('brevo_email_id', messageId);
        
        if (blockedResult.error && (blockedResult.error.message?.includes('brevo_email_id') || blockedResult.error.code === '42703')) {
          blockedResult = await supabase
            .from('email_queue')
            .update({ 
              status: 'failed',
              error_message: 'Email blocked'
            })
            .eq('resend_email_id', messageId);
        }
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

