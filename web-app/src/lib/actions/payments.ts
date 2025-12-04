'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Payment {
  id?: string;
  player_id: string | null; // Can be null for orphaned payments (pending players)
  amount: number;
  type: 'enrollment' | 'monthly' | 'custom' | 'Matrícula'; // Use 'type' to match database schema
  method?: 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'ach' | 'other'; // Use 'method' to match database schema
  payment_date: string;
  month_year?: string;
  notes?: string;
  status?: 'Approved' | 'Pending' | 'Rejected' | 'Cancelled' | 'Paid' | 'Overdue';
  // Legacy fields for backward compatibility (will be mapped)
  payment_type?: 'enrollment' | 'monthly' | 'custom';
  payment_method?: 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'ach' | 'other';
}

// Get all payments for a player
export async function getPlayerPayments(playerId: string) {
  const supabase = await createClient();
  
  console.log('[getPlayerPayments] Fetching payments for player:', playerId);
  
  // First, check if player exists
  const { data: playerCheck, error: playerCheckError } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .single();
  
  if (playerCheckError || !playerCheck) {
    console.warn('[getPlayerPayments] Player not found:', {
      playerId,
      error: playerCheckError?.message,
    });
  }
  
  // Only get approved/successful payments - rejections are not real payments
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('player_id', playerId)
    .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
    .order('payment_date', { ascending: false });
  
  if (error) {
    console.error('[getPlayerPayments] Error fetching payments:', {
      error,
      playerId,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
    });
    return [];
  }
  
  // Also check for unlinked payments that might belong to this player
  const { data: unlinkedPayments, error: unlinkedError } = await supabase
    .from('payments')
    .select('*')
    .is('player_id', null)
    .order('payment_date', { ascending: false })
    .limit(10);
  
  if (!unlinkedError && unlinkedPayments && unlinkedPayments.length > 0) {
    // Check if any unlinked payment has this playerId in notes
    const potentiallyLinkedPayments = unlinkedPayments.filter(p => {
      if (!p.notes) return false;
      const notes = p.notes.toLowerCase();
      const playerIdLower = playerId.toLowerCase();
      return notes.includes(playerIdLower) || 
             notes.includes(`pending player ids: ${playerIdLower}`) ||
             notes.includes(`pending player ids:${playerIdLower}`);
    });
    
    console.log('[getPlayerPayments] Found unlinked payments (for reference):', {
      count: unlinkedPayments.length,
      unlinkedPayments: unlinkedPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        type: p.type,
        method: p.method,
        status: p.status,
        notes: p.notes,
        payment_date: p.payment_date,
      })),
      potentiallyLinkedCount: potentiallyLinkedPayments.length,
      potentiallyLinked: potentiallyLinkedPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        notes: p.notes,
      })),
    });
    
    // Note: We don't auto-link here because revalidatePath can't be called during render
    // The auto-linking should be done via a separate server action
    if (potentiallyLinkedPayments.length > 0) {
      console.log('[getPlayerPayments] 🔗 Found potentially linkable payments:', {
        count: potentiallyLinkedPayments.length,
        paymentIds: potentiallyLinkedPayments.map(p => p.id),
        note: 'Use autoLinkUnlinkedPaymentsForPlayer() to link these',
      });
    }
  }
  
  console.log('[getPlayerPayments] Found payments:', {
    playerId,
    count: data?.length || 0,
    payments: data?.map(p => ({
      id: p.id,
      amount: p.amount,
      type: p.type,
      method: p.method,
      status: p.status,
      payment_date: p.payment_date,
      player_id: p.player_id,
    })),
    queryResult: data ? 'success' : 'no data',
  });
  
  return data || [];
}

// Get payments for multiple players (family/tutor)
export async function getPlayersPayments(playerIds: string[]) {
  const supabase = await createClient();
  
  // Only get approved/successful payments - rejections are not real payments
  const { data, error } = await supabase
    .from('payments')
    .select('*, players(first_name, last_name)')
    .in('player_id', playerIds)
    .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
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
  
  // Map legacy fields to correct field names
  const paymentData: any = {
    ...payment,
    type: payment.type || payment.payment_type || 'custom', // Use 'type' field
    method: payment.method || payment.payment_method, // Use 'method' field
    status: payment.status || 'Approved', // Default to 'Approved' if not specified
    // Note: created_by column does not exist in payments table, removed to avoid schema errors
  };
  
  // Remove legacy fields and non-existent columns if they exist
  delete paymentData.payment_type;
  delete paymentData.payment_method;
  delete paymentData.month_year; // month_year column does not exist in payments table
  
  const { data, error } = await supabase
    .from('payments')
    .insert(paymentData)
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
  
  // Only get approved/successful payments - rejections are not real payments
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, type, payment_date') // Use 'type' not 'payment_type'
    .eq('player_id', playerId)
    .neq('status', 'Rejected'); // Exclude rejected payments - they are not real payments
  
  const total = payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;
  const lastPayment = payments?.[0];
  
  return {
    total,
    count: payments?.length || 0,
    lastPayment: lastPayment?.payment_date || null
  };
}

