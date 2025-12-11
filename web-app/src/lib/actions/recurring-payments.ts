'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RecurringPaymentSubscription {
  id: string;
  familyId?: string;
  playerId?: string;
  tokenizedCardId: string;
  amount: number;
  frequency: 'monthly' | 'custom';
  customFrequencyDays?: number;
  startDate: string;
  nextPaymentDate: string;
  endDate?: string | null;
  status: 'active' | 'paused' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringPaymentSubscriptionParams {
  familyId?: string;
  playerId?: string;
  tokenizedCardId: string;
  amount: number;
  frequency: 'monthly' | 'custom';
  customFrequencyDays?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Create a new recurring payment subscription
 */
export async function createRecurringPaymentSubscription(
  params: CreateRecurringPaymentSubscriptionParams
): Promise<{ success: boolean; subscription?: RecurringPaymentSubscription; error?: string }> {
  try {
    const supabase = await createClient();

    // Validate that at least one of familyId or playerId is provided
    if (!params.familyId && !params.playerId) {
      return {
        success: false,
        error: 'Se requiere familyId o playerId',
      };
    }

    // Calculate next payment date
    const startDate = params.startDate ? new Date(params.startDate) : new Date();
    const nextPaymentDate = new Date(startDate);

    if (params.frequency === 'monthly') {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else if (params.frequency === 'custom' && params.customFrequencyDays) {
      nextPaymentDate.setDate(nextPaymentDate.getDate() + params.customFrequencyDays);
    } else {
      return {
        success: false,
        error: 'Para frecuencia personalizada se requiere customFrequencyDays',
      };
    }

    // Insert subscription
    const { data, error } = await supabase
      .from('recurring_payment_subscriptions')
      .insert({
        family_id: params.familyId || null,
        player_id: params.playerId || null,
        tokenized_card_id: params.tokenizedCardId,
        amount: params.amount,
        frequency: params.frequency,
        custom_frequency_days: params.customFrequencyDays || null,
        start_date: startDate.toISOString().split('T')[0],
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        end_date: params.endDate || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[RecurringPayments] Create subscription error:', error);
      return {
        success: false,
        error: error.message || 'Error al crear suscripción recurrente',
      };
    }

    // Revalidate relevant paths
    if (params.playerId) {
      revalidatePath(`/dashboard/players/${params.playerId}`);
    }
    if (params.familyId) {
      revalidatePath(`/dashboard/families/${params.familyId}`);
    }
    revalidatePath('/dashboard/finance');

    return {
      success: true,
      subscription: {
        id: data.id,
        familyId: data.family_id,
        playerId: data.player_id,
        tokenizedCardId: data.tokenized_card_id,
        amount: parseFloat(data.amount),
        frequency: data.frequency,
        customFrequencyDays: data.custom_frequency_days,
        startDate: data.start_date,
        nextPaymentDate: data.next_payment_date,
        endDate: data.end_date,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error: any) {
    console.error('[RecurringPayments] Create subscription error:', error);
    return {
      success: false,
      error: error.message || 'Error al crear suscripción recurrente',
    };
  }
}

/**
 * Get all recurring payment subscriptions for a player or family
 */
export async function getRecurringPayments(params: {
  playerId?: string;
  familyId?: string;
  status?: 'active' | 'paused' | 'cancelled';
}): Promise<{ success: boolean; subscriptions?: RecurringPaymentSubscription[]; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase.from('recurring_payment_subscriptions').select('*');

    if (params.playerId) {
      query = query.eq('player_id', params.playerId);
    }
    if (params.familyId) {
      query = query.eq('family_id', params.familyId);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[RecurringPayments] Get subscriptions error:', error);
      return {
        success: false,
        error: error.message || 'Error al obtener suscripciones',
      };
    }

    const subscriptions: RecurringPaymentSubscription[] =
      data?.map((sub) => ({
        id: sub.id,
        familyId: sub.family_id,
        playerId: sub.player_id,
        tokenizedCardId: sub.tokenized_card_id,
        amount: parseFloat(sub.amount),
        frequency: sub.frequency,
        customFrequencyDays: sub.custom_frequency_days,
        startDate: sub.start_date,
        nextPaymentDate: sub.next_payment_date,
        endDate: sub.end_date,
        status: sub.status,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      })) || [];

    return {
      success: true,
      subscriptions,
    };
  } catch (error: any) {
    console.error('[RecurringPayments] Get subscriptions error:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener suscripciones',
    };
  }
}

/**
 * Update a recurring payment subscription
 */
export async function updateRecurringPayment(
  subscriptionId: string,
  updates: {
    status?: 'active' | 'paused' | 'cancelled';
    nextPaymentDate?: string;
    endDate?: string;
    amount?: number;
  }
): Promise<{ success: boolean; subscription?: RecurringPaymentSubscription; error?: string }> {
  try {
    const supabase = await createClient();

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.nextPaymentDate) updateData.next_payment_date = updates.nextPaymentDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.amount !== undefined) updateData.amount = updates.amount;

    const { data, error } = await supabase
      .from('recurring_payment_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('[RecurringPayments] Update subscription error:', error);
      return {
        success: false,
        error: error.message || 'Error al actualizar suscripción',
      };
    }

    // Revalidate relevant paths
    if (data.player_id) {
      revalidatePath(`/dashboard/players/${data.player_id}`);
    }
    if (data.family_id) {
      revalidatePath(`/dashboard/families/${data.family_id}`);
    }
    revalidatePath('/dashboard/finance');

    return {
      success: true,
      subscription: {
        id: data.id,
        familyId: data.family_id,
        playerId: data.player_id,
        tokenizedCardId: data.tokenized_card_id,
        amount: parseFloat(data.amount),
        frequency: data.frequency,
        customFrequencyDays: data.custom_frequency_days,
        startDate: data.start_date,
        nextPaymentDate: data.next_payment_date,
        endDate: data.end_date,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error: any) {
    console.error('[RecurringPayments] Update subscription error:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar suscripción',
    };
  }
}

/**
 * Cancel a recurring payment subscription
 */
export async function cancelRecurringPayment(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // First get the subscription to revalidate paths
    const { data: subscription } = await supabase
      .from('recurring_payment_subscriptions')
      .select('player_id, family_id')
      .eq('id', subscriptionId)
      .single();

    const { error } = await supabase
      .from('recurring_payment_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);

    if (error) {
      console.error('[RecurringPayments] Cancel subscription error:', error);
      return {
        success: false,
        error: error.message || 'Error al cancelar suscripción',
      };
    }

    // Revalidate relevant paths
    if (subscription?.player_id) {
      revalidatePath(`/dashboard/players/${subscription.player_id}`);
    }
    if (subscription?.family_id) {
      revalidatePath(`/dashboard/families/${subscription.family_id}`);
    }
    revalidatePath('/dashboard/finance');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[RecurringPayments] Cancel subscription error:', error);
    return {
      success: false,
      error: error.message || 'Error al cancelar suscripción',
    };
  }
}

/**
 * Get all subscriptions that need to be processed today
 */
export async function getSubscriptionsDueToday(): Promise<{
  success: boolean;
  subscriptions?: RecurringPaymentSubscription[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('recurring_payment_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_payment_date', today)
      .order('next_payment_date', { ascending: true });

    if (error) {
      console.error('[RecurringPayments] Get due subscriptions error:', error);
      return {
        success: false,
        error: error.message || 'Error al obtener suscripciones vencidas',
      };
    }

    const subscriptions: RecurringPaymentSubscription[] =
      data?.map((sub) => ({
        id: sub.id,
        familyId: sub.family_id,
        playerId: sub.player_id,
        tokenizedCardId: sub.tokenized_card_id,
        amount: parseFloat(sub.amount),
        frequency: sub.frequency,
        customFrequencyDays: sub.custom_frequency_days,
        startDate: sub.start_date,
        nextPaymentDate: sub.next_payment_date,
        endDate: sub.end_date,
        status: sub.status,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      })) || [];

    return {
      success: true,
      subscriptions,
    };
  } catch (error: any) {
    console.error('[RecurringPayments] Get due subscriptions error:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener suscripciones vencidas',
    };
  }
}

