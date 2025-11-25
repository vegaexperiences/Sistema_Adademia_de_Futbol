'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { brevo, SendSmtpEmail } from '@/lib/brevo/client';

export interface QueuedEmail {
  id: string;
  template_id: string | null;
  to_email: string;
  subject: string;
  html_content: string;
  status: 'pending' | 'sent' | 'failed';
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

const DAILY_LIMIT = 300;

export async function queueEmail(
  templateName: string,
  recipientEmail: string,
  variables: Record<string, any>,
  scheduledFor?: Date
) {
  const supabase = await createClient();
  
  // Get template
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .eq('name', templateName)
    .eq('is_active', true)
    .single();
  
  if (!template) {
    return { error: 'Template not found' };
  }
  
  // Use production URL for logo - must be publicly accessible
  // Ensure it's a full HTTPS URL for email clients
  const defaultLogoUrl =
    process.env.NEXT_PUBLIC_LOGO_URL ||
    'https://sistema-adademia-de-futbol-tura.vercel.app/logo.png';

  // Ensure logoUrl is always a full HTTPS URL
  const logoUrl = defaultLogoUrl.startsWith('http')
    ? defaultLogoUrl
    : `https://${defaultLogoUrl.replace(/^\/+/, '')}`;

  const mergedVariables = {
    logoUrl: logoUrl,
    ...variables,
  };

  // Replace variables in template
  let htmlContent = template.html_template;
  let subject = template.subject;

  // Log for debugging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Replacing logoUrl in template:', logoUrl);
    console.log('Template before replacement contains logoUrl:', htmlContent.includes('{{logoUrl}}'));
  }

  // Replace all variables - escape special regex characters
  Object.entries(mergedVariables).forEach(([key, value]) => {
    // Escape special regex characters in the key
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match {{key}} pattern
    const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');
    htmlContent = htmlContent.replace(regex, String(value));
    subject = subject.replace(regex, String(value));
  });

  // Verify replacement worked (only in development)
  if (process.env.NODE_ENV !== 'production' && htmlContent.includes('{{logoUrl}}')) {
    console.warn('⚠️ logoUrl was not replaced in template! Template may be missing the variable.');
  }
  
  // Queue the email
  // scheduled_for should be a DATE (not TIMESTAMPTZ), so we extract just the date part
  const scheduledDate = scheduledFor || new Date();
  const scheduledDateOnly = scheduledDate instanceof Date 
    ? scheduledDate.toISOString().split('T')[0]
    : scheduledDate;
  
  const { error } = await supabase
    .from('email_queue')
    .insert({
      template_id: template.id,
      to_email: recipientEmail,
      subject,
      html_content: htmlContent,
      scheduled_for: scheduledDateOnly,
      metadata: variables
    });
  
  if (error) {
    console.error('Error queueing email:', error);
    return { error: 'Error al encolar correo' };
  }
  
  return { success: true };
}

