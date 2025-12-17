'use server';

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { calculateLateFee as calcLateFee, calculateDaysOverdue as calcDaysOverdue, type LateFeeConfig } from '@/lib/utils/late-fees';

// Re-export type for convenience
export type { LateFeeConfig } from '@/lib/utils/late-fees';

export interface LateFee {
  id: string;
  payment_id: string | null;
  player_id: string;
  month_year: string | null;
  original_amount: number;
  late_fee_amount: number;
  late_fee_type: 'percentage' | 'fixed';
  late_fee_rate: number;
  days_overdue: number;
  applied_at: string;
  academy_id: string;
}

/**
 * Get late fee configuration from settings
 */
export async function getLateFeeConfig(): Promise<LateFeeConfig> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    // Return default config if no academy context
    return {
      enabled: false,
      type: 'percentage',
      value: 5,
      graceDays: 5,
      paymentDeadlineDay: 1,
    };
  }

  // Get all late fee related settings (filter by academy_id if available)
  let settingsQuery = supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'late_fee_enabled',
      'late_fee_type',
      'late_fee_value',
      'late_fee_grace_days',
      'statement_payment_day', // Use existing payment day setting
    ]);

  // Filter by academy_id if available, otherwise get global settings (academy_id IS NULL)
  if (academyId) {
    settingsQuery = settingsQuery.or(`academy_id.eq.${academyId},academy_id.is.null`);
  } else {
    settingsQuery = settingsQuery.is('academy_id', null);
  }

  const { data: settings } = await settingsQuery;

  const settingsMap = settings?.reduce((acc: any, s: any) => {
    acc[s.key] = s.value;
    return acc;
  }, {}) || {};

  // Get payment deadline day (use statement_payment_day, default to 1)
  const paymentDeadlineDay = settingsMap['statement_payment_day']
    ? parseInt(settingsMap['statement_payment_day'])
    : 1;

  return {
    enabled: settingsMap['late_fee_enabled'] === 'true' || settingsMap['late_fee_enabled'] === true,
    type: (settingsMap['late_fee_type'] || 'percentage') as 'percentage' | 'fixed',
    value: parseFloat(settingsMap['late_fee_value'] || '5'),
    graceDays: parseInt(settingsMap['late_fee_grace_days'] || '5'),
    paymentDeadlineDay,
  };
}

/**
 * Update late fee configuration
 */
export async function updateLateFeeConfig(config: Partial<LateFeeConfig>): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return { success: false, error: 'No academy context available' };
  }

  try {
    const updates: Array<{ key: string; value: string }> = [];

    if (config.enabled !== undefined) {
      updates.push({ key: 'late_fee_enabled', value: config.enabled.toString() });
    }
    if (config.type !== undefined) {
      updates.push({ key: 'late_fee_type', value: config.type });
    }
    if (config.value !== undefined) {
      updates.push({ key: 'late_fee_value', value: config.value.toString() });
    }
    if (config.graceDays !== undefined) {
      updates.push({ key: 'late_fee_grace_days', value: config.graceDays.toString() });
    }

    // Update each setting
    for (const update of updates) {
      // First try to update existing setting for this academy
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', update.key)
        .eq('academy_id', academyId)
        .maybeSingle();

      if (existing) {
        // Update existing academy-specific setting
        const { error } = await supabase
          .from('settings')
          .update({
            value: update.value,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        
        if (error) {
          console.error(`[updateLateFeeConfig] Error updating ${update.key}:`, error);
          return { success: false, error: error.message };
        }
      } else {
        // Check if global setting exists (academy_id IS NULL)
        const { data: globalSetting } = await supabase
          .from('settings')
          .select('id')
          .eq('key', update.key)
          .is('academy_id', null)
          .maybeSingle();

        if (globalSetting) {
          // Update global setting to be academy-specific
          const { error } = await supabase
            .from('settings')
            .update({
              academy_id: academyId,
              value: update.value,
              updated_at: new Date().toISOString(),
            })
            .eq('id', globalSetting.id);
          
          if (error) {
            console.error(`[updateLateFeeConfig] Error updating global ${update.key}:`, error);
            return { success: false, error: error.message };
          }
        } else {
          // Insert new setting for this academy
          const { error } = await supabase
            .from('settings')
            .insert({
              key: update.key,
              value: update.value,
              academy_id: academyId,
              updated_at: new Date().toISOString(),
            });
          
          if (error) {
            // If unique constraint error on key, try to update by key only
            if (error.code === '23505' || error.message?.includes('unique')) {
              const { error: updateError } = await supabase
                .from('settings')
                .update({
                  value: update.value,
                  academy_id: academyId,
                  updated_at: new Date().toISOString(),
                })
                .eq('key', update.key);
              
              if (updateError) {
                console.error(`[updateLateFeeConfig] Error updating ${update.key} after conflict:`, updateError);
                return { success: false, error: updateError.message };
              }
            } else {
              console.error(`[updateLateFeeConfig] Error inserting ${update.key}:`, error);
              return { success: false, error: error.message };
            }
          }
        }
      }
    }

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('[updateLateFeeConfig] Unexpected error:', error);
    return { success: false, error: error.message || 'Error al actualizar configuración de recargos' };
  }
}

// Utility functions moved to src/lib/utils/late-fees.ts to avoid 'use server' requirement

/**
 * Get all late fees for a player
 */
export async function getPlayerLateFees(playerId: string): Promise<LateFee[]> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('late_fees')
    .select('*')
    .eq('player_id', playerId)
    .eq('academy_id', academyId)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('[getPlayerLateFees] Error fetching late fees:', error);
    return [];
  }

  return (data || []).map((fee: any) => ({
    id: fee.id,
    payment_id: fee.payment_id,
    player_id: fee.player_id,
    month_year: fee.month_year,
    original_amount: parseFloat(fee.original_amount.toString()),
    late_fee_amount: parseFloat(fee.late_fee_amount.toString()),
    late_fee_type: fee.late_fee_type,
    late_fee_rate: parseFloat(fee.late_fee_rate.toString()),
    days_overdue: fee.days_overdue,
    applied_at: fee.applied_at,
    academy_id: fee.academy_id,
  }));
}

