'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Payment {
  id?: string;
  player_id: string;
  amount: number;
  payment_type: 'enrollment' | 'monthly' | 'custom';
  payment_method?: 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'other';
  payment_date: string;
  month_year?: string;
  notes?: string;
  status?: 'Approved' | 'Pending' | 'Rejected' | 'Cancelled';
}

// Get all payments for a player
export async function getPlayerPayments(playerId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('player_id', playerId)
    .order('payment_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
  
  return data;
}

// Get payments for multiple players (family/tutor)
export async function getPlayersPayments(playerIds: string[]) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select('*, players(first_name, last_name)')
    .in('player_id', playerIds)
    .order('payment_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
  
  return data;
}

// Create a new payment
export async function createPayment(payment: Payment) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      status: payment.status || 'Approved', // Default to 'Approved' if not specified
      created_by: user?.id
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating payment:', error);
    throw new Error('Error al crear el pago');
  }
  
  // Update player's last payment date
  await supabase
    .from('players')
    .update({ 
      last_payment_date: payment.payment_date,
      payment_status: 'current'
    })
    .eq('id', payment.player_id);
  
  // Revalidate all relevant paths
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/families');
  revalidatePath('/dashboard/tutors');
  revalidatePath('/dashboard/finances');
  revalidatePath('/dashboard/finances/transactions');
  
  return data;
}

// Update player's custom monthly fee
export async function updateCustomMonthlyFee(playerId: string, customFee: number | null) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('players')
    .update({ custom_monthly_fee: customFee })
    .eq('id', playerId);
  
  if (error) {
    console.error('Error updating custom fee:', error);
    throw new Error('Error al actualizar la mensualidad personalizada');
  }
  
  revalidatePath('/dashboard/players');
  return { success: true };
}

// Update player status (Normal/Scholarship)
export async function updatePlayerStatus(playerId: string, status: 'Active' | 'Scholarship') {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('players')
    .update({ status })
    .eq('id', playerId);
  
  if (error) {
    console.error('Error updating player status:', error);
    throw new Error('Error al actualizar el estado del jugador');
  }
  
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/families');
  revalidatePath('/dashboard/tutors');
  
  return { success: true };
}

// Calculate monthly fee for a player
export async function calculateMonthlyFee(playerId: string) {
  const supabase = await createClient();
  
  // Get player data
  const { data: player } = await supabase
    .from('players')
    .select('*, families(id)')
    .eq('id', playerId)
    .single();
  
  if (!player) return 0;
  
  // If has custom fee, use it
  if (player.custom_monthly_fee !== null) {
    return player.custom_monthly_fee;
  }
  
  // If scholarship, return 0
  if (player.status === 'Scholarship') {
    return 0;
  }
  
  // Get settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*');
  
  const settingsMap = settings?.reduce((acc: any, s: any) => {
    acc[s.key] = parseFloat(s.value);
    return acc;
  }, {}) || {};
  
  const normalFee = settingsMap['price_monthly'] || 130;
  const familyFee = settingsMap['price_monthly_family'] || 110.50;
  
  // Check if part of family with 2+ players
  if (player.families?.id) {
    const { data: familyPlayers } = await supabase
      .from('players')
      .select('id, first_name')
      .eq('family_id', player.families.id)
      .order('created_at');
    
    if (familyPlayers && familyPlayers.length >= 2) {
      const playerIndex = familyPlayers.findIndex(p => p.id === playerId);
      if (playerIndex >= 1) {
        return familyFee;
      }
    }
  }
  
  return normalFee;
}

// Get payment summary for a player
export async function getPaymentSummary(playerId: string) {
  const supabase = await createClient();
  
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_type, payment_date')
    .eq('player_id', playerId);
  
  const total = payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;
  const lastPayment = payments?.[0];
  
  return {
    total,
    count: payments?.length || 0,
    lastPayment: lastPayment?.payment_date || null
  };
}
