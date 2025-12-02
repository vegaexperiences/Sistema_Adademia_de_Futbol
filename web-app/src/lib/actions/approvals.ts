'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendEmailImmediately } from '@/lib/actions/email-queue';

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

export async function approvePlayer(
  playerId: string, 
  type: 'Active' | 'Scholarship',
  options?: {
    customEnrollmentPrice?: number;
    paymentMethod?: 'cash' | 'transfer' | 'yappy' | 'paguelofacil' | 'ach' | 'other';
    paymentProof?: string; // URL de comprobante o ID de transacción
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
    const tutorEmailForEmail = tutorEmail || (Array.isArray(player.families) 
      ? player.families[0]?.tutor_email 
      : player.families?.tutor_email);
    const tutorEmailForScholarship = tutorEmailForEmail; // Same email for both types
    const tutorNameForEmail = tutorName || (Array.isArray(player.families)
      ? player.families[0]?.tutor_name || 'Familia'
      : player.families?.tutor_name || 'Familia');
    const tutorNameForScholarship = tutorNameForEmail; // Same name for both types
    const playerName = `${player.first_name} ${player.last_name}`;

    // Register enrollment payment (only for regular approvals)
    if (type === 'Active') {
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

    const paymentData: any = {
      player_id: playerId,
      amount: enrollmentFee,
      payment_type: 'enrollment',
      payment_method: paymentMethod,
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

    // Verify player exists before creating payment
    const { data: verifyPlayer, error: verifyError } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .single();

    if (verifyError || !verifyPlayer) {
      console.error('[approvePlayer] ❌ Player not found when creating payment:', verifyError);
      return { error: `Error: Jugador no encontrado al crear el pago: ${verifyError?.message || 'Jugador no existe'}` };
    }

    console.log('[approvePlayer] Creating enrollment payment:', {
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
      console.error('[approvePlayer] ❌ Error creating enrollment payment:', {
        error: paymentError,
        code: paymentError.code,
        message: paymentError.message,
        details: paymentError.details,
        hint: paymentError.hint,
      });
      return { error: `Error al crear el pago de matrícula: ${paymentError.message}` };
    } else {
      console.log('[approvePlayer] ✅ Enrollment payment created successfully:', {
        paymentId: createdPayment?.id,
        playerId: createdPayment?.player_id,
        amount: createdPayment?.amount,
        status: createdPayment?.status,
      });
      // Revalidate payment-related paths
      revalidatePath('/dashboard/families');
      revalidatePath('/dashboard/finances');
      revalidatePath('/dashboard/finance');
      revalidatePath(`/dashboard/players/${playerId}`);
    }
    
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

    if (tutorEmailForEmail) {
      console.log('[approvePlayer] Sending player_accepted email to:', {
        email: tutorEmailForEmail,
        tutorName: tutorNameForEmail,
        playerName: playerName,
        monthlyFee: monthlyFee.toFixed(2),
      });
      
      try {
        const emailResult = await sendEmailImmediately(
          'player_accepted', 
          tutorEmailForEmail, 
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
          });
          // Log error but don't fail approval - email is not critical for approval process
        } else {
          console.log('[approvePlayer] ✅ player_accepted email sent successfully:', {
            email: tutorEmailForEmail,
            messageId: emailResult?.messageId,
          });
        }
      } catch (emailError: any) {
        console.error('[approvePlayer] ❌ Exception sending acceptance email:', {
          error: emailError,
          message: emailError?.message,
          stack: emailError?.stack,
          email: tutorEmailForEmail,
        });
        // Don't fail the approval if email fails
      }
    } else {
      console.warn('[approvePlayer] ⚠️ No tutor email found, skipping player_accepted email:', {
        playerId,
        tutorEmail: tutorEmail,
        familyEmail: familyData?.tutor_email,
      });
    }
  } else if (type === 'Scholarship') {
    // Send acceptance email for scholarship players (indicating BECADO)
    // Use the tutor data we already obtained (from family or pendingPlayer)

    if (tutorEmailForScholarship) {
      console.log('[approvePlayer] Sending player_accepted email (Scholarship) to:', {
        email: tutorEmailForScholarship,
        tutorName: tutorNameForScholarship,
        playerName: playerName,
      });
      
      try {
        const emailResult = await sendEmailImmediately(
          'player_accepted', 
          tutorEmailForScholarship, 
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
          });
        } else {
          console.log('[approvePlayer] ✅ player_accepted email (Scholarship) sent successfully:', {
            email: tutorEmailForScholarship,
            messageId: emailResult?.messageId,
          });
        }
      } catch (emailError: any) {
        console.error('[approvePlayer] ❌ Exception sending scholarship acceptance email:', {
          error: emailError,
          message: emailError?.message,
          stack: emailError?.stack,
          email: tutorEmailForScholarship,
        });
        // Don't fail the approval if email fails
      }
    } else {
      console.warn('[approvePlayer] ⚠️ No tutor email found, skipping player_accepted email (Scholarship):', {
        playerId,
        tutorEmail: tutorEmail,
        familyEmail: familyData?.tutor_email,
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