export async function queueBatchEmails(
  templateName: string,
  recipients: Array<{ email: string; variables: Record<string, any> }>
) {
  const totalEmails = recipients.length;
  const batches = Math.ceil(totalEmails / DAILY_LIMIT);
  
  let currentDate = new Date();
  let emailIndex = 0;
  
  for (let batch = 0; batch < batches; batch++) {
    const batchRecipients = recipients.slice(
      batch * DAILY_LIMIT,
      (batch + 1) * DAILY_LIMIT
    );
    
    for (const recipient of batchRecipients) {
      await queueEmail(
        templateName,
        recipient.email,
        recipient.variables,
        new Date(currentDate)
      );
      emailIndex++;
    }
    
    // Move to next day for next batch
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  revalidatePath('/dashboard/settings/emails');
  return { 
    success: true, 
    totalQueued: totalEmails,
    days: batches 
  };
}

export async function processEmailQueue() {
  const supabase = await createClient();
  
  // Get today's sent count first to check limit
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;
  
  const { count: todaySentCount } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .not('sent_at', 'is', null)
    .gte('sent_at', todayStart)
    .lte('sent_at', todayEnd);
  
  const remainingToday = Math.max(0, DAILY_LIMIT - (todaySentCount || 0));
  
  if (remainingToday === 0) {
    return { error: 'Límite diario alcanzado', sent: 0, failed: 0, total: 0 };
  }
  
  // Get pending emails for today, limited to remaining quota
  const { data: emails, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', today)
    .order('created_at')
    .limit(remainingToday);
  
  if (error || !emails) {
    console.error('Error fetching email queue:', error);
    return { error: 'Error al obtener cola de correos' };
  }
  
  if (emails.length === 0) {
    return { success: true, sent: 0, failed: 0, total: 0, message: 'No hay correos pendientes' };
  }
  
  let sent = 0;
  let failed = 0;
  
  for (const email of emails) {
    // Double-check status before sending to prevent duplicates
    const { data: emailCheck } = await supabase
      .from('email_queue')
      .select('status')
      .eq('id', email.id)
      .single();
    
    if (emailCheck?.status !== 'pending') {
      console.log(`Skipping email ${email.id} - status is ${emailCheck?.status}, not pending`);
      continue;
    }
    
    try {
      // Mark as processing first to prevent duplicate sends
      await supabase
        .from('email_queue')
        .update({ status: 'sent' }) // Temporarily mark as sent to prevent duplicates
        .eq('id', email.id)
        .eq('status', 'pending'); // Only update if still pending
      
      const sendSmtpEmail: SendSmtpEmail = {
        sender: { name: 'Suarez Academy', email: process.env.BREVO_FROM_EMAIL || 'noreply@suarezacademy.com' },
        to: [{ email: email.to_email }],
        subject: email.subject,
        htmlContent: email.html_content,
      };

      const result = await brevo.sendTransacEmail(sendSmtpEmail);
      
      // Brevo returns { response, body } where body contains the messageId
      // The messageId format from Brevo API is usually just the ID, but webhooks send it with angle brackets
      // We'll store it as-is and handle both formats in the webhook
      let messageId = result.body?.messageId || (result as any).messageId;
      
      // Clean messageId - remove angle brackets if present and trim
      if (messageId) {
        messageId = messageId.replace(/^<|>$/g, '').trim();
      }
      
      console.log(`Email sent via Brevo - messageId: ${messageId}, email_queue id: ${email.id}`);
      
      // Update with Brevo message ID and sent_at timestamp
      // Try brevo_email_id first, fallback to resend_email_id if column doesn't exist
      const sentAt = new Date().toISOString();
      const updateData: any = {
        status: 'sent',
        sent_at: sentAt,
      };
      
      // Try to update with brevo_email_id, but handle case where column doesn't exist
      try {
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            ...updateData,
            brevo_email_id: messageId || null
          })
          .eq('id', email.id);
        
        if (updateError) {
          // If brevo_email_id column doesn't exist, try resend_email_id
          if (updateError.message?.includes('brevo_email_id') || updateError.code === '42703') {
            console.log('brevo_email_id column not found, using resend_email_id as fallback');
            const { error: fallbackError } = await supabase
              .from('email_queue')
              .update({
                ...updateData,
                resend_email_id: messageId || null
              })
              .eq('id', email.id);
            
            if (fallbackError) {
              console.error('Error updating email_queue with resend_email_id:', fallbackError);
            } else {
              console.log(`Email queue updated successfully - resend_email_id: ${messageId}`);
            }
          } else {
            console.error('Error updating email_queue:', updateError);
          }
        } else {
          console.log(`Email queue updated successfully - brevo_email_id: ${messageId}`);
        }
      } catch (err: any) {
        console.error('Unexpected error updating email_queue:', err);
      }
      
      // Update player monthly statement timestamp if applicable
      if (email.metadata?.player_id) {
        await supabase
          .from('players')
          .update({ monthly_statement_sent_at: sentAt })
          .eq('id', email.metadata.player_id);
      }
      
      sent++;
    } catch (err: any) {
      console.error('Error sending email:', err);
      
      // Mark as failed
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          error_message: err.message || 'Unknown error'
        })
        .eq('id', email.id);
      
      failed++;
    }
  }
  
  revalidatePath('/dashboard/settings/emails');
  return { success: true, sent, failed, total: emails.length };
}

/**
 * Get Brevo account statistics to sync with real email counts
 */
async function getBrevoAccountStats() {
  try {
    const { brevoAccount } = await import('@/lib/brevo/client');
    
    // Try to get account information
    const accountInfo = await brevoAccount.getAccount();
    
    // Brevo account info may include plan limits and usage
    // Note: The exact structure depends on Brevo's API response
    return {
      planType: (accountInfo as any).planType,
      credits: (accountInfo as any).credits,
      // Some Brevo accounts show remaining emails in the response
      remainingEmails: (accountInfo as any).emailCredits || null,
    };
  } catch (error) {
    console.warn('Could not fetch Brevo account stats:', error);
    return null;
  }
}

