'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { resend } from '@/lib/resend/client';

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

const DAILY_LIMIT = 98;

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
  
  // Replace variables in template
  let htmlContent = template.html_template;
  let subject = template.subject;
  
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    htmlContent = htmlContent.replace(regex, variables[key]);
    subject = subject.replace(regex, variables[key]);
  });
  
  // Queue the email
  const { error } = await supabase
    .from('email_queue')
    .insert({
      template_id: template.id,
      to_email: recipientEmail,
      subject,
      html_content: htmlContent,
      scheduled_for: scheduledFor || new Date(),
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
  
  // Get pending emails for today, limited to DAILY_LIMIT
  const today = new Date().toISOString().split('T')[0];
  
  const { data: emails, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', today)
    .order('created_at')
    .limit(DAILY_LIMIT);
  
  if (error || !emails) {
    console.error('Error fetching email queue:', error);
    return { error: 'Error al obtener cola de correos' };
  }
  
  let sent = 0;
  let failed = 0;
  
  for (const email of emails) {
    try {
      await resend.emails.send({
        from: 'Suarez Academy <onboarding@resend.dev>',
        to: [email.to_email],
        subject: email.subject,
        html: email.html_content,
      });
      
      // Mark as sent
      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', email.id);
      
      // Update player monthly statement timestamp if applicable
      if (email.metadata?.player_id) {
        await supabase
          .from('players')
          .update({ monthly_statement_sent_at: new Date().toISOString() })
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
  const today = new Date().toISOString().split('T')[0];
  const { count: todaySent } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', `${today}T00:00:00`)
    .lte('sent_at', `${today}T23:59:59`);
  
  return {
    pending: pending || 0,
    sent: sent || 0,
    failed: failed || 0,
    todaySent: todaySent || 0,
    dailyLimit: DAILY_LIMIT,
    remainingToday: Math.max(0, DAILY_LIMIT - (todaySent || 0))
  };
}
