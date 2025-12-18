'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendEmailImmediately } from '@/lib/actions/email-queue';

export async function getPendingPlayersCount() {
  const supabase = await createClient();
  
  let query = supabase
    .from('pending_players')
    .select('*', { count: 'exact', head: true });
  
  
  const { count, error } = await query;
  
  if (error) {
    console.error('[getPendingPlayersCount] Error:', error);
    return 0;
  }
  
  return count || 0;
}

export async function getPendingPlayers() {
  const supabase = await createClient();
  
  // Query from pending_players table instead of players with status filter
  let query = supabase
    .from('pending_players')
    .select('*')
    .order('created_at', { ascending: false });
  
  
  const { data: playersData, error: playersError } = await query;

  if (playersError) {
    console.error('Error fetching pending players:', playersError);
    return [];
  }

  if (!playersData || playersData.length === 0) {
    return [];
  }

  // Get unique player IDs
  const playerIds = [...new Set(playersData.map((p: any) => p.id))];
  
  // Fetch family data separately for each player
  let familyQuery = supabase
    .from('families')
    .select('id, name, tutor_name, tutor_email, tutor_phone, tutor_cedula, tutor_cedula_url')
    .in('id', playersData.map((p: any) => p.family_id).filter(Boolean));
  
  
  const { data: familiesData, error: familiesError } = await familyQuery;

  if (familiesError) {
    console.error('Error fetching families:', familiesError);
  }

  // Create a map of family_id to family data
  const familiesMap = new Map();
  if (familiesData) {
    familiesData.forEach((family: any) => {
      familiesMap.set(family.id, family);
    });
  }

  // Combine player data with family data
  const result = playersData.map((player: any) => {
    const family = player.family_id ? familiesMap.get(player.family_id) : null;
    return {
      ...player,
      families: family ? [family] : null, // Keep as array for consistency with previous format
    };
  });

  // Final check for duplicates by ID (shouldn't happen now, but just in case)
  const seen = new Set<string>();
  const seenNames = new Map<string, string[]>(); // Track names to detect duplicates
  const unique = result.filter((player: any) => {
    if (!player || !player.id) return false;
    
    // Check for duplicate IDs
    if (seen.has(player.id)) {
      console.warn(`[getPendingPlayers] ⚠️ Duplicate player ID detected: ${player.id} - ${player.first_name} ${player.last_name}`);
      return false;
    }
    
    // Track by name to detect potential duplicates with different IDs
    const fullName = `${player.first_name} ${player.last_name}`.toLowerCase();
    if (seenNames.has(fullName)) {
      const existingIds = seenNames.get(fullName)!;
      console.warn(`[getPendingPlayers] ⚠️ Duplicate player name detected: "${fullName}" with IDs: [${existingIds.join(', ')}, ${player.id}]`);
      seenNames.set(fullName, [...existingIds, player.id]);
    } else {
      seenNames.set(fullName, [player.id]);
    }
    
    seen.add(player.id);
    return true;
  });

  console.log(`[getPendingPlayers] ✅ Found ${unique.length} unique pending players (from ${playersData.length} raw records)`);
  if (unique.length > 0) {
    console.log(`[getPendingPlayers] Player IDs:`, unique.map((p: any) => `${p.id} (${p.first_name} ${p.last_name})`));
  }
  
  return unique;
}

/**
 * Busca pagos aprobados de enrollment (PagueloFacil o Yappy) vinculados a un jugador pendiente
 * Busca por el playerId en las notas con formato "Pending Player IDs: uuid"
 */
