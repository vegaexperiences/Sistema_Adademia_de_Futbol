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
    // Also include tutor_email directly from player (for players without family)
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        tutor_name,
        tutor_email,
        family_id,
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

    const playerName = `${player.first_name} ${player.last_name}`;
    
    // Handle families relationship - can be array, object, or null
    let tutorEmail: string | null = null;
    let tutorName: string = 'Familia';
    
    if (player.family_id && player.families) {
      // Player has a family - get tutor info from family
      const family = Array.isArray(player.families) ? player.families[0] : player.families;
      tutorEmail = family?.tutor_email || null;
      tutorName = family?.tutor_name || 'Familia';
      
      console.log('[Payment Confirmation] Found tutor from family:', {
        playerId: data.playerId,
        familyId: player.family_id,
        tutorEmail,
        tutorName,
        familyStructure: Array.isArray(player.families) ? 'array' : 'object',
      });
    } else if (player.tutor_email) {
      // Player has tutor info directly (no family)
      tutorEmail = player.tutor_email;
      tutorName = player.tutor_name || 'Tutor';
      
      console.log('[Payment Confirmation] Found tutor from player (no family):', {
        playerId: data.playerId,
        tutorEmail,
        tutorName,
      });
    }

    if (!tutorEmail) {
      console.warn('[Payment Confirmation] No tutor email found for player:', {
        playerId: data.playerId,
        hasFamily: !!player.family_id,
        hasFamiliesRelation: !!player.families,
        hasPlayerTutorEmail: !!player.tutor_email,
        familiesType: Array.isArray(player.families) ? 'array' : typeof player.families,
      });
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

    // Queue the thank you email (using new template for all payment types)
    const emailResult = await queueEmail('payment_thank_you', tutorEmail, {
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

