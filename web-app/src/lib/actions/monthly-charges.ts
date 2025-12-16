'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademyId } from '@/lib/supabase/server';
import { calculateMonthlyFee, isSeasonActive } from './payments';
import { revalidatePath } from 'next/cache';

export interface MonthlyCharge {
  id: string;
  player_id: string;
  amount: number;
  month_year: string; // Format: 'YYYY-MM'
  status: 'Pending' | 'Paid' | 'Overdue';
  created_at: string;
  payment_date?: string; // Date when it was paid
}

export interface PlayerAccountBalance {
  playerId: string;
  totalCharges: number;
  totalPayments: number;
  balance: number; // Positive = owes money, Negative = has credit
  isUpToDate: boolean;
  overdueMonths: string[]; // Array of month_year strings
  pendingCharges: MonthlyCharge[];
}

/**
 * Generate monthly charges for all active players (excluding scholarship players)
 * @param monthYear Optional month/year in format 'YYYY-MM'. If not provided, uses current month
 * @param force If true, will regenerate even if charges already exist for that month
 */
export async function generateMonthlyCharges(monthYear?: string, force: boolean = false): Promise<{
  success: boolean;
  generated: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return {
      success: false,
      generated: 0,
      skipped: 0,
      errors: ['No academy ID found'],
    };
  }

  // Determine month/year
  const today = new Date();
  const targetMonth = monthYear 
    ? new Date(monthYear + '-01')
    : new Date(today.getFullYear(), today.getMonth(), 1);
  
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth() + 1;
  const monthYearStr = `${year}-${String(month).padStart(2, '0')}`;
  
  // Check if season is active for this month (first day of the month)
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const seasonActive = await isSeasonActive(firstDayOfMonth);
  
  if (!seasonActive) {
    return {
      success: false,
      generated: 0,
      skipped: 0,
      errors: [`La temporada no está activa para el mes ${monthYearStr}. Verifica las fechas de temporada en Configuraciones.`],
    };
  }

  // Get all active players (not scholarship)
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, first_name, last_name, status')
    .eq('academy_id', academyId)
    .eq('status', 'Active');

  if (playersError || !players) {
    return {
      success: false,
      generated: 0,
      skipped: 0,
      errors: [playersError?.message || 'Error fetching players'],
    };
  }

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Check if charges already exist for this month
  if (!force) {
    const { data: existingCharges } = await supabase
      .from('payments')
      .select('player_id')
      .eq('academy_id', academyId)
      .eq('type', 'charge')
      .eq('month_year', monthYearStr)
      .limit(1);

    if (existingCharges && existingCharges.length > 0) {
      // Charges already exist, skip generation
      return {
        success: true,
        generated: 0,
        skipped: players.length,
        errors: [`Charges already exist for ${monthYearStr}`],
      };
    }
  }

  // Generate charges for each player
  for (const player of players) {
    try {
      // Calculate monthly fee
      const monthlyFee = await calculateMonthlyFee(player.id);
      
      if (monthlyFee <= 0) {
        skipped++;
        continue;
      }

      // Check if charge already exists for this player and month
      if (!force) {
        const { data: existing } = await supabase
          .from('payments')
          .select('id')
          .eq('player_id', player.id)
          .eq('type', 'charge')
          .eq('month_year', monthYearStr)
          .eq('academy_id', academyId)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }
      }

      // Create charge
      const { error: chargeError } = await supabase
        .from('payments')
        .insert({
          player_id: player.id,
          amount: monthlyFee,
          type: 'charge',
          method: null, // Charges don't have payment methods
          payment_date: new Date(year, month - 1, 1).toISOString().split('T')[0], // First day of the month
          month_year: monthYearStr,
          status: 'Pending',
          notes: `Cargo mensual ${monthYearStr}`,
          academy_id: academyId,
        });

      if (chargeError) {
        errors.push(`Error creating charge for ${player.first_name} ${player.last_name}: ${chargeError.message}`);
      } else {
        generated++;
      }
    } catch (error: any) {
      errors.push(`Error processing player ${player.first_name} ${player.last_name}: ${error.message}`);
    }
  }

  // Revalidate relevant paths
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/finances');

  return {
    success: errors.length === 0,
    generated,
    skipped,
    errors,
  };
}

/**
 * Get all monthly charges for a specific player
 */
