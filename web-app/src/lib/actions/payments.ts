'use server';

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isSuperAdmin } from '@/lib/utils/academy';
import { hasRole } from '@/lib/utils/permissions';

export interface Payment {
  id?: string;
  player_id: string | null; // Can be null for orphaned payments (pending players)
  amount: number;
  type: 'enrollment' | 'monthly' | 'custom' | 'Matrícula'; // Use 'type' to match database schema
  method?: 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'ach' | 'other'; // Use 'method' to match database schema
  payment_date: string;
  month_year?: string;
  notes?: string;
  proof_url?: string | null; // URL del comprobante de pago
  status?: 'Approved' | 'Pending' | 'Rejected' | 'Cancelled' | 'Paid' | 'Overdue';
  // Legacy fields for backward compatibility (will be mapped)
  payment_type?: 'enrollment' | 'monthly' | 'custom';
  payment_method?: 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'ach' | 'other';
}

// Get all payments for a player
export async function getPlayerPayments(playerId: string) {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();
  
  console.log('[getPlayerPayments] Fetching payments for player:', playerId);
  
  // First, check if player exists
  let playerQuery = supabase
    .from('players')
    .select('id')
    .eq('id', playerId);
  
  if (academyId) {
    playerQuery = playerQuery.eq('academy_id', academyId);
  }
  
  const { data: playerCheck, error: playerCheckError } = await playerQuery.single();
  
  if (playerCheckError || !playerCheck) {
    console.warn('[getPlayerPayments] Player not found:', {
      playerId,
      error: playerCheckError?.message,
    });
  }
  
  // Only get approved/successful payments - rejections are not real payments
  let query = supabase
    .from('payments')
    .select('*')
    .eq('player_id', playerId)
    .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
    .order('payment_date', { ascending: false });
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { data, error } = await query;
  
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
  let unlinkedQuery = supabase
    .from('payments')
    .select('*')
    .is('player_id', null)
    .order('payment_date', { ascending: false })
    .limit(10);
  
  if (academyId) {
    unlinkedQuery = unlinkedQuery.eq('academy_id', academyId);
  }
  
  const { data: unlinkedPayments, error: unlinkedError } = await unlinkedQuery;
  
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
  const academyId = await getCurrentAcademyId();
  
  // Only get approved/successful payments - rejections are not real payments
  let query = supabase
    .from('payments')
    .select('*, players(first_name, last_name)')
    .in('player_id', playerIds)
    .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
    .order('payment_date', { ascending: false });
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
  
  return data;
}