// Link a payment to a player
export async function linkPaymentToPlayer(paymentId: string, playerId: string) {
  const supabase = await createClient();
  
  // Verify payment exists and is unlinked
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    return { error: 'Pago no encontrado' };
  }

  if (payment.player_id) {
    return { error: 'Este pago ya está vinculado a un jugador' };
  }

  // Verify player exists
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .single();

  if (playerError || !player) {
    return { error: 'Jugador no encontrado' };
  }

  // Update payment - only update fields that exist
  // Note: We don't explicitly set updated_at as it should be handled by trigger if it exists
  const updateData: any = {
    player_id: playerId,
  };
  
  // Only set status if it's not already set or if we want to ensure it's Approved
  if (!payment.status || payment.status === 'Pending') {
    updateData.status = 'Approved';
  } else {
    updateData.status = payment.status;
  }
  
  const { error: updateError } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);

  if (updateError) {
    console.error('Error linking payment:', updateError);
    return { error: 'Error al vincular el pago' };
  }

  // Revalidate paths
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/players/[id]', 'page');
  revalidatePath('/dashboard/families');
  revalidatePath('/dashboard/finances');
  revalidatePath('/dashboard/payments/unlinked');

  return { success: true };
}

// Auto-link unlinked payments for a player (can be called from Server Actions)
export async function autoLinkUnlinkedPaymentsForPlayer(playerId: string) {
  const supabase = await createClient();
  
  console.log('[autoLinkUnlinkedPaymentsForPlayer] Starting auto-link for player:', playerId);
  
  // Get all unlinked payments
  const { data: unlinkedPayments, error: unlinkedError } = await supabase
    .from('payments')
    .select('*')
    .is('player_id', null)
    .order('payment_date', { ascending: false })
    .limit(50);
  
  if (unlinkedError || !unlinkedPayments) {
    console.error('[autoLinkUnlinkedPaymentsForPlayer] Error fetching unlinked payments:', unlinkedError);
    return { success: false, error: 'Error al buscar pagos no vinculados', linked: 0 };
  }
  
  // Filter payments that have this playerId in notes
  const potentiallyLinkedPayments = unlinkedPayments.filter(p => {
    if (!p.notes) return false;
    const notes = p.notes.toLowerCase();
    const playerIdLower = playerId.toLowerCase();
    return notes.includes(playerIdLower) || 
           notes.includes(`pending player ids: ${playerIdLower}`) ||
           notes.includes(`pending player ids:${playerIdLower}`);
  });
  
  if (potentiallyLinkedPayments.length === 0) {
    console.log('[autoLinkUnlinkedPaymentsForPlayer] No linkable payments found');
    return { success: true, linked: 0, message: 'No hay pagos para vincular' };
  }
  
  console.log('[autoLinkUnlinkedPaymentsForPlayer] Found potentially linkable payments:', {
    count: potentiallyLinkedPayments.length,
    paymentIds: potentiallyLinkedPayments.map(p => p.id),
  });
  
  let linkedCount = 0;
  const errors: string[] = [];
  
  for (const payment of potentiallyLinkedPayments) {
    try {
      const linkResult = await linkPaymentToPlayer(payment.id, playerId);
      if (linkResult.success) {
        linkedCount++;
        console.log('[autoLinkUnlinkedPaymentsForPlayer] ✅ Successfully linked payment:', {
          paymentId: payment.id,
          playerId,
        });
      } else {
        errors.push(`Payment ${payment.id}: ${linkResult.error}`);
        console.warn('[autoLinkUnlinkedPaymentsForPlayer] ⚠️ Could not link payment:', {
          paymentId: payment.id,
          error: linkResult.error,
        });
      }
    } catch (linkError: any) {
      errors.push(`Payment ${payment.id}: ${linkError.message}`);
      console.error('[autoLinkUnlinkedPaymentsForPlayer] ❌ Error linking payment:', {
        paymentId: payment.id,
        error: linkError,
      });
    }
  }
  
  return {
    success: true,
    linked: linkedCount,
    total: potentiallyLinkedPayments.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}
