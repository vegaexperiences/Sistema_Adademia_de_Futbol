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
  resend_email_id: string | null;
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
  const { data: emails, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('to_email', family.tutor_email)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(50); // Last 50 emails
  
  if (error) {
    console.error('Error fetching player emails:', error);
    return [];
  }
  
  return emails as PlayerEmail[];
}
