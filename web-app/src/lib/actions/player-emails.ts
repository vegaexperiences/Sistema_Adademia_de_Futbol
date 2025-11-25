'use server';

import { createClient } from '@/lib/supabase/server';

export interface PlayerEmail {
  id: string;
  subject: string;
  to_email: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  clicked_at: string | null;
  status: string;
  brevo_email_id: string | null;
}

export async function getPlayerEmailHistory(playerId: string): Promise<PlayerEmail[]> {
  const supabase = await createClient();
  
  // Get player's family to find tutor email
  const { data: player } = await supabase
    .from('players')
    .select('family_id')
    .eq('id', playerId)
    .single();
  
  if (!player?.family_id) {
    return [];
  }
  
  // Get family tutor email
  const { data: family } = await supabase
    .from('families')
    .select('tutor_email')
    .eq('id', player.family_id)
    .single();
  
  if (!family?.tutor_email) {
    return [];
  }
  
  // Get all emails sent to this tutor's email
  // Include all statuses but prioritize sent emails
  const { data: emails, error } = await supabase
    .from('email_queue')
    .select('id, subject, to_email, sent_at, delivered_at, opened_at, bounced_at, clicked_at, status, brevo_email_id, created_at')
    .eq('to_email', family.tutor_email)
    .in('status', ['sent', 'pending', 'failed']) // Include all statuses for debugging
    .order('created_at', { ascending: false }) // Order by creation date, not sent_at (which can be null)
    .limit(50); // Last 50 emails
  
  if (error) {
    console.error('Error fetching player emails:', error);
    return [];
  }
  
  // Log for debugging
  console.log(`Found ${emails?.length || 0} emails for tutor ${family.tutor_email}`);
  if (emails && emails.length > 0) {
    emails.forEach((email: any) => {
      console.log(`Email ${email.id}: status=${email.status}, sent_at=${email.sent_at}, subject=${email.subject}`);
    });
  }
  
  return emails as PlayerEmail[];
}