// Create a new payment
export async function createPayment(payment: Payment) {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();
  
  if (!academyId) {
    throw new Error('No academy context available');
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Validate required fields
  if (!payment.amount || payment.amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  if (!payment.payment_date) {
    throw new Error('La fecha de pago es requerida');
  }

  // For manual payment methods (cash, transfer, ach), always set status to 'Approved'
  // For online methods (yappy, paguelofacil), status can be 'Pending' initially
  const manualMethods = ['cash', 'transfer', 'ach', 'other'];
  const paymentMethod = payment.method || payment.payment_method || 'cash';
  const shouldAutoApprove = manualMethods.includes(paymentMethod);
  
  // Map legacy fields to correct field names
  const paymentData: any = {
    ...payment,
    type: payment.type || payment.payment_type || 'custom', // Use 'type' field
    method: paymentMethod, // Normalize method name
    // Always set status: 'Approved' for manual methods, or use provided status
    status: shouldAutoApprove ? 'Approved' : (payment.status || 'Pending'),
    academy_id: academyId,
    // Ensure player_id is set if provided
    player_id: payment.player_id || null,
    // Note: created_by column does not exist in payments table, removed to avoid schema errors
  };
  
  // Remove legacy fields and non-existent columns if they exist
  delete paymentData.payment_type;
  delete paymentData.payment_method;
  delete paymentData.month_year; // month_year column does not exist in payments table
  
  // Log payment creation for debugging
  console.log('[createPayment] Creating payment:', {
    amount: paymentData.amount,
    type: paymentData.type,
    method: paymentData.method,
    status: paymentData.status,
    player_id: paymentData.player_id,
    academy_id: paymentData.academy_id,
    payment_date: paymentData.payment_date,
  });
  
  const { data, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single();
  
  if (error) {
    console.error('[createPayment] Error creating payment:', {
      error,
      paymentData,
    });
    throw new Error(`Error al crear el pago: ${error.message}`);
  }

  // Verify the payment was created correctly
  if (!data) {
    console.error('[createPayment] Payment created but no data returned');
    throw new Error('Error al crear el pago: no se recibió confirmación');
  }

  // Log successful creation
  console.log('[createPayment] Payment created successfully:', {
    id: data.id,
    status: data.status,
    method: data.method,
    amount: data.amount,
  });
  
  // Update player's last payment date
  let playerUpdateQuery = supabase
    .from('players')
    .update({ 
      last_payment_date: payment.payment_date,
      payment_status: 'current'
    })
    .eq('id', payment.player_id);
  
  if (academyId) {
    playerUpdateQuery = playerUpdateQuery.eq('academy_id', academyId);
  }
  
  await playerUpdateQuery;
  
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
  const academyId = await getCurrentAcademyId();
  
  let query = supabase
    .from('players')
    .update({ custom_monthly_fee: customFee })
    .eq('id', playerId);
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { error } = await query;
  
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
  const academyId = await getCurrentAcademyId();
  
  let query = supabase
    .from('players')
    .update({ status })
    .eq('id', playerId);
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { error } = await query;
  
  if (error) {
    console.error('Error updating player status:', error);
    throw new Error('Error al actualizar el estado del jugador');
  }
  
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/families');
  revalidatePath('/dashboard/tutors');
  
  return { success: true };
}

/**
 * Check if the current date is within the active season
 * Returns true if:
 * - No season dates are configured (empty string = no restriction)
 * - Current date is >= season_start_date (if configured)
 * - Current date is <= season_end_date (if configured)
 */
export async function isSeasonActive(checkDate?: Date): Promise<boolean> {
  const supabase = await createClient();
  
  // Get season date settings
  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['season_start_date', 'season_end_date']);
  
  const settingsMap = settings?.reduce((acc: any, s: any) => {
    acc[s.key] = s.value;
    return acc;
  }, {}) || {};
  
  const seasonStartDate = settingsMap['season_start_date'];
  const seasonEndDate = settingsMap['season_end_date'];
  
  // If no dates are configured (empty string or null), season is always active (no restriction)
  if ((!seasonStartDate || seasonStartDate === '') && (!seasonEndDate || seasonEndDate === '')) {
    return true;
  }
  
  // Use provided date or current date
  const checkDateObj = checkDate || new Date();
  const checkDateStr = checkDateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Check if before start date
  if (seasonStartDate && seasonStartDate !== '' && checkDateStr < seasonStartDate) {
    return false;
  }
  
  // Check if after end date
  if (seasonEndDate && seasonEndDate !== '' && checkDateStr > seasonEndDate) {
    return false;
  }
  
  return true;
}

// Calculate monthly fee for a player
export async function calculateMonthlyFee(playerId: string) {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();
  
  // Get player data
  let query = supabase
    .from('players')
    .select('*, families(id)')
    .eq('id', playerId);
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { data: player } = await query.single();
  
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
    let familyQuery = supabase
      .from('players')
      .select('id, first_name')
      .eq('family_id', player.families.id)
      .order('created_at');
    
    if (academyId) {
      familyQuery = familyQuery.eq('academy_id', academyId);
    }
    
    const { data: familyPlayers } = await familyQuery;
    
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
  const academyId = await getCurrentAcademyId();
  
  // Only get approved/successful payments - rejections are not real payments
  let query = supabase
    .from('payments')
    .select('amount, type, payment_date') // Use 'type' not 'payment_type'
    .eq('player_id', playerId)
    .neq('status', 'Rejected'); // Exclude rejected payments - they are not real payments
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { data: payments } = await query;
  
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
  const academyId = await getCurrentAcademyId();
  
  // Verify payment exists and is unlinked
  let paymentQuery = supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId);
  
  if (academyId) {
    paymentQuery = paymentQuery.eq('academy_id', academyId);
  }
  
  const { data: payment, error: paymentError } = await paymentQuery.single();

  if (paymentError || !payment) {
    return { error: 'Pago no encontrado' };
  }

  if (payment.player_id) {
    return { error: 'Este pago ya está vinculado a un jugador' };
  }

  // Verify player exists
  let playerQuery = supabase
    .from('players')
    .select('id')
    .eq('id', playerId);
  
  if (academyId) {
    playerQuery = playerQuery.eq('academy_id', academyId);
  }
  
  const { data: player, error: playerError } = await playerQuery.single();

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
  
  let updateQuery = supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);
  
  if (academyId) {
    updateQuery = updateQuery.eq('academy_id', academyId);
  }
  
  const { error: updateError } = await updateQuery;

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
  const academyId = await getCurrentAcademyId();
  
  console.log('[autoLinkUnlinkedPaymentsForPlayer] Starting auto-link for player:', playerId);
  
  // Get all unlinked payments
  let query = supabase
    .from('payments')
    .select('*')
    .is('player_id', null)
    .order('payment_date', { ascending: false })
    .limit(50);
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { data: unlinkedPayments, error: unlinkedError } = await query;
  
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

/**
 * Update payment amount
 * Only admins can update payment amounts
 */
export async function updatePaymentAmount(
  paymentId: string,
  newAmount: number
): Promise<{ data: any | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  // Validate new amount
  if (!newAmount || newAmount <= 0) {
    return { data: null, error: 'El monto debe ser mayor a 0' };
  }

  // Check if user is admin
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'No autorizado: debe iniciar sesión' };
    }

    // Check if super admin
    const isAdmin = await isSuperAdmin(user.id);
    if (!isAdmin) {
      // Check if admin role in current academy
      if (academyId) {
        const hasAdminRole = await hasRole(user.id, 'admin', academyId);
        if (!hasAdminRole) {
          return { data: null, error: 'No autorizado: se requieren permisos de administrador' };
        }
      } else {
        return { data: null, error: 'No autorizado: se requieren permisos de administrador' };
      }
    }
  } catch (error: any) {
    console.error('[updatePaymentAmount] Error checking admin status:', error);
    return { data: null, error: 'Error al verificar permisos' };
  }

  // Verify payment exists and belongs to current academy
  let paymentQuery = supabase
    .from('payments')
    .select('id, amount, player_id, academy_id')
    .eq('id', paymentId)
    .single();

  if (academyId) {
    paymentQuery = paymentQuery.eq('academy_id', academyId);
  }

  const { data: existingPayment, error: fetchError } = await paymentQuery;

  if (fetchError || !existingPayment) {
    console.error('[updatePaymentAmount] Payment not found:', {
      paymentId,
      error: fetchError?.message,
    });
    return { data: null, error: 'Pago no encontrado o no pertenece a esta academia' };
  }

  // Update payment amount
  const { data: updatedPayment, error: updateError } = await supabase
    .from('payments')
    .update({
      amount: newAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (updateError) {
    console.error('[updatePaymentAmount] Error updating payment:', {
      paymentId,
      error: updateError.message,
    });
    return { data: null, error: `Error al actualizar el pago: ${updateError.message}` };
  }

  console.log('[updatePaymentAmount] Payment updated successfully:', {
    paymentId,
    oldAmount: existingPayment.amount,
    newAmount,
  });

  // Revalidate relevant paths
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/finances');
  revalidatePath('/dashboard/finances/transactions');
  if (existingPayment.player_id) {
    revalidatePath(`/dashboard/players/${existingPayment.player_id}`);
  }

  return { data: updatedPayment, error: null };
}
