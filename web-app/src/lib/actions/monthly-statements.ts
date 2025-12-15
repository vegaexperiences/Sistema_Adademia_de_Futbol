'use server';

import { createClient } from '@/lib/supabase/server';
import { queueEmail } from './email-queue';
import { calculateMonthlyFee, isSeasonActive } from './payments';

export interface PlayerStatement {
  playerId: string;
  playerName: string;
  tutorEmail: string;
  tutorName: string;
  tutorCedula?: string | null;
  familyId: string | null;
  monthlyFee: number;
  amountDue: number;
  monthYear: string; // Format: 'YYYY-MM'
}

/**
 * Get players that are due for monthly statements
 * Checks if today is the payment date configured in settings
 */
export async function getPlayersDueForStatement(): Promise<PlayerStatement[]> {
  const supabase = await createClient();
  
  // Get payment date from settings (default: day 1)
  const { data: paymentDateSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'statement_payment_day')
    .single();
  
  const paymentDay = paymentDateSetting ? parseInt(paymentDateSetting.value) : 1;
  
  // Check if today is the payment date
  const today = new Date();
  const todayDay = today.getDate();
  
  if (todayDay !== paymentDay) {
    console.log(`[getPlayersDueForStatement] Today is day ${todayDay}, payment day is ${paymentDay}. Skipping.`);
    return [];
  }
  
  // Check if season is active (if season dates are configured)
  const seasonActive = await isSeasonActive(today);
  if (!seasonActive) {
    console.log(`[getPlayersDueForStatement] Season is not active today (${today.toISOString().split('T')[0]}). Skipping statement generation.`);
    return [];
  }
  
  // Get current month/year
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();
  const monthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  
  console.log(`[getPlayersDueForStatement] Processing statements for ${monthYear} (payment day: ${paymentDay}, season active: ${seasonActive})`);
  
  // Get all active players with their families
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      status,
      family_id,
      monthly_statement_sent_at,
      families (
        id,
        tutor_email,
        tutor_name
      )
    `)
    .in('status', ['Active', 'Scholarship']);
  
  if (playersError || !players) {
    console.error('[getPlayersDueForStatement] Error fetching players:', playersError);
    return [];
  }
  
  const statements: PlayerStatement[] = [];
  
  for (const player of players) {
    // Skip scholarship players (they don't pay)
    if (player.status === 'Scholarship') {
      continue;
    }
    
    // Check if statement was already sent this month
    if (player.monthly_statement_sent_at) {
      const sentDate = new Date(player.monthly_statement_sent_at);
      const sentMonth = sentDate.getMonth() + 1;
      const sentYear = sentDate.getFullYear();
      
      if (sentMonth === currentMonth && sentYear === currentYear) {
        console.log(`[getPlayersDueForStatement] Statement already sent for player ${player.id} this month`);
        continue;
      }
    }
    
    // Get family info
    const family = Array.isArray(player.families) ? player.families[0] : player.families;
    if (!family || !family.tutor_email) {
      console.warn(`[getPlayersDueForStatement] Player ${player.id} has no tutor email, skipping`);
      continue;
    }
    
    // Calculate monthly fee and amount due
    const monthlyFee = await calculateMonthlyFee(player.id);
    
    // Calculate amount due (monthly fee minus any payments made for this month)
    const amountDue = await calculateAmountDue(player.id, monthYear, monthlyFee);
    
    statements.push({
      playerId: player.id,
      playerName: `${player.first_name} ${player.last_name}`,
      tutorEmail: family.tutor_email,
      tutorName: family.tutor_name || 'Familia',
      tutorCedula: (family as any).tutor_cedula || null,
      familyId: player.family_id,
      monthlyFee,
      amountDue,
      monthYear,
    });
  }
  
  console.log(`[getPlayersDueForStatement] Found ${statements.length} players due for statements`);
  
  return statements;
}

/**
 * Calculate amount due for a player for a specific month
 * Returns monthly fee minus any payments already made for that month
 */
async function calculateAmountDue(playerId: string, monthYear: string, monthlyFee: number): Promise<number> {
  const supabase = await createClient();
  
  // Get payments for this month
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('player_id', playerId)
    .eq('month_year', monthYear)
    .in('type', ['monthly', 'custom']); // Use 'type' not 'payment_type' - Include custom payments that might cover monthly fee
  
  // Calculate total paid (only approved payments)
  const totalPaid = (payments || [])
    .filter(p => !p.status || p.status === 'Approved')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  
  // Amount due is monthly fee minus what was paid
  const amountDue = Math.max(0, monthlyFee - totalPaid);
  
  return amountDue;
}

/**
 * Send monthly statement email to a player's tutor
 */
export async function sendMonthlyStatement(statement: PlayerStatement): Promise<{ success: boolean; error?: string }> {
  // Get base URL for payment link from settings, fallback to env vars
  const supabase = await createClient();
  const { data: linkSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'payment_link_base_url')
    .single();
  
  const baseUrl = linkSetting?.value?.trim() || 
                 process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.NEXT_PUBLIC_SITE_URL ||
                 'https://sistema-adademia-de-futbol-tura.vercel.app';
  
  // Build payment link with tutor cedula for easy search
  const tutorCedula = statement.tutorCedula || '';
  const paymentLink = tutorCedula 
    ? `${baseUrl}/pay?cedula=${encodeURIComponent(tutorCedula)}`
    : `${baseUrl}/pay`;
  try {
    const supabase = await createClient();
    
    // Format month name in Spanish
    const [year, month] = statement.monthYear.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    // Format player list without bullets (just names separated by commas or newlines)
    const playerList = `<strong>${statement.playerName}</strong>`;
    
    // Queue the email using payment_reminder template (not immediate, as this is a bulk operation)
    const emailResult = await queueEmail(
      'payment_reminder',
      statement.tutorEmail,
      {
        tutorName: statement.tutorName,
        playerList: playerList,
        amount: statement.amountDue.toFixed(2),
        dueDate: getPaymentDueDate(), // Usually 5 days after payment date
        paymentLink: paymentLink,
        academy_name: 'Suarez Academy',
        current_year: new Date().getFullYear().toString(),
      },
      undefined, // scheduledFor - will be calculated by queueEmail
      {
        player_id: statement.playerId,
        family_id: statement.familyId || undefined,
        email_type: 'payment_reminder',
        month_year: statement.monthYear,
      }
    );
    
    if (emailResult.error) {
      console.error(`[sendMonthlyStatement] Error queueing email for player ${statement.playerId}:`, emailResult.error);
      return { success: false, error: emailResult.error };
    }
    
    // Update monthly_statement_sent_at when email is actually sent (via webhook or processEmailQueue)
    // For now, we'll update it immediately since the email is queued
    // The actual timestamp will be updated when the email is sent
    
    console.log(`[sendMonthlyStatement] Statement queued for player ${statement.playerId} (${statement.tutorEmail})`);
    
    return { success: true };
  } catch (error: any) {
    console.error(`[sendMonthlyStatement] Exception sending statement for player ${statement.playerId}:`, error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Send monthly statements to all players due
 */
export async function sendMonthlyStatements(): Promise<{
  success: boolean;
  processed: number;
  queued: number;
  failed: number;
  errors: string[];
}> {
  const statements = await getPlayersDueForStatement();
  
  if (statements.length === 0) {
    return {
      success: true,
      processed: 0,
      queued: 0,
      failed: 0,
      errors: [],
    };
  }
  
  let queued = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const statement of statements) {
    const result = await sendMonthlyStatement(statement);
    
    if (result.success) {
      queued++;
    } else {
      failed++;
      errors.push(`${statement.playerName}: ${result.error || 'Unknown error'}`);
    }
  }
  
  console.log(`[sendMonthlyStatements] Processed ${statements.length} statements: ${queued} queued, ${failed} failed`);
  
  return {
    success: failed === 0,
    processed: statements.length,
    queued,
    failed,
    errors,
  };
}

/**
 * Get payment due date (usually 5 days after payment date)
 */
function getPaymentDueDate(): string {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 5);
  
  return dueDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

