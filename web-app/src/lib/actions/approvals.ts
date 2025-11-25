'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPendingPlayers() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      families (
        name,
        tutor_name,
        tutor_email,
        tutor_phone,
        tutor_cedula_url
      )
    `)
    .eq('status', 'Pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending players:', error);
    return [];
  }

  return data;
}

export async function approvePlayer(playerId: string, type: 'Active' | 'Scholarship') {
  const supabase = await createClient();

  // Get player data first to calculate monthly fee
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*, families(id)')
    .eq('id', playerId)
    .single();

  if (playerError || !player) {
    return { error: 'Error al obtener datos del jugador' };
  }

  const updateData: any = {
    status: type === 'Scholarship' ? 'Scholarship' : 'Active',
  };

  if (type === 'Scholarship') {
    updateData.discount_percent = 100;
    updateData.notes = 'Becado aprobado desde panel de control';
  }

  // Update player status
  const { error: updateError } = await supabase
    .from('players')
    .update(updateData)
    .eq('id', playerId);

  if (updateError) {
    return { error: 'Error al aprobar jugador' };
  }

  // Register enrollment payment (only for regular approvals)
  if (type === 'Active') {
    const { data: settings } = await supabase.from('settings').select('*');
    const settingsMap =
      settings?.reduce((acc: Record<string, number>, s: any) => {
        acc[s.key] = parseFloat(s.value);
        return acc;
      }, {}) || {};
    const enrollmentFee = settingsMap['price_enrollment'] ?? 80;
    const now = new Date();

    const { error: paymentError } = await supabase.from('payments').insert({
      player_id: playerId,
      amount: enrollmentFee,
      type: 'Matrícula',
      status: 'Paid',
      method: 'Manual',
      payment_date: now.toISOString(),
      notes: `Matrícula confirmada al aprobar jugador. Monto: $${enrollmentFee.toFixed(2)}`,
    });

    if (paymentError) {
      console.error('Error creating enrollment payment:', paymentError);
    }
  }

  revalidatePath('/dashboard/approvals');
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function rejectPlayer(playerId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('players')
    .update({ status: 'Rejected' })
    .eq('id', playerId);

  if (error) {
    return { error: 'Error al rechazar jugador' };
  }

  revalidatePath('/dashboard/approvals');
  return { success: true };
}

export async function getPendingPayments() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      players (
        first_name,
        last_name,
        cedula
      )
    `)
    .eq('status', 'Pending Approval')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending payments:', error);
    return [];
  }

  return data;
}

export async function approvePayment(paymentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('payments')
    .update({ status: 'Paid' })
    .eq('id', paymentId);

  if (error) {
    return { error: 'Error al aprobar pago' };
  }

  revalidatePath('/dashboard/approvals');
  revalidatePath('/dashboard/finance');
  return { success: true };
}

export async function rejectPayment(paymentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('payments')
    .update({ status: 'Rejected' })
    .eq('id', paymentId);

  if (error) {
    return { error: 'Error al rechazar pago' };
  }

  revalidatePath('/dashboard/approvals');
  return { success: true };
}