/**
 * Check if a late fee has already been applied for a specific charge
 */
export async function hasLateFeeBeenApplied(
  playerId: string,
  monthYear: string,
  paymentId?: string
): Promise<boolean> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return false;
  }

  let query = supabase
    .from('late_fees')
    .select('id')
    .eq('player_id', playerId)
    .eq('month_year', monthYear)
    .eq('academy_id', academyId);

  if (paymentId) {
    query = query.eq('payment_id', paymentId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error('[hasLateFeeBeenApplied] Error checking late fee:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Apply late fees to overdue charges
 */
export async function applyLateFeesToOverdueCharges(
  monthYear?: string,
  force: boolean = false
): Promise<{
  success: boolean;
  applied: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return { success: false, applied: 0, errors: ['No academy context available'] };
  }

  const config = await getLateFeeConfig();

  if (!config.enabled) {
    return { success: true, applied: 0, errors: ['Late fees are disabled'] };
  }

  const errors: string[] = [];
  let applied = 0;

  try {
    // Get all overdue charges (type = 'charge' with status 'Pending' or 'Overdue')
    let chargesQuery = supabase
      .from('payments')
      .select('id, player_id, amount, month_year, payment_date, status')
      .eq('type', 'charge')
      .eq('academy_id', academyId)
      .in('status', ['Pending', 'Overdue']);

    if (monthYear) {
      chargesQuery = chargesQuery.eq('month_year', monthYear);
    }

    const { data: charges, error: chargesError } = await chargesQuery;

    if (chargesError) {
      return { success: false, applied: 0, errors: [chargesError.message] };
    }

    if (!charges || charges.length === 0) {
      return { success: true, applied: 0, errors: [] };
    }

    const today = new Date();

    // Process each charge
    for (const charge of charges) {
      if (!charge.player_id || !charge.month_year) {
        continue;
      }

      // Check if late fee already applied
      const alreadyApplied = await hasLateFeeBeenApplied(
        charge.player_id,
        charge.month_year,
        charge.id
      );

      if (alreadyApplied && !force) {
        continue;
      }

      // Calculate days overdue
      const daysOverdue = calcDaysOverdue(
        charge.month_year,
        config.paymentDeadlineDay,
        today
      );

      // Check if grace period has passed
      if (daysOverdue <= config.graceDays) {
        continue;
      }

      // Calculate late fee
      const originalAmount = parseFloat(charge.amount.toString());
      const lateFeeAmount = calcLateFee(originalAmount, daysOverdue, config);

      if (lateFeeAmount <= 0) {
        continue;
      }

      // Create late fee record
      const { error: insertError } = await supabase
        .from('late_fees')
        .insert({
          payment_id: charge.id,
          player_id: charge.player_id,
          month_year: charge.month_year,
          original_amount: originalAmount,
          late_fee_amount: lateFeeAmount,
          late_fee_type: config.type,
          late_fee_rate: config.value,
          days_overdue: daysOverdue,
          academy_id: academyId,
        });

      if (insertError) {
        errors.push(`Error applying late fee to charge ${charge.id}: ${insertError.message}`);
        console.error('[applyLateFeesToOverdueCharges] Error inserting late fee:', insertError);
      } else {
        applied++;
      }
    }

    // Revalidate paths
    revalidatePath('/dashboard/finances');
    revalidatePath('/dashboard/players');

    return { success: true, applied, errors };
  } catch (error: any) {
    console.error('[applyLateFeesToOverdueCharges] Unexpected error:', error);
    return { success: false, applied, errors: [error.message || 'Error inesperado'] };
  }
}

/**
 * Get total late fees for a player (sum of all late fees)
 */
export async function getPlayerTotalLateFees(playerId: string): Promise<number> {
  const lateFees = await getPlayerLateFees(playerId);
  return lateFees.reduce((sum, fee) => sum + fee.late_fee_amount, 0);
}

