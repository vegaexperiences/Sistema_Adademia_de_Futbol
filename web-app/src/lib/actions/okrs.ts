'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademyId } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface OKRTargets {
  revenue: number | null;
  profit: number | null;
  margin: number | null; // percentage
  activePlayers: number | null;
  retention: number | null; // percentage
}

export interface OKRSettings {
  monthly: OKRTargets;
  quarterly: OKRTargets;
  annual: OKRTargets;
}

const DEFAULT_TARGETS: OKRTargets = {
  revenue: null, // Will be calculated as 20% growth from current
  profit: null, // Will be calculated as 15% growth from current
  margin: 30, // 30% margin target
  activePlayers: null, // Will be calculated as 10% growth from current
  retention: 95, // 95% retention target
};

/**
 * Get OKR settings for the current academy
 */
export async function getOKRSettings(): Promise<OKRSettings> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .eq('academy_id', academyId)
    .like('key', 'okr_%');

  const settingsMap = settings?.reduce((acc: Record<string, string>, s: any) => {
    acc[s.key] = s.value;
    return acc;
  }, {}) || {};

  const parseValue = (key: string, defaultValue: number | null): number | null => {
    const value = settingsMap[key];
    if (!value || value === '') return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  return {
    monthly: {
      revenue: parseValue('okr_revenue_target_monthly', DEFAULT_TARGETS.revenue),
      profit: parseValue('okr_profit_target_monthly', DEFAULT_TARGETS.profit),
      margin: parseValue('okr_margin_target_monthly', DEFAULT_TARGETS.margin),
      activePlayers: parseValue('okr_active_players_target_monthly', DEFAULT_TARGETS.activePlayers),
      retention: parseValue('okr_retention_target_monthly', DEFAULT_TARGETS.retention),
    },
    quarterly: {
      revenue: parseValue('okr_revenue_target_quarterly', DEFAULT_TARGETS.revenue),
      profit: parseValue('okr_profit_target_quarterly', DEFAULT_TARGETS.profit),
      margin: parseValue('okr_margin_target_quarterly', DEFAULT_TARGETS.margin),
      activePlayers: parseValue('okr_active_players_target_quarterly', DEFAULT_TARGETS.activePlayers),
      retention: parseValue('okr_retention_target_quarterly', DEFAULT_TARGETS.retention),
    },
    annual: {
      revenue: parseValue('okr_revenue_target_annual', DEFAULT_TARGETS.revenue),
      profit: parseValue('okr_profit_target_annual', DEFAULT_TARGETS.profit),
      margin: parseValue('okr_margin_target_annual', DEFAULT_TARGETS.margin),
      activePlayers: parseValue('okr_active_players_target_annual', DEFAULT_TARGETS.activePlayers),
      retention: parseValue('okr_retention_target_annual', DEFAULT_TARGETS.retention),
    },
  };
}

/**
 * Update OKR settings for the current academy
 */
export async function updateOKRSettings(
  period: 'monthly' | 'quarterly' | 'annual',
  targets: Partial<OKRTargets>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const academyId = await getCurrentAcademyId();

    const periodPrefix = period === 'monthly' ? 'monthly' : period === 'quarterly' ? 'quarterly' : 'annual';

    const updates: Array<{ key: string; value: string }> = [];

    if (targets.revenue !== undefined) {
      updates.push({
        key: `okr_revenue_target_${periodPrefix}`,
        value: targets.revenue === null ? '' : String(targets.revenue),
      });
    }
    if (targets.profit !== undefined) {
      updates.push({
        key: `okr_profit_target_${periodPrefix}`,
        value: targets.profit === null ? '' : String(targets.profit),
      });
    }
    if (targets.margin !== undefined) {
      updates.push({
        key: `okr_margin_target_${periodPrefix}`,
        value: targets.margin === null ? '' : String(targets.margin),
      });
    }
    if (targets.activePlayers !== undefined) {
      updates.push({
        key: `okr_active_players_target_${periodPrefix}`,
        value: targets.activePlayers === null ? '' : String(targets.activePlayers),
      });
    }
    if (targets.retention !== undefined) {
      updates.push({
        key: `okr_retention_target_${periodPrefix}`,
        value: targets.retention === null ? '' : String(targets.retention),
      });
    }

    // Upsert each setting
    for (const update of updates) {
      // First, try to update existing setting
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', update.key)
        .eq('academy_id', academyId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({
            value: update.value,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error(`Error updating setting ${update.key}:`, error);
          return { success: false, error: error.message };
        }
      } else {
        // Insert new setting
        const { error } = await supabase
          .from('settings')
          .insert({
            key: update.key,
            value: update.value,
            academy_id: academyId,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error(`Error inserting setting ${update.key}:`, error);
          return { success: false, error: error.message };
        }
      }
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/reports');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating OKR settings:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get OKR target for a specific metric and period
 */
export async function getOKRTarget(
  period: 'monthly' | 'quarterly' | 'annual',
  metric: 'revenue' | 'profit' | 'margin' | 'activePlayers' | 'retention',
  currentValue: number
): Promise<number> {
  const settings = await getOKRSettings();
  const periodSettings = settings[period];
  const target = periodSettings[metric];

  // If target is explicitly set, use it
  if (target !== null && target !== undefined) {
    return target;
  }

  // Otherwise, calculate based on defaults
  switch (metric) {
    case 'revenue':
      return currentValue * 1.2; // 20% growth
    case 'profit':
      return currentValue * 1.15; // 15% growth
    case 'margin':
      return 30; // 30% margin
    case 'activePlayers':
      return currentValue * 1.1; // 10% growth
    case 'retention':
      return 95; // 95% retention
    default:
      return currentValue;
  }
}

