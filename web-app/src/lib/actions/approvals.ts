'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendEmailImmediately } from '@/lib/actions/email-queue';

export async function getPendingPlayersCount() {
  const supabase = await createClient();
  
  const { count, error } = await supabase
    .from('pending_players')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('[getPendingPlayersCount] Error:', error);
    return 0;
  }
  
  return count || 0;
}

export async function getPendingPlayers() {
  const supabase = await createClient();
  
  // Query from pending_players table instead of players with status filter
  const { data: playersData, error: playersError } = await supabase
    .from('pending_players')
    .select('*')
    .order('created_at', { ascending: false });

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
  const { data: familiesData, error: familiesError } = await supabase
    .from('families')
    .select('id, name, tutor_name, tutor_email, tutor_phone, tutor_cedula, tutor_cedula_url')
    .in('id', playersData.map((p: any) => p.family_id).filter(Boolean));

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
      .order('created_at', { ascending: false })
      .limit(50); // Aumentar límite para asegurar que encontramos los pagos
    
    if (error) {
      // Serializar el error correctamente para evitar objetos vacíos
      const errorInfo = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        playerId
      };
      console.error('[getApprovedEnrollmentPayment] Error fetching payments:', JSON.stringify(errorInfo, null, 2));
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
    console.error('[getApprovedEnrollmentPayment] Exception caught:', {
      error: error || 'Unknown error',
      message: error?.message || 'No error message',
      stack: error?.stack || 'No stack trace',
      playerId
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
    const { data: pendingPlayer, error: playerError } = await supabase
      .from('pending_players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !pendingPlayer) {
      console.error('Error fetching pending player:', playerError);
      return { error: `Error al obtener datos del jugador: ${playerError?.message || 'Jugador no encontrado'}` };
    }

    console.log('[approvePlayer] Starting approval for player:', {
      playerId,
      type,
      hasFamilyId: !!pendingPlayer.family_id,
      tutorName: pendingPlayer.tutor_name,
      tutorEmail: pendingPlayer.tutor_email,
      tutorCedula: pendingPlayer.tutor_cedula,
    });

    // Get family info if player has family_id
    let familyData = null;
    if (pendingPlayer.family_id) {
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('id, tutor_name, tutor_email, tutor_cedula, tutor_phone')
        .eq('id', pendingPlayer.family_id)
        .single();
      
      if (familyError) {
        console.error('[approvePlayer] Error fetching family:', familyError);
      } else {
        familyData = family;
        console.log('[approvePlayer] Family data found:', {
          familyId: family?.id,
          tutorName: family?.tutor_name,
          tutorEmail: family?.tutor_email,
        });
      }
    }

    const player = {
      ...pendingPlayer,
      families: familyData ? [familyData] : null,
    };

    // Get tutor cedula - prioritize from family, then pendingPlayer
    let tutorCedula: string | null = null;
    if (familyData?.tutor_cedula) {
      tutorCedula = familyData.tutor_cedula;
    } else if (pendingPlayer.tutor_cedula) {
      tutorCedula = pendingPlayer.tutor_cedula;
    }

    // Get tutor data - prioritize from family if exists, otherwise use pendingPlayer data
    let tutorName = familyData?.tutor_name || pendingPlayer.tutor_name || null;
    let tutorEmail = familyData?.tutor_email || pendingPlayer.tutor_email || null;
    let tutorPhone = familyData?.tutor_phone || pendingPlayer.tutor_phone || null;

    // If still no tutor_cedula, use from pendingPlayer
    if (!tutorCedula) {
      tutorCedula = pendingPlayer.tutor_cedula || null;
    }

    console.log('[approvePlayer] Tutor data to be saved:', {
      tutorName,
      tutorEmail,
      tutorCedula,
      tutorPhone,
      source: familyData ? 'family' : 'pendingPlayer',
    });

    // Prepare player data for insertion into players table
    const playerData: any = {
      id: pendingPlayer.id,
      family_id: pendingPlayer.family_id,
      first_name: pendingPlayer.first_name,
      last_name: pendingPlayer.last_name,
      birth_date: pendingPlayer.birth_date,
      gender: pendingPlayer.gender,
      cedula: pendingPlayer.cedula,
      category: pendingPlayer.category,
      discount_percent: type === 'Scholarship' ? 100 : pendingPlayer.discount_percent || 0,
      monthly_fee_override: pendingPlayer.monthly_fee_override,
      image_url: pendingPlayer.image_url,
      notes: type === 'Scholarship' ? 'Becado aprobado desde panel de control' : pendingPlayer.notes,
      created_at: pendingPlayer.created_at,
      updated_at: new Date().toISOString(),
      tutor_name: tutorName,
      tutor_cedula: tutorCedula,
      tutor_email: tutorEmail,
      tutor_phone: tutorPhone,
      custom_monthly_fee: pendingPlayer.custom_monthly_fee,
      payment_status: pendingPlayer.payment_status,
      last_payment_date: pendingPlayer.last_payment_date,
      cedula_front_url: pendingPlayer.cedula_front_url,
      cedula_back_url: pendingPlayer.cedula_back_url,
      monthly_statement_sent_at: pendingPlayer.monthly_statement_sent_at,
      status: type === 'Scholarship' ? 'Scholarship' : 'Active',
    };

    // Insert player into players table
    console.log('[approvePlayer] Inserting player data:', {
      id: playerData.id,
      first_name: playerData.first_name,
      last_name: playerData.last_name,
      tutor_name: playerData.tutor_name,
      tutor_email: playerData.tutor_email,
      tutor_cedula: playerData.tutor_cedula,
      status: playerData.status,
    });

    const { data: insertedPlayer, error: insertError } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single();

    if (insertError) {
      console.error('[approvePlayer] ❌ Error inserting player:', insertError);
      return { error: `Error al aprobar jugador: ${insertError.message}` };
    }

    console.log('[approvePlayer] ✅ Player inserted successfully:', {
      playerId: insertedPlayer?.id,
      status: insertedPlayer?.status,
    });

    // Delete from pending_players - CRITICAL: Must delete to remove from approvals list
    console.log('[approvePlayer] Deleting player from pending_players:', playerId);
    const { data: deletedData, error: deleteError } = await supabase
      .from('pending_players')
      .delete()
      .eq('id', playerId)
      .select();

    if (deleteError) {
      console.error('[approvePlayer] ❌ CRITICAL: Error deleting from pending_players:', {
        error: deleteError,
        code: deleteError.code,
        message: deleteError.message,
        playerId,
      });
      // This is critical - if we can't delete, the player will still show in approvals
      return { error: `Error al eliminar jugador de aprobaciones: ${deleteError.message}. El jugador fue aprobado pero aún aparece en la lista.` };
    } else {
      console.log('[approvePlayer] ✅ Successfully deleted from pending_players:', {
        deletedCount: deletedData?.length || 0,
        playerId,
      });
    }

    // Manage family creation/removal based on approved players count
    // Strategy: Use family_id if player already has one, otherwise find by tutor_cedula through families
    let approvedPlayers: any[] = [];
    let familyId: string | null = null;

    if (player.family_id) {
      // Player already has a family_id, check all players in that family
      familyId = player.family_id;
      const { data: familyPlayers } = await supabase
        .from('players')
        .select('id, status')
        .eq('family_id', familyId)
        .in('status', ['Active', 'Scholarship']);

      if (familyPlayers) {
        approvedPlayers = familyPlayers;
      }
    } else if (tutorCedula) {
      // Player doesn't have family_id, but we have tutor_cedula
      // Find all families with this tutor_cedula, then find all approved players in those families
      const { data: families } = await supabase
        .from('families')
        .select('id')
        .eq('tutor_cedula', tutorCedula);

      if (families && families.length > 0) {
        const familyIds = families.map(f => f.id);
        const { data: players } = await supabase
          .from('players')
          .select('id, status, family_id')
          .in('family_id', familyIds)
          .in('status', ['Active', 'Scholarship']);

        if (players) {
          approvedPlayers = players;
          familyId = families[0].id; // Use first family found
        }
      }
    }

    const approvedCount = approvedPlayers.length;

    if (approvedCount >= 2) {
      // Create or ensure family exists with 2+ approved players
      if (!familyId && tutorCedula) {
        // No family exists, create one
        const tutorName = Array.isArray(player.families)
          ? player.families[0]?.tutor_name || 'Tutor'
          : player.families?.tutor_name || 'Tutor';
        const tutorEmail = Array.isArray(player.families)
          ? player.families[0]?.tutor_email || null
          : player.families?.tutor_email || null;
        const tutorPhone = Array.isArray(player.families)
          ? player.families[0]?.tutor_phone || null
          : (player.families as any)?.tutor_phone || null;

        const { data: newFamily, error: familyError } = await supabase
          .from('families')
          .insert({
            name: `Familia ${tutorName.split(' ')[1] || tutorName}`,
            tutor_name: tutorName,
            tutor_cedula: tutorCedula,
            tutor_email: tutorEmail,
            tutor_phone: tutorPhone,
          })
          .select()
          .single();

        if (!familyError && newFamily) {
          familyId = newFamily.id;
        }
      }

      // Update all approved players to have family_id
      if (familyId) {
        const playerIds = approvedPlayers.map(p => p.id);
        // Also include the current player if not in the list
        if (!playerIds.includes(playerId)) {
          playerIds.push(playerId);
        }
        await supabase
          .from('players')
          .update({ family_id: familyId })
          .in('id', playerIds);
      }
    } else {
      // If less than 2 approved players, remove family_id and delete family if exists
      await supabase
        .from('players')
        .update({ family_id: null })
        .eq('id', playerId);

      if (familyId) {
        // Check if family still has 2+ approved players
        const { data: remainingPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('family_id', familyId)
          .in('status', ['Active', 'Scholarship']);

        if (!remainingPlayers || remainingPlayers.length < 2) {
          // Remove family_id from all players linked to this family
          await supabase
            .from('players')
            .update({ family_id: null })
            .eq('family_id', familyId);

          // Delete the family
          await supabase
            .from('families')
            .delete()
            .eq('id', familyId);
        }
      }
    }

    // Prepare email variables (used for both Active and Scholarship) - define BEFORE conditional blocks
    // CRITICAL: Get tutor email from multiple sources with proper fallback
    const tutorEmailForEmail = tutorEmail || 
                               (Array.isArray(player.families) 
                                 ? player.families[0]?.tutor_email 
                                 : player.families?.tutor_email) ||
                               player.tutor_email || // Also check pending_player fields
                               null;
    const tutorEmailForScholarship = tutorEmailForEmail; // Same email for both types
    
    const tutorNameForEmail = tutorName || 
                              (Array.isArray(player.families)
                                ? player.families[0]?.tutor_name || 'Familia'
                                : player.families?.tutor_name || 'Familia') ||
                              player.tutor_name || // Also check pending_player fields
                              'Familia';
    const tutorNameForScholarship = tutorNameForEmail; // Same name for both types
    const playerName = `${player.first_name} ${player.last_name}`;
    
    console.log('[approvePlayer] Email variables prepared:', {
      tutorEmailForEmail,
      tutorEmailForScholarship,
      tutorNameForEmail,
      playerName,
      sources: {
        fromOptions: tutorEmail,
        fromFamilies: Array.isArray(player.families) 
          ? player.families[0]?.tutor_email 
          : player.families?.tutor_email,
        fromPendingPlayer: player.tutor_email,
      }
    });

    // Register enrollment payment (only for regular approvals)
    if (type === 'Active') {
    // Verify player exists before processing payment
    const { data: verifyPlayer, error: verifyError } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .single();

    if (verifyError || !verifyPlayer) {
      console.error('[approvePlayer] ❌ Player not found when processing payment:', verifyError);
      return { error: `Error: Jugador no encontrado al procesar el pago: ${verifyError?.message || 'Jugador no existe'}` };
    }

    // Si se debe usar un pago existente (PagueloFacil/Yappy ya aprobado)
    if (options?.useExistingPayment && options?.existingPaymentId) {
      console.log('[approvePlayer] Using existing approved payment:', {
        paymentId: options.existingPaymentId,
        playerId,
      });

      // Buscar el pago existente
      const { data: existingPayment, error: paymentFetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', options.existingPaymentId)
        .single();

      if (paymentFetchError || !existingPayment) {
        console.error('[approvePlayer] ❌ Error fetching existing payment:', paymentFetchError);
        return { error: `Error al buscar el pago existente: ${paymentFetchError?.message || 'Pago no encontrado'}` };
      }

      // Verificar que el pago es de enrollment y está aprobado
      if (existingPayment.type !== 'enrollment' || existingPayment.status !== 'Approved') {
        console.error('[approvePlayer] ❌ Invalid payment:', {
          type: existingPayment.type,
          status: existingPayment.status,
        });
        return { error: 'El pago especificado no es válido o no está aprobado' };
      }

      // Vincular el pago al jugador si aún no está vinculado
      if (!existingPayment.player_id || existingPayment.player_id !== playerId) {
        const { error: linkError } = await supabase
          .from('payments')
          .update({ player_id: playerId })
          .eq('id', options.existingPaymentId);

        if (linkError) {
          console.error('[approvePlayer] ❌ Error linking payment to player:', linkError);
          return { error: `Error al vincular el pago al jugador: ${linkError.message}` };
        }

        console.log('[approvePlayer] ✅ Payment linked to player:', {
          paymentId: options.existingPaymentId,
          playerId,
        });
      } else {
        console.log('[approvePlayer] ✅ Payment already linked to player');
      }

      // Continuar con el resto del flujo (enviar emails, etc.) sin crear nuevo pago
      console.log('[approvePlayer] ✅ Using existing payment, skipping payment creation');
      // El pago ya está aprobado y vinculado, continuar con el flujo normal
    } else {
      // Flujo normal: crear o buscar pago existente
      const { data: settings } = await supabase.from('settings').select('*');
      const settingsMap =
        settings?.reduce((acc: Record<string, number>, s: any) => {
          acc[s.key] = parseFloat(s.value);
          return acc;
        }, {}) || {};
      
      // Use custom price if provided, otherwise use default
      const enrollmentFee = options?.customEnrollmentPrice ?? (settingsMap['price_enrollment'] ?? 80);
      const paymentMethod = options?.paymentMethod || 'cash'; // Require payment method
      const paymentProof = options?.paymentProof || null;
      const now = new Date();

      // Build notes with payment details
      let paymentNotes = `Matrícula confirmada al aprobar jugador. Monto: $${enrollmentFee.toFixed(2)}`;
      if (options?.customEnrollmentPrice) {
        paymentNotes += ` (Precio custom)`;
      }
      paymentNotes += `. Método de pago: ${paymentMethod}`;
      if (paymentProof) {
        if (paymentMethod === 'yappy' || paymentMethod === 'paguelofacil') {
          paymentNotes += `. ID Transacción: ${paymentProof}`;
        } else {
          paymentNotes += `. Comprobante: ${paymentProof}`;
        }
      }

      // CRITICAL: Search for existing enrollment payment with player_id = null
    // Look for payments that have this pending_player_id in the notes
    // The notes format is: "Matrícula para X jugador(es). Tutor: Y. Pending Player IDs: uuid1, uuid2, ..."
    console.log('[approvePlayer] Searching for existing enrollment payment for pending_player_id:', playerId);
    
    // First, get all unlinked enrollment payments
    const { data: allUnlinkedPayments, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .is('player_id', null)
      .or(`type.eq.enrollment,type.eq.Matrícula`);

    if (fetchError) {
      console.error('[approvePlayer] ❌ Error fetching unlinked payments:', fetchError);
      return { error: `Error al buscar pagos existentes: ${fetchError.message}` };
    }

    // Filter in JavaScript to find payments with this pending_player_id in notes
    // This is more reliable than complex Supabase queries
    // IMPORTANT: For cash/ACH payments, we need to be VERY strict to avoid linking wrong payments
    const existingPayments = (allUnlinkedPayments || []).filter((payment: any) => {
      if (!payment.notes) return false;
      const notes = payment.notes.toLowerCase();
      const playerIdLower = playerId.toLowerCase();
      
      // Check if the playerId appears in the notes (various formats)
      // Support: "Pending Player IDs: uuid", "pending player ids:uuid", "pending player ids: uuid"
      // Also check if UUID appears anywhere in notes (for flexibility)
      const hasPlayerId = notes.includes(playerIdLower) || 
             notes.includes(`pending player ids: ${playerIdLower}`) ||
             notes.includes(`pending player ids:${playerIdLower}`) ||
             notes.includes(`pending player ids: ${playerIdLower},`) ||
             notes.includes(`pending player ids:${playerIdLower},`) ||
             notes.includes(`, ${playerIdLower}`) ||
             notes.includes(`,${playerIdLower}`);
      
      if (!hasPlayerId) {
        // If no direct UUID match, try to match by tutor name and date (fallback)
        // This helps catch payments where UUIDs weren't properly formatted
        const tutorName = player.families?.tutor_name || 
                         (Array.isArray(player.families) ? player.families[0]?.tutor_name : null);
        
        if (tutorName) {
          const tutorNameLower = tutorName.toLowerCase();
          const hasTutorName = notes.includes(`tutor: ${tutorNameLower}`) ||
                              notes.includes(`tutor:${tutorNameLower}`);
          
          if (hasTutorName) {
            // Check date proximity (within 7 days)
            const paymentDate = new Date(payment.payment_date);
            const daysDiff = Math.abs((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 7) {
              // Check amount match
              const amountDiff = Math.abs(parseFloat(payment.amount) - enrollmentFee);
              if (amountDiff <= 1) {
                console.log('[approvePlayer] Found payment by tutor name and date match:', {
                  paymentId: payment.id,
                  tutorName,
                  daysDiff,
                  amountDiff
                });
                return true;
              }
            }
          }
        }
        
        return false;
      }
      
      // For payments with UUID match, validate additional criteria:
      // 1. Amount must match (within $1 tolerance for rounding)
      const amountDiff = Math.abs(parseFloat(payment.amount) - enrollmentFee);
      if (amountDiff > 1) {
        console.log('[approvePlayer] Payment amount mismatch:', {
          paymentId: payment.id,
          paymentAmount: payment.amount,
          enrollmentFee,
          diff: amountDiff
        });
        return false;
      }
      
      // 2. Payment date should be recent (within last 60 days for enrollment payments)
      const paymentDate = new Date(payment.payment_date);
      const daysDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 60) {
        console.log('[approvePlayer] Payment too old:', {
          paymentId: payment.id,
          paymentDate: payment.payment_date,
          daysDiff
        });
        return false;
      }
      
      // 3. For cash/ACH, method should match if available (but be flexible)
      if (paymentMethod === 'cash' || paymentMethod === 'ach') {
        // Allow 'other' as a match for flexibility
        if (payment.method && 
            payment.method !== paymentMethod && 
            payment.method !== 'other' &&
            payment.method !== 'transfer') { // transfer is similar to ACH
          console.log('[approvePlayer] Payment method mismatch:', {
            paymentId: payment.id,
            paymentMethod: payment.method,
            expectedMethod: paymentMethod
          });
          // Don't return false here - UUID match is strong enough
        }
      }
      
      return true;
    });

    console.log('[approvePlayer] Search results:', {
      totalUnlinked: allUnlinkedPayments?.length || 0,
      foundPayments: existingPayments?.length || 0,
      payments: existingPayments?.map((p: any) => ({ 
        id: p.id, 
        amount: p.amount, 
        notes: p.notes?.substring(0, 100) 
      }))
    });

    let paymentUpdated = false;
    let paymentCreated = false;
    let finalPayment: any = null;

    // If existing payment found, update it
    // IMPORTANT: For cash/ACH, if no exact match found, always create new payment
    if (existingPayments && existingPayments.length > 0 && (paymentMethod !== 'cash' && paymentMethod !== 'ach')) {
      const existingPayment = existingPayments[0]; // Use first match
      console.log('[approvePlayer] ✅ Found existing enrollment payment:', {
        paymentId: existingPayment.id,
        amount: existingPayment.amount,
        method: existingPayment.method,
        status: existingPayment.status,
      });

      // Build updated notes
      let updatedNotes = `Matrícula confirmada al aprobar jugador. Monto: $${enrollmentFee.toFixed(2)}`;
      if (options?.customEnrollmentPrice) {
        updatedNotes += ` (Precio custom)`;
      }
      updatedNotes += `. Método de pago: ${paymentMethod}`;
      if (paymentProof) {
        if (paymentMethod === 'yappy' || paymentMethod === 'paguelofacil') {
          updatedNotes += `. ID Transacción: ${paymentProof}`;
        } else {
          updatedNotes += `. Comprobante: ${paymentProof}`;
        }
      }

      const updateData: any = {
        player_id: playerId,
        status: 'Approved',
        notes: updatedNotes,
      };

      // Update method if provided and different
      if (paymentMethod && existingPayment.method !== paymentMethod) {
        updateData.method = paymentMethod;
      }

      // Update amount if custom price was provided
      if (options?.customEnrollmentPrice && existingPayment.amount !== enrollmentFee) {
        updateData.amount = enrollmentFee;
      }

      // Add proof_url if it's a URL (for transfer method)
      // Note: cash/ACH payments are handled in the else block below
      if (paymentProof && paymentMethod === 'transfer') {
        updateData.proof_url = paymentProof;
      }

      console.log('[approvePlayer] Updating existing payment:', {
        paymentId: existingPayment.id,
        updateData,
      });

      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', existingPayment.id)
        .select()
        .single();

      if (updateError) {
        console.error('[approvePlayer] ❌ CRITICAL: Error updating enrollment payment:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        return { error: `Error al actualizar el pago de matrícula: ${updateError.message}. La aprobación ha sido cancelada.` };
      }

      paymentUpdated = true;
      finalPayment = updatedPayment;
      console.log('[approvePlayer] ✅ Enrollment payment updated successfully:', {
        paymentId: updatedPayment?.id,
        playerId: updatedPayment?.player_id,
        amount: updatedPayment?.amount,
        status: updatedPayment?.status,
        type: updatedPayment?.type,
        method: updatedPayment?.method,
        payment_date: updatedPayment?.payment_date,
      });
      
      // CRITICAL: Verify payment was updated correctly by querying it back
      const { data: verifyPayment, error: verifyError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', updatedPayment.id)
        .single();
      
      if (verifyError || !verifyPayment) {
        console.error('[approvePlayer] ❌ CRITICAL: Payment verification failed:', {
          paymentId: updatedPayment.id,
          error: verifyError,
        });
      } else {
        console.log('[approvePlayer] ✅ Payment verified in database:', {
          paymentId: verifyPayment.id,
          playerId: verifyPayment.player_id,
          verified: verifyPayment.player_id === playerId,
        });
      }
    } else {
      // No existing payment found OR cash/ACH method - ALWAYS create new one
      // This handles cases where:
      // 1. Payment was not created during enrollment (manual methods like ACH/Transferencia)
      // 2. Payment was created but doesn't have the pending_player_id in notes
      // 3. Payment was deleted or never existed
      // 4. For cash/ACH, we always create new to ensure immediate visibility
      const reason = (paymentMethod === 'cash' || paymentMethod === 'ach') 
        ? 'Creating new payment for cash/ACH to ensure immediate visibility'
        : 'No existing payment found (normal for manual payment methods)';
      console.log(`[approvePlayer] ⚠️ ${reason}`);

      const paymentData: any = {
        player_id: playerId,
        amount: enrollmentFee,
        type: 'enrollment', // Use 'type' not 'payment_type'
        method: paymentMethod, // Use 'method' not 'payment_method'
        payment_date: now.toISOString().split('T')[0],
        notes: paymentNotes,
        status: 'Approved', // Ensure payment is marked as approved
      };

      // Add proof_url if it's a URL (for cash/transfer/ach), or store transaction ID in notes
      if (paymentProof) {
        if (paymentMethod === 'cash' || paymentMethod === 'transfer' || paymentMethod === 'ach') {
          paymentData.proof_url = paymentProof;
        }
        // For yappy/paguelofacil, transaction ID is already in notes
      }

      console.log('[approvePlayer] Creating new enrollment payment:', {
        playerId,
        amount: enrollmentFee,
        paymentMethod,
        paymentData,
      });

      const { data: createdPayment, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('[approvePlayer] ❌ CRITICAL: Error creating enrollment payment:', {
          error: paymentError,
          code: paymentError.code,
          message: paymentError.message,
          details: paymentError.details,
          hint: paymentError.hint,
        });
        return { error: `Error al crear el pago de matrícula: ${paymentError.message}. La aprobación ha sido cancelada.` };
      }

      paymentCreated = true;
      finalPayment = createdPayment;
      console.log('[approvePlayer] ✅ Enrollment payment created successfully:', {
        paymentId: createdPayment?.id,
        playerId: createdPayment?.player_id,
        amount: createdPayment?.amount,
        status: createdPayment?.status,
        type: createdPayment?.type,
        method: createdPayment?.method,
        payment_date: createdPayment?.payment_date,
      });
      
      // CRITICAL: Verify payment was created correctly by querying it back
      const { data: verifyPayment, error: verifyError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', createdPayment.id)
        .single();
      
      if (verifyError || !verifyPayment) {
        console.error('[approvePlayer] ❌ CRITICAL: Payment verification failed:', {
          paymentId: createdPayment.id,
          error: verifyError,
        });
      } else {
        console.log('[approvePlayer] ✅ Payment verified in database:', {
          paymentId: verifyPayment.id,
          playerId: verifyPayment.player_id,
          verified: verifyPayment.player_id === playerId,
        });
      }

      // CRITICAL: If payment processing failed, return error (should not happen due to checks above)
      if (!paymentUpdated && !paymentCreated) {
        console.error('[approvePlayer] ❌ CRITICAL: Payment was neither updated nor created');
        return { error: 'Error crítico: No se pudo procesar el pago de matrícula. La aprobación ha sido cancelada.' };
      }
    } // Cerrar el bloque else del flujo normal de creación de pago

    // Post-approval: Update pre-enrollment emails to link them to the approved player
    // This ensures emails sent during enrollment appear in the player's email history
    try {
      console.log('[approvePlayer] 📧 Updating pre-enrollment emails to link to approved player...');
      
      // Fetch all pre-enrollment emails and filter in JavaScript
      // This is more reliable than complex JSONB queries
      const { data: allPreEnrollmentEmails, error: emailFetchError } = await supabase
        .from('email_queue')
        .select('id, metadata')
        .eq('metadata->>email_type', 'pre_enrollment');
      
      if (!emailFetchError && allPreEnrollmentEmails && allPreEnrollmentEmails.length > 0) {
        const matchingEmails = allPreEnrollmentEmails.filter((email: any) => {
          const metadata = email.metadata || {};
          const pendingPlayerIds = metadata.pending_player_ids;
          
          // Check if playerId is in pending_player_ids
          if (Array.isArray(pendingPlayerIds)) {
            return pendingPlayerIds.includes(playerId);
          } else if (typeof pendingPlayerIds === 'string') {
            // Handle comma-separated string format
            const ids = pendingPlayerIds.split(',').map(id => id.trim());
            return ids.includes(playerId);
          }
          
          return false;
        });
        
        if (matchingEmails.length > 0) {
          for (const email of matchingEmails) {
            const metadata = email.metadata || {};
            const updatedMetadata = {
              ...metadata,
              player_id: playerId, // Add player_id to metadata
              // Keep pending_player_ids for reference
            };
            
            const { error: updateError } = await supabase
              .from('email_queue')
              .update({ metadata: updatedMetadata })
              .eq('id', email.id);
            
            if (updateError) {
              console.error('[approvePlayer] ⚠️ Error updating pre-enrollment email:', {
                emailId: email.id,
                error: updateError,
              });
            } else {
              console.log('[approvePlayer] ✅ Updated pre-enrollment email metadata:', {
                emailId: email.id,
                playerId,
              });
            }
          }
        } else {
          console.log('[approvePlayer] No pre-enrollment emails found for player:', playerId);
        }
      }
    } catch (emailLinkError) {
      console.error('[approvePlayer] ⚠️ Error linking pre-enrollment emails (non-critical):', emailLinkError);
    }

    // Post-approval: Try to link any orphaned payments that might belong to this player
    // This helps catch payments created by callbacks before the player was approved
    try {
      console.log('[approvePlayer] 🔍 Searching for orphaned payments to link...');
      const { data: orphanedPayments, error: orphanError } = await supabase
        .from('payments')
        .select('*')
        .is('player_id', null)
        .or(`type.eq.enrollment,type.eq.Matrícula`)
        .order('payment_date', { ascending: false })
        .limit(10); // Only check recent payments
      
      if (!orphanError && orphanedPayments && orphanedPayments.length > 0) {
        // Get player info for matching
        const playerName = `${player.first_name} ${player.last_name}`.toLowerCase();
        
        for (const orphanedPayment of orphanedPayments) {
          // Skip if we just created/updated this payment
          if (finalPayment && orphanedPayment.id === finalPayment.id) continue;
          
          const notes = (orphanedPayment.notes || '').toLowerCase();
          const paymentAmount = parseFloat(orphanedPayment.amount);
          
          // Check multiple criteria for matching
          const hasPlayerId = notes.includes(playerId.toLowerCase());
          const hasPlayerName = playerName.split(' ').some(name => name.length > 2 && notes.includes(name));
          const amountMatches = Math.abs(paymentAmount - enrollmentFee) <= 1;
          const isRecent = orphanedPayment.payment_date && 
            (new Date(orphanedPayment.payment_date).getTime() > (now.getTime() - 30 * 24 * 60 * 60 * 1000));
          
          // Link if we have strong evidence (playerId in notes OR name + amount + recent)
          if ((hasPlayerId || (hasPlayerName && amountMatches && isRecent)) && !orphanedPayment.player_id) {
            console.log('[approvePlayer] 🔗 Linking orphaned payment:', {
              paymentId: orphanedPayment.id,
              amount: orphanedPayment.amount,
              method: orphanedPayment.method,
              reason: hasPlayerId ? 'playerId in notes' : 'name + amount + date match'
            });
            
            await supabase
              .from('payments')
              .update({
                player_id: playerId,
                status: 'Approved'
              })
              .eq('id', orphanedPayment.id);
          }
        }
      }
    } catch (linkError) {
      // Don't fail approval if linking orphaned payments fails
      console.error('[approvePlayer] ⚠️ Error linking orphaned payments (non-critical):', linkError);
    }

    // Revalidate payment-related paths - CRITICAL for cash/ACH payments to show immediately
    // Use both formats to ensure Next.js revalidates correctly
    console.log('[approvePlayer] Revalidating paths after payment creation/update...');
    revalidatePath('/dashboard/players');
    revalidatePath('/dashboard/players/[id]', 'page');
    revalidatePath(`/dashboard/players/${playerId}`);
    revalidatePath(`/dashboard/players/${playerId}`, 'page');
    revalidatePath('/dashboard/families');
    revalidatePath('/dashboard/finances');
    revalidatePath('/dashboard/finance');
    revalidatePath('/dashboard/finances/transactions');
    console.log('[approvePlayer] Paths revalidated for player:', playerId);
    
    // Calculate monthly fee for email (only for Active type)
    let monthlyFee = settingsMap['price_monthly'] || 130;
    
    // Check for custom fee
    if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
      monthlyFee = player.custom_monthly_fee;
    } else {
      // Check if part of family with 2+ players
      const familyFee = settingsMap['price_monthly_family'] || 110.50;
      const familyIdForFee = Array.isArray(player.families) 
        ? player.families[0]?.id 
        : player.families?.id;
      
      if (familyIdForFee) {
        const { data: familyPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('family_id', familyIdForFee)
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
    // Use the tutor data we already obtained (from family or pendingPlayer)

    if (tutorEmailForEmail && tutorEmailForEmail.trim() !== '') {
      console.log('[approvePlayer] Sending player_accepted email to:', {
        email: tutorEmailForEmail,
        tutorName: tutorNameForEmail,
        playerName: playerName,
        monthlyFee: monthlyFee.toFixed(2),
        playerId: insertedPlayer?.id || playerId,
        familyId: insertedPlayer?.family_id || familyId || null,
      });
      
      try {
        const emailResult = await sendEmailImmediately(
          'player_accepted', 
          tutorEmailForEmail.trim(), 
          {
            tutorName: tutorNameForEmail,
            playerNames: playerName,
            monthlyFee: monthlyFee.toFixed(2),
            scholarshipStatus: '',
            scholarshipMessage: '',
            scholarshipIcon: '🎉',
            scholarshipColor: '#059669',
            scholarshipBg: '#d1fae5',
            scholarshipBorder: '#6ee7b7',
            monthlyFeeSection: `<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;"><div style="color: #0369a1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Mensualidad</div><div style="color: #0c4a6e; font-size: 32px; font-weight: 800; margin: 5px 0;">$${monthlyFee.toFixed(2)}</div><p style="color: #64748b; font-size: 14px; margin-top: 5px;">Este monto se generará automáticamente el día 1 de cada mes</p></div>`,
            paymentReminder: '<li>Asegúrate de completar el pago mensual antes del día 5 de cada mes</li>',
          },
          {
            player_id: insertedPlayer?.id || playerId,
            family_id: insertedPlayer?.family_id || familyId || null,
            email_type: 'player_accepted',
            approval_type: 'Active',
          }
        );
        
        if (emailResult?.error) {
          console.error('[approvePlayer] ❌ Error sending player_accepted email:', {
            error: emailResult.error,
            details: emailResult.details,
            email: tutorEmailForEmail,
            playerId: insertedPlayer?.id || playerId,
          });
          // Log error but don't fail approval - email is not critical for approval process
        } else {
          console.log('[approvePlayer] ✅ player_accepted email sent successfully:', {
            email: tutorEmailForEmail,
            messageId: emailResult?.messageId,
            emailQueueId: emailResult?.emailQueueId,
            playerId: insertedPlayer?.id || playerId,
          });
        }
      } catch (emailError: any) {
        console.error('[approvePlayer] ❌ Exception sending acceptance email:', {
          error: emailError,
          message: emailError?.message,
          stack: emailError?.stack,
          email: tutorEmailForEmail,
          playerId: insertedPlayer?.id || playerId,
        });
        // Don't fail the approval if email fails
      }
    } else {
      console.warn('[approvePlayer] ⚠️ No tutor email found, skipping player_accepted email:', {
        playerId,
        tutorEmail: tutorEmail,
        tutorEmailFromPending: player.tutor_email,
        familyEmail: familyData?.tutor_email,
        tutorEmailForEmail,
        allSources: {
          fromOptions: tutorEmail,
          fromFamilies: Array.isArray(player.families) 
            ? player.families[0]?.tutor_email 
            : player.families?.tutor_email,
          fromPendingPlayer: player.tutor_email,
        }
      });
    }
    } // Cerrar el bloque if (type === 'Active')
  } else if (type === 'Scholarship') {
    // Send acceptance email for scholarship players (indicating BECADO)
    // Use the tutor data we already obtained (from family or pendingPlayer)

    if (tutorEmailForScholarship && tutorEmailForScholarship.trim() !== '') {
      console.log('[approvePlayer] Sending player_accepted email (Scholarship) to:', {
        email: tutorEmailForScholarship,
        tutorName: tutorNameForScholarship,
        playerName: playerName,
        playerId: insertedPlayer?.id || playerId,
        familyId: insertedPlayer?.family_id || familyId || null,
      });
      
      try {
        const emailResult = await sendEmailImmediately(
          'player_accepted', 
          tutorEmailForScholarship.trim(), 
          {
            tutorName: tutorNameForScholarship,
            playerNames: playerName,
            monthlyFee: '0.00', // Scholarship players don't pay
            scholarshipStatus: ' - BECADO',
            scholarshipMessage: '<br><strong style="color: #2563eb; font-size: 18px;">🎓 Tu jugador ha sido aprobado como BECADO</strong>',
            scholarshipIcon: '🎓',
            scholarshipColor: '#2563eb',
            scholarshipBg: '#dbeafe',
            scholarshipBorder: '#93c5fd',
            monthlyFeeSection: '<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;"><div style="color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Estado de Beca</div><div style="color: #1e3a8a; font-size: 24px; font-weight: 800; margin: 5px 0;">🎓 BECADO</div><p style="color: #64748b; font-size: 14px; margin-top: 5px;">Tu jugador tiene una beca completa. No se generarán cargos mensuales.</p></div>',
            paymentReminder: '', // No payment reminder for scholarships
          },
          {
            player_id: insertedPlayer?.id || playerId,
            family_id: insertedPlayer?.family_id || familyId || null,
            email_type: 'player_accepted',
            approval_type: 'Scholarship',
          }
        );
        
        if (emailResult?.error) {
          console.error('[approvePlayer] ❌ Error sending player_accepted email (Scholarship):', {
            error: emailResult.error,
            details: emailResult.details,
            email: tutorEmailForScholarship,
            playerId: insertedPlayer?.id || playerId,
          });
        } else {
          console.log('[approvePlayer] ✅ player_accepted email (Scholarship) sent successfully:', {
            email: tutorEmailForScholarship,
            messageId: emailResult?.messageId,
            emailQueueId: emailResult?.emailQueueId,
            playerId: insertedPlayer?.id || playerId,
          });
        }
      } catch (emailError: any) {
        console.error('[approvePlayer] ❌ Exception sending scholarship acceptance email:', {
          error: emailError,
          message: emailError?.message,
          stack: emailError?.stack,
          email: tutorEmailForScholarship,
          playerId: insertedPlayer?.id || playerId,
        });
        // Don't fail the approval if email fails
      }
    } else {
      console.warn('[approvePlayer] ⚠️ No tutor email found, skipping player_accepted email (Scholarship):', {
        playerId,
        tutorEmail: tutorEmail,
        tutorEmailFromPending: player.tutor_email,
        familyEmail: familyData?.tutor_email,
        tutorEmailForScholarship,
        allSources: {
          fromOptions: tutorEmail,
          fromFamilies: Array.isArray(player.families) 
            ? player.families[0]?.tutor_email 
            : player.families?.tutor_email,
          fromPendingPlayer: player.tutor_email,
        }
      });
    }
  }

  // Revalidate all relevant paths to ensure UI updates
  revalidatePath('/dashboard/approvals');
  revalidatePath('/dashboard/players');
  revalidatePath('/dashboard/finances');
  revalidatePath('/dashboard/finance');
  
  console.log('[approvePlayer] ✅ Approval completed successfully:', {
    playerId,
    type,
    deletedFromPending: true,
    emailSent: !!tutorEmailForEmail || !!tutorEmailForScholarship,
  });
  
  return { 
    success: true,
    message: type === 'Active' 
      ? `Jugador aprobado como Normal. ${tutorEmailForEmail ? 'Correo enviado.' : '⚠️ No se pudo enviar correo (email no encontrado).'}`
      : `Jugador aprobado como Becado. ${tutorEmailForScholarship ? 'Correo enviado.' : '⚠️ No se pudo enviar correo (email no encontrado).'}`,
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
