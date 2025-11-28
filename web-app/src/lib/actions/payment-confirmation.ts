'use server';

import { createClient } from '@/lib/supabase/server';
import { queueEmail } from './email-queue';

export interface PaymentConfirmationData {
  playerId: string;
  amount: number;
  paymentType: 'enrollment' | 'monthly' | 'custom';
  paymentDate: string;
  monthYear?: string;
  operationId?: string;
}

/**
 * Send payment confirmation email to tutor
 */
export async function sendPaymentConfirmationEmail(data: PaymentConfirmationData) {
  try {
    const supabase = await createClient();
    
    // Get player with family info to get tutor email
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        families (
          tutor_name,
          tutor_email
        )
      `)
      .eq('id', data.playerId)
      .single();

    if (playerError || !player) {
      console.error('[Payment Confirmation] Error fetching player:', playerError);
      return { error: 'Player not found' };
    }

    const tutorEmail = (player.families as any)?.tutor_email;
    const tutorName = (player.families as any)?.tutor_name || 'Familia';
    const playerName = `${player.first_name} ${player.last_name}`;

    if (!tutorEmail) {
      console.warn('[Payment Confirmation] No tutor email found for player:', data.playerId);
      return { error: 'Tutor email not found' };
    }

    // Map payment type to Spanish label
    const paymentTypeLabels: Record<string, string> = {
      'enrollment': 'Matrícula',
      'monthly': 'Mensualidad',
      'custom': 'Pago Personalizado'
    };

    const paymentTypeLabel = paymentTypeLabels[data.paymentType] || 'Pago';

    // Format payment date
    const paymentDateFormatted = new Date(data.paymentDate).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Queue the confirmation email
    const emailResult = await queueEmail('payment_confirmation', tutorEmail, {
      tutorName: tutorName,
      playerName: playerName,
      amount: data.amount.toFixed(2),
      paymentType: paymentTypeLabel,
      paymentDate: paymentDateFormatted,
      monthYear: data.monthYear ? new Date(data.monthYear + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) : '',
      operationId: data.operationId || 'N/A',
    });

    if (emailResult.error) {
      console.error('[Payment Confirmation] Error queueing email:', emailResult.error);
      return { error: emailResult.error };
    }

    console.log('[Payment Confirmation] ✅ Confirmation email queued successfully:', {
      tutorEmail,
      playerName,
      amount: data.amount,
      paymentType: paymentTypeLabel,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Payment Confirmation] Error sending confirmation email:', error);
    return { error: error.message || 'Error al enviar correo de confirmación' };
  }
}