export async function getPlayerCharges(playerId: string): Promise<MonthlyCharge[]> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return [];
  }

  const { data: charges, error } = await supabase
    .from('payments')
    .select('id, player_id, amount, month_year, status, created_at, payment_date')
    .eq('player_id', playerId)
    .eq('type', 'charge')
    .eq('academy_id', academyId)
    .order('month_year', { ascending: false });

  if (error || !charges) {
    console.error('[getPlayerCharges] Error:', error);
    return [];
  }

  return charges.map(charge => ({
    id: charge.id,
    player_id: charge.player_id,
    amount: parseFloat(charge.amount.toString()),
    month_year: charge.month_year || '',
    status: (charge.status as 'Pending' | 'Paid' | 'Overdue') || 'Pending',
    created_at: charge.created_at,
    payment_date: charge.payment_date || undefined,
  }));
}

/**
 * Get player account balance - calculates charges vs payments (including late fees)
 */
export async function getPlayerAccountBalance(playerId: string): Promise<PlayerAccountBalance> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return {
      playerId,
      totalCharges: 0,
      totalPayments: 0,
      balance: 0,
      isUpToDate: true,
      overdueMonths: [],
      pendingCharges: [],
    };
  }

  // Get all charges
  const { data: charges } = await supabase
    .from('payments')
    .select('id, amount, month_year, status, created_at, payment_date')
    .eq('player_id', playerId)
    .eq('type', 'charge')
    .eq('academy_id', academyId);

  // Get all payments (excluding charges)
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, month_year, status, payment_date')
    .eq('player_id', playerId)
    .neq('type', 'charge')
    .in('status', ['Approved', 'Pending'])
    .eq('academy_id', academyId);

  // Get late fees for this player
  const { getPlayerTotalLateFees } = await import('./late-fees');
  const totalLateFees = await getPlayerTotalLateFees(playerId);

  const totalCharges = (charges || []).reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) + totalLateFees;
  const totalPayments = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const balance = totalCharges - totalPayments;

  // Determine which charges are paid
  const chargesByMonth = new Map<string, { id: string; amount: any; month_year: string | null; status: any; created_at: string; payment_date: string | null }>();
  (charges || []).forEach(charge => {
    if (charge.month_year) {
      chargesByMonth.set(charge.month_year, charge);
    }
  });

  // Check payments by month to see which charges are covered
  const paymentsByMonth = new Map<string, number>();
  (payments || []).forEach(payment => {
    if (payment.month_year) {
      const current = paymentsByMonth.get(payment.month_year) || 0;
      paymentsByMonth.set(payment.month_year, current + parseFloat(payment.amount.toString()));
    }
  });

  // Determine overdue months and pending charges
  const overdueMonths: string[] = [];
  const pendingCharges: MonthlyCharge[] = [];
  const today = new Date();
  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  chargesByMonth.forEach((charge, monthYear) => {
    const chargeAmount = parseFloat(charge.amount.toString());
    const paidAmount = paymentsByMonth.get(monthYear) || 0;
    
    if (paidAmount < chargeAmount) {
      // Charge not fully paid
      const chargeDate = new Date(monthYear + '-01');
      const isOverdue = chargeDate < new Date(today.getFullYear(), today.getMonth(), 1);
      
      pendingCharges.push({
        id: charge.id,
        player_id: playerId,
        amount: chargeAmount - paidAmount,
        month_year: monthYear,
        status: isOverdue ? 'Overdue' : 'Pending',
        created_at: charge.created_at,
        payment_date: charge.payment_date || undefined,
      });

      if (isOverdue) {
        overdueMonths.push(monthYear);
      }
    }
  });

  const isUpToDate = overdueMonths.length === 0 && pendingCharges.length === 0;

  return {
    playerId,
    totalCharges,
    totalPayments,
    balance,
    isUpToDate,
    overdueMonths,
    pendingCharges,
  };
}

/**
 * Mark a charge as paid (when a payment covers it)
 * This is typically called automatically when a payment is created
 */
export async function markChargeAsPaid(chargeId: string, paymentId: string): Promise<boolean> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return false;
  }

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Paid by payment ${paymentId}`,
    })
    .eq('id', chargeId)
    .eq('type', 'charge')
    .eq('academy_id', academyId);

  if (error) {
    console.error('[markChargeAsPaid] Error:', error);
    return false;
  }

  revalidatePath('/dashboard/players');
  return true;
}