export async function getQueueStatus() {
  const supabase = await createClient();
  
  const { count: pending } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  const { count: sent } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent');
  
  const { count: failed } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');
  
  // Get today's sent count to check against limit
  // Use UTC date to ensure consistency
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;
  
  // Query for emails sent today - try sent_at first, then fallback to created_at if sent_at is null
  // This handles cases where emails were marked as 'sent' but sent_at wasn't set
  // Use date comparison with proper timezone handling
  // Also check if sent_at is a string that needs parsing
  const { count: todaySentBySentAt, error: countError1 } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .not('sent_at', 'is', null)
    .gte('sent_at', todayStart)
    .lte('sent_at', todayEnd);
  
  // Also count emails with status='sent' but sent_at is null, using created_at as fallback
  const { count: todaySentByCreatedAt, error: countError2 } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .is('sent_at', null)
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd);
  
  // Additional query: Get all sent emails today regardless of sent_at format
  // This helps catch emails that might have been sent but have timestamp issues
  const { data: allTodayEmails, error: allTodayError } = await supabase
    .from('email_queue')
    .select('id, sent_at, created_at, status, to_email')
    .eq('status', 'sent')
    .or(`sent_at.gte.${todayStart},sent_at.is.null,created_at.gte.${todayStart}`)
    .or(`sent_at.lte.${todayEnd},sent_at.is.null,created_at.lte.${todayEnd}`);
  
  // Count emails where sent_at or created_at is today (more lenient check)
  let actualTodayCount = 0;
  if (allTodayEmails) {
    actualTodayCount = allTodayEmails.filter(email => {
      const sentDate = email.sent_at ? new Date(email.sent_at).toISOString().split('T')[0] : null;
      const createdDate = email.created_at ? new Date(email.created_at).toISOString().split('T')[0] : null;
      return sentDate === today || createdDate === today;
    }).length;
  }
  
  const todaySent = (todaySentBySentAt || 0) + (todaySentByCreatedAt || 0);
  
  // Use the more lenient count if it's higher (catches edge cases)
  const finalTodaySent = Math.max(todaySent, actualTodayCount);
  
  if (countError1 || countError2) {
    console.error('Error counting today\'s emails:', countError1 || countError2);
  } else {
    console.log(`Today's email count: ${finalTodaySent} (strict: ${todaySent}, lenient: ${actualTodayCount}, by sent_at: ${todaySentBySentAt || 0}, by created_at fallback: ${todaySentByCreatedAt || 0})`);
    if (allTodayError) {
      console.error('Error getting all today emails:', allTodayError);
    }
  }
  
  // Try to get Brevo account stats for real-time sync
  const brevoStats = await getBrevoAccountStats();
  
  // Calculate remaining based on Brevo's actual count if available
  // Brevo shows "289 / 300 Marketing & Transactional emails left"
  // This means: 300 - 289 = 11 emails sent today
  // So: remaining = 289, sentToday = 11
  let actualTodaySent = finalTodaySent || 0;
  let actualRemainingToday = Math.max(0, DAILY_LIMIT - actualTodaySent);
  
  // If we can get Brevo stats, use them as the source of truth
  // Note: We'll need to calculate from remaining emails
  // If Brevo says 289 remaining out of 300, that means 11 were sent
  if (brevoStats?.remainingEmails !== null && brevoStats?.remainingEmails !== undefined) {
    // Brevo shows remaining, so: sent = limit - remaining
    const brevoSentToday = Math.max(0, DAILY_LIMIT - brevoStats.remainingEmails);
    // Use Brevo's count as it's the source of truth (it's more accurate than our DB count)
    console.log(`Using Brevo stats: ${brevoSentToday} sent today (${brevoStats.remainingEmails} remaining out of ${DAILY_LIMIT})`);
    actualTodaySent = brevoSentToday;
    actualRemainingToday = brevoStats.remainingEmails;
  } else {
    console.log(`Using database count: ${finalTodaySent} sent today (DB may not have all emails if sent outside the system)`);
  }
  
  return {
    pending: pending || 0,
    sent: sent || 0,
    failed: failed || 0,
    todaySent: actualTodaySent, // Use Brevo stats if available, otherwise use DB count
    dailyLimit: DAILY_LIMIT,
    remainingToday: actualRemainingToday,
    // Include Brevo stats for debugging
    brevoStats: brevoStats ? {
      remainingEmails: brevoStats.remainingEmails,
      planType: brevoStats.planType,
    } : null,
  };
}

export interface TutorRecipient {
  email: string;
  tutorName: string | null;
}

type PlayerWithFamily = {
  id: string;
  family_id: string | null;
  status: string;
  families:
    | {
        tutor_email: string | null;
        tutor_name: string | null;
      }
    | Array<{
        tutor_email: string | null;
        tutor_name: string | null;
      }>
    | null;
};

export async function getTutorRecipientsByStatuses(statuses: string[]): Promise<TutorRecipient[]> {
  if (!statuses.length) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('players')
    .select('id, family_id, status, families ( tutor_email, tutor_name )')
    .in('status', statuses)
    .not('family_id', 'is', null);

  if (error || !data) {
    console.error('Error fetching tutor recipients:', error);
    return [];
  }

  const dedup = new Map<string, TutorRecipient>();

  (data as PlayerWithFamily[]).forEach((player) => {
    const family = Array.isArray(player.families) ? player.families[0] : player.families;
    const email = family?.tutor_email?.toLowerCase();
    if (!email) return;

    if (!dedup.has(email)) {
      dedup.set(email, {
        email,
        tutorName: family?.tutor_name || 'Familia Suarez',
      });
    }
  });

  return Array.from(dedup.values());
}