export async function getApprovedEnrollmentPayment(playerId: string) {
  const supabase = await createClient();
  
  try {
    // Buscar pagos de enrollment aprobados
    // Primero obtener todos los pagos de enrollment aprobados y filtrar por método en JavaScript
    // Esto evita problemas con el nombre del campo (method vs payment_method)
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('type', 'enrollment')
      .eq('status', 'Approved')
      .order('payment_date', { ascending: false })
      .limit(50); // Aumentar límite para asegurar que encontramos los pagos
    
    if (error) {
      console.error('[getApprovedEnrollmentPayment] Error fetching payments:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }
    
    if (!payments || payments.length === 0) {
      return null;
    }
    
    // Filtrar en JavaScript para encontrar pagos con método paguelofacil o yappy
    // y que tengan este playerId en las notas
    const playerIdLower = playerId.toLowerCase();
    const matchingPayment = payments.find((payment: any) => {
      // Verificar método de pago (soporta ambos nombres de campo)
      const paymentMethod = (payment.method || payment.payment_method || '').toLowerCase();
      const isPagueloFacilOrYappy = paymentMethod === 'paguelofacil' || paymentMethod === 'yappy';
      
      if (!isPagueloFacilOrYappy) {
        return false;
      }
      
      // Verificar que tenga notas y contenga el playerId
      if (!payment.notes) return false;
      const notes = payment.notes.toLowerCase();
      
      // Buscar el playerId en las notas en varios formatos
      return notes.includes(playerIdLower) || 
             notes.includes(`pending player ids: ${playerIdLower}`) ||
             notes.includes(`pending player ids:${playerIdLower}`) ||
             notes.includes(`pending player ids: ${playerIdLower},`) ||
             notes.includes(`pending player ids:${playerIdLower},`) ||
             notes.includes(`, ${playerIdLower}`) ||
             notes.includes(`,${playerIdLower}`);
    });
    
    if (matchingPayment) {
      console.log('[getApprovedEnrollmentPayment] Found approved enrollment payment:', {
        paymentId: matchingPayment.id,
        playerId,
        method: matchingPayment.method || matchingPayment.payment_method,
        amount: matchingPayment.amount,
        paymentDate: matchingPayment.payment_date
      });
    }
    
    return matchingPayment || null;
  } catch (error: any) {
    console.error('[getApprovedEnrollmentPayment] Error:', {
      error,
      message: error?.message,
      stack: error?.stack
    });
    return null;
  }
}

export async function approvePlayer(
  playerId: string, 
  type: 'Active' | 'Scholarship',
  options?: {
    customEnrollmentPrice?: number;
    paymentMethod?: 'cash' | 'transfer' | 'yappy' | 'paguelofacil' | 'ach' | 'other';
    paymentProof?: string; // URL de comprobante o ID de transacción
    useExistingPayment?: boolean;
    existingPaymentId?: string;
  }
) {
  try {
  const supabase = await createClient();

    // Get player data from pending_players table
    let pendingQuery = supabase
      .from('pending_players')
      .select('*')
      .eq('id', playerId);
    

  // Revalidate all relevant paths to ensure UI updates
  revalidatePath('/dashboard/approvals');
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/finances');
  revalidatePath('/dashboard/finance');
  
  console.log('[approvePlayer] ✅ Approval completed successfully:', {
    playerId,
    type,
    deletedFromPending: true,
  });
  
  return { 
    success: true,
    message: type === 'Active' 
      ? 'Jugador aprobado como Normal.'
      : 'Jugador aprobado como Becado.',
  };
  } catch (error: any) {
    console.error('Unexpected error in approvePlayer:', error);
    return { error: `Error inesperado: ${error.message || 'Error desconocido'}` };
  }
}

export async function rejectPlayer(playerId: string) {
  const supabase = await createClient();

  // Get player data from pending_players
  const { data: pendingPlayer, error: fetchError } = await supabase
    .from('pending_players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (fetchError || !pendingPlayer) {
    console.error('Error fetching pending player:', fetchError);
    return { error: `Error al obtener datos del jugador: ${fetchError?.message || 'Jugador no encontrado'}` };
  }

  // Prepare player data for insertion into rejected_players table
  const rejectedPlayerData: any = {
    id: pendingPlayer.id,
    family_id: pendingPlayer.family_id,
    first_name: pendingPlayer.first_name,
    last_name: pendingPlayer.last_name,
    birth_date: pendingPlayer.birth_date,
    gender: pendingPlayer.gender,
    cedula: pendingPlayer.cedula,
    category: pendingPlayer.category,
    discount_percent: pendingPlayer.discount_percent,
    monthly_fee_override: pendingPlayer.monthly_fee_override,
    image_url: pendingPlayer.image_url,
    notes: pendingPlayer.notes,
    created_at: pendingPlayer.created_at,
    updated_at: new Date().toISOString(),
    tutor_name: pendingPlayer.tutor_name,
    tutor_cedula: pendingPlayer.tutor_cedula,
    tutor_email: pendingPlayer.tutor_email,
    tutor_phone: pendingPlayer.tutor_phone,
    custom_monthly_fee: pendingPlayer.custom_monthly_fee,
    payment_status: pendingPlayer.payment_status,
    last_payment_date: pendingPlayer.last_payment_date,
    cedula_front_url: pendingPlayer.cedula_front_url,
    cedula_back_url: pendingPlayer.cedula_back_url,
    monthly_statement_sent_at: pendingPlayer.monthly_statement_sent_at,
    rejected_at: new Date().toISOString(),
    rejection_reason: 'Rechazado desde panel de control',
  };

  // Insert into rejected_players
  const { error: insertError } = await supabase
    .from('rejected_players')
    .insert(rejectedPlayerData);

  if (insertError) {
    console.error('Error inserting into rejected_players:', insertError);
    return { error: `Error al rechazar jugador: ${insertError.message}` };
  }

  // Delete from pending_players
  const { error: deleteError } = await supabase
    .from('pending_players')
    .delete()
    .eq('id', playerId);

  if (deleteError) {
    console.error('Error deleting from pending_players:', deleteError);
    return { error: `Error al eliminar jugador pendiente: ${deleteError.message}` };
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
