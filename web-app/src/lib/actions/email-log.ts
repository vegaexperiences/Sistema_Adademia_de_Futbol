'use server';

import { createClient } from '@/lib/supabase/server';

// Track email sends in a simple log table
export async function logEmailSent(
  to: string, 
  subject: string, 
  context: string = 'direct',
  resendEmailId: string | null = null
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('email_queue')
    .insert({
      to_email: to,
      subject: subject,
      html_content: '',
      status: 'sent',
      sent_at: new Date().toISOString(),
      scheduled_for: new Date().toISOString().split('T')[0],
      resend_email_id: resendEmailId,
      metadata: { context }
    });
  
  if (error) {
    console.error('Error logging email:', error);
  }
}

export async function getTodayEmailCount() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { count } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', `${today}T00:00:00`)
    .lte('sent_at', `${today}T23:59:59`);
  
  return count || 0;
}
