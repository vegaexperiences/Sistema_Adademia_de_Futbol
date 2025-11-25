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

  // Create monthly payment record if player is approved (not scholarship)
  if (type === 'Active') {
    // Calculate monthly fee
    let monthlyFee = 130; // Default
    
    // Check for custom fee
    if (player.monthly_fee_override) {
      monthlyFee = player.monthly_fee_override;
    } else {
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
          .select('id')
          .eq('family_id', player.families.id)
          .in('status', ['Active', 'Scholarship'])
          .order('created_at');
        
        if (familyPlayers && familyPlayers.length >= 2) {
          const playerIndex = familyPlayers.findIndex(p => p.id === playerId);
          if (playerIndex >= 1) {
            monthlyFee = familyFee;
          } else {
            monthlyFee = normalFee;
          }
        } else {
          monthlyFee = normalFee;
        }
      } else {
        monthlyFee = normalFee;
      }
    }

    // Get current month/year
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Create payment record for monthly fee
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        player_id: playerId,
        amount: monthlyFee,
        type: 'Mensualidad', // Using 'type' field as per schema.sql
        status: 'Paid', // Se asume pagado porque se aprueba manualmente
        method: 'Manual', // Aprobación manual
        payment_date: new Date().toISOString(),
        notes: `Mensualidad automática al aprobar jugador. Monto: $${monthlyFee.toFixed(2)}`,
      });

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      // No retornamos error aquí, el jugador ya fue aprobado
    }

    // Update player's last payment date
    await supabase
      .from('players')
      .update({ 
        last_payment_date: new Date().toISOString().split('T')[0],
        payment_status: 'current'
      })
      .eq('id', playerId);
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
