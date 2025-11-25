'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { queueEmail } from '@/lib/actions/email-queue';

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
        tutor_cedula,
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
  try {
    const supabase = await createClient();

    // Get player data with family info including tutor email
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*, families(id, tutor_name, tutor_email)')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      console.error('Error fetching player:', playerError);
      return { error: `Error al obtener datos del jugador: ${playerError?.message || 'Jugador no encontrado'}` };
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
      console.error('Error updating player status:', updateError);
      return { error: `Error al actualizar el estado del jugador: ${updateError.message}` };
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
      // Continue even if payment creation fails, but log it
    }

    // Calculate monthly fee for email
    let monthlyFee = settingsMap['price_monthly'] || 130;
    
    // Check for custom fee
    if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
      monthlyFee = player.custom_monthly_fee;
    } else {
      // Check if part of family with 2+ players
      const familyFee = settingsMap['price_monthly_family'] || 110.50;
      const familyId = Array.isArray(player.families) 
        ? player.families[0]?.id 
        : player.families?.id;
      
      if (familyId) {
        const { data: familyPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('family_id', familyId)
          .in('status', ['Active', 'Scholarship'])
          .order('created_at');
        
        if (familyPlayers && familyPlayers.length >= 2) {
          const playerIndex = familyPlayers.findIndex(p => p.id === playerId);
          if (playerIndex >= 1) {
            monthlyFee = familyFee;
          }
        }
      }
    }

    // Send acceptance email with monthly fee
    const tutorEmail = Array.isArray(player.families) 
      ? player.families[0]?.tutor_email 
      : player.families?.tutor_email;
    const tutorName = Array.isArray(player.families)
      ? player.families[0]?.tutor_name || 'Familia'
      : player.families?.tutor_name || 'Familia';
    const playerName = `${player.first_name} ${player.last_name}`;

    if (tutorEmail) {
      try {
        await queueEmail('player_accepted', tutorEmail, {
          tutorName,
          playerNames: playerName,
          monthlyFee: monthlyFee.toFixed(2),
        });
      } catch (emailError) {
        console.error('Error queuing acceptance email:', emailError);
        // Don't fail the approval if email fails
      }
    }
  }

    revalidatePath('/dashboard/approvals');
    revalidatePath('/dashboard/players');
    revalidatePath('/dashboard/finances');
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in approvePlayer:', error);
    return { error: `Error inesperado: ${error.message || 'Error desconocido'}` };
  }
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
