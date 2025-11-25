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
    .select('family_id, first_name, last_name')
    .eq('id', playerId)
    .single();
  
  if (!player?.family_id) {
    console.log(`Player ${playerId} has no family_id`);
    return [];
  }
  
  // Get family tutor email
  const { data: family } = await supabase
    .from('families')
    .select('tutor_email, tutor_name')
    .eq('id', player.family_id)
    .single();
  
  if (!family?.tutor_email) {
    console.log(`Family ${player.family_id} has no tutor_email`);
    return [];
  }
  
  // Normalize email for comparison (lowercase, trim)
  const normalizedTutorEmail = family.tutor_email.toLowerCase().trim();
  
  console.log(`Looking for emails sent to: ${normalizedTutorEmail} (player: ${player.first_name} ${player.last_name})`);
  
  // Get all emails sent to this tutor's email
  // Use case-insensitive comparison and include all statuses
  const { data: allEmails, error: allError } = await supabase
    .from('email_queue')
    .select('id, subject, to_email, sent_at, delivered_at, opened_at, bounced_at, clicked_at, status, brevo_email_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100); // Get more to filter client-side
  
  if (allError) {
    console.error('Error fetching all emails:', allError);
    return [];
  }
  
  // Filter emails that match the tutor email (case-insensitive)
  const emails = (allEmails || []).filter((email: any) => {
    const normalizedToEmail = (email.to_email || '').toLowerCase().trim();
    return normalizedToEmail === normalizedTutorEmail;
  }).slice(0, 50); // Limit to 50
  
  // Log for debugging
  console.log(`Found ${emails.length} emails for tutor ${normalizedTutorEmail} (out of ${allEmails?.length || 0} total emails)`);
  if (emails.length > 0) {
    emails.forEach((email: any) => {
      console.log(`Email ${email.id}: status=${email.status}, sent_at=${email.sent_at || 'null'}, subject=${email.subject}, to=${email.to_email}`);
    });
  } else {
    // Show some sample emails to help debug
    console.log('Sample emails in database (first 5):');
    (allEmails || []).slice(0, 5).forEach((email: any) => {
      console.log(`  - to_email: "${email.to_email}", subject: "${email.subject}"`);
    });
  }
  
  return emails as PlayerEmail[];
}
