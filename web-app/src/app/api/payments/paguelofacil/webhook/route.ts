import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { createPayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendPaymentConfirmationEmail } from '@/lib/actions/payment-confirmation';

/**
 * Helper function to link enrollment payment to pending players
 * Searches for recent pending players without payments and links them based on amount matching
 */
async function linkEnrollmentPaymentToPendingPlayers(
  supabase: any,
  paymentId: string,
  paymentAmount: number,
  operationNumber?: string
): Promise<string[]> {
  try {
    console.log('[PagueloFacil] Linking payment to pending players...', {
      paymentId,
      paymentAmount,
      operationNumber,
    });

    // Get enrollment price from settings
    const { data: priceSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'price_enrollment')
      .single();

    const enrollmentPrice = priceSetting ? Number(priceSetting.value) : 80;
    console.log('[PagueloFacil] Enrollment price:', enrollmentPrice);

    // Calculate expected number of players based on payment amount
    const expectedPlayerCount = Math.round(paymentAmount / enrollmentPrice);
    console.log('[PagueloFacil] Expected player count:', expectedPlayerCount);

    // Search for recent pending players (last 2 hours) without payments
    const cutoffDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentPlayers, error: playersError } = await supabase
      .from('pending_players')
      .select('id, first_name, last_name, family_id, created_at')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false })
      .limit(20);

    if (playersError) {
      console.error('[PagueloFacil] Error fetching pending players:', playersError);
      return [];
    }

    if (!recentPlayers || recentPlayers.length === 0) {
      console.log('[PagueloFacil] No recent pending players found');
      return [];
    }

    // Group players by family to calculate total enrollment amount per family
    const playersByFamily = new Map<string, any[]>();
    const individualPlayers: any[] = [];

    for (const player of recentPlayers) {
      if (player.family_id) {
        if (!playersByFamily.has(player.family_id)) {
          playersByFamily.set(player.family_id, []);
        }
        playersByFamily.get(player.family_id)!.push(player);
      } else {
        individualPlayers.push(player);
      }
    }

    // Find best match: family or individual players that match the payment amount
    let matchedPlayerIds: string[] = [];

    // First, try to match by family (if payment amount matches family enrollment)
    for (const [familyId, familyPlayers] of playersByFamily.entries()) {
      const familyEnrollmentAmount = familyPlayers.length * enrollmentPrice;
      const amountDifference = Math.abs(familyEnrollmentAmount - paymentAmount);

      // Allow $1 tolerance for rounding
      if (amountDifference <= 1) {
        // Check if this family already has a payment
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('id, notes')
          .eq('type', 'enrollment')
          .or(`notes.ilike.%Pending Player IDs: ${familyPlayers[0].id}%,notes.ilike.%, ${familyPlayers[0].id}%`);

        if (!existingPayments || existingPayments.length === 0) {
          matchedPlayerIds = familyPlayers.map(p => p.id);
          console.log('[PagueloFacil] Matched payment to family:', {
            familyId,
            playerCount: familyPlayers.length,
            expectedAmount: familyEnrollmentAmount,
            actualAmount: paymentAmount,
          });
          break;
        }
      }
    }

    // If no family match, try individual players
    if (matchedPlayerIds.length === 0) {
      // Try to match individual players
      for (const player of individualPlayers) {
        const individualEnrollmentAmount = enrollmentPrice;
        const amountDifference = Math.abs(individualEnrollmentAmount - paymentAmount);

        if (amountDifference <= 1) {
          // Check if this player already has a payment
          const { data: existingPayments } = await supabase
            .from('payments')
            .select('id, notes')
            .eq('type', 'enrollment')
            .or(`notes.ilike.%Pending Player IDs: ${player.id}%,notes.ilike.%, ${player.id}%`);

          if (!existingPayments || existingPayments.length === 0) {
            matchedPlayerIds = [player.id];
            console.log('[PagueloFacil] Matched payment to individual player:', {
              playerId: player.id,
              playerName: `${player.first_name} ${player.last_name}`,
              expectedAmount: individualEnrollmentAmount,
              actualAmount: paymentAmount,
            });
            break;
          }
        }
      }
    }

    // If still no match, try to match by expected player count (most recent players without payments)
    if (matchedPlayerIds.length === 0 && expectedPlayerCount > 0) {
      const candidates: any[] = [];
      
      // Collect candidates without payments
      for (const player of recentPlayers) {
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('id, notes')
          .eq('type', 'enrollment')
          .or(`notes.ilike.%Pending Player IDs: ${player.id}%,notes.ilike.%, ${player.id}%`);

        if (!existingPayments || existingPayments.length === 0) {
          candidates.push(player);
        }
      }

      // Take the most recent players matching the expected count
      if (candidates.length >= expectedPlayerCount) {
        matchedPlayerIds = candidates.slice(0, expectedPlayerCount).map(p => p.id);
        console.log('[PagueloFacil] Matched payment to most recent players by count:', {
          playerCount: expectedPlayerCount,
          matchedIds: matchedPlayerIds,
        });
      }
    }

    // Update payment notes with matched player IDs
    if (matchedPlayerIds.length > 0) {
      const { data: currentPayment } = await supabase
        .from('payments')
        .select('notes')
        .eq('id', paymentId)
        .single();

      const currentNotes = currentPayment?.notes || '';
      const playerIdsString = matchedPlayerIds.join(', ');
      const updatedNotes = `${currentNotes}\n\nVinculado automáticamente a jugador(es) pendiente(s): ${playerIdsString}. Pending Player IDs: ${playerIdsString}`;

      const { error: updateError } = await supabase
        .from('payments')
        .update({ notes: updatedNotes })
        .eq('id', paymentId);

      if (updateError) {
        console.error('[PagueloFacil] Error updating payment notes:', updateError);
      } else {
        console.log('[PagueloFacil] ✅ Payment linked to pending players:', matchedPlayerIds);
      }
    } else {
      console.log('[PagueloFacil] ⚠️ Could not find matching pending players for payment');
    }

    return matchedPlayerIds;
  } catch (error: any) {
    console.error('[PagueloFacil] Error in linkEnrollmentPaymentToPendingPlayers:', error);
    return [];
  }
}

/**
 * POST /api/payments/paguelofacil/webhook
 * Handles webhook notifications from Paguelo Fácil
 * Webhooks are more reliable than callbacks because PagueloFacil sends them directly
 * 
 * According to PagueloFacil documentation, webhooks are sent as POST requests with JSON body
 * containing detailed transaction information including authStatus and status fields.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('[PagueloFacil Webhook] ========== WEBHOOK RECEIVED ==========');
    console.log('[PagueloFacil Webhook] Timestamp:', new Date().toISOString());
    console.log('[PagueloFacil Webhook] Request URL:', request.url);
    console.log('[PagueloFacil Webhook] Headers:', Object.fromEntries(request.headers.entries()));

    // Parse webhook body (JSON format according to documentation)
    let webhookData: any;
    try {
      const bodyText = await request.text();
      console.log('[PagueloFacil Webhook] Raw body (first 1000 chars):', bodyText.substring(0, 1000));
      webhookData = JSON.parse(bodyText);
      console.log('[PagueloFacil Webhook] Parsed webhook data:', JSON.stringify(webhookData, null, 2));
    } catch (parseError: any) {
      console.error('[PagueloFacil Webhook] ❌ Error parsing webhook body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in webhook body', details: parseError.message },
        { status: 400 }
      );
    }

    // Extract transaction information from webhook
    // According to documentation, webhook includes: codOper, status, authStatus, totalPay, etc.
    const codOper = webhookData.codOper || webhookData.Oper || '';
    const status = webhookData.status; // 1 = approved, 0 = declined
    const authStatus = webhookData.authStatus; // ISO code, "00" = approved
    const totalPay = webhookData.totalPay || webhookData.TotalPagado || '0';
    const requestPayAmount = webhookData.requestPayAmount || webhookData.CMTN || '0';
    const description = webhookData.description || webhookData.CDSC || '';
    const operationType = webhookData.operationType || '';
    const messageSys = webhookData.messageSys || '';
    const date = webhookData.date || '';
    const email = webhookData.email || '';
    const userName = webhookData.userName || webhookData.Usuario || '';
    const cardType = webhookData.type || webhookData.Tipo || ''; // VISA, MC, etc.
    const relatedTx = webhookData.relatedTx || '';

    console.log('[PagueloFacil Webhook] Extracted transaction data:', {
      codOper,
      status,
      authStatus,
      totalPay,
      requestPayAmount,
      description,
      operationType,
      messageSys,
      date,
      email,
      userName,
      cardType,
      relatedTx,
    });

    // Determine if transaction is approved
    // According to documentation:
    // - status: 1 = approved, 0 = declined
    // - authStatus: "00" = approved (ISO code from card issuer)
    // - totalPay > 0 indicates approved transaction
    // - messageSys: "Aprobada" indicates approved
    const statusApproved = status === 1;
    const authStatusApproved = authStatus === '00';
    const totalPayApproved = parseFloat(totalPay) > 0;
    const messageApproved = messageSys?.toLowerCase().includes('aprobada') || messageSys?.toLowerCase().includes('approved');
    
    // Check for explicit denial
    const isDenied = status === 0 || 
                     (authStatus && authStatus !== '00' && authStatus !== '') ||
                     messageSys?.toLowerCase().includes('denegada') ||
                     messageSys?.toLowerCase().includes('denied');
    
    const isApproved = (statusApproved || authStatusApproved || totalPayApproved || messageApproved) && !isDenied;
    
    console.log('[PagueloFacil Webhook] Transaction approval check:', {
      status,
      statusApproved,
      authStatus,
      authStatusApproved,
      totalPay,
      totalPayParsed: parseFloat(totalPay),
      totalPayApproved,
      messageSys,
      messageApproved,
      isDenied,
      isApproved,
      operationType,
    });
    
    // Check for 3DS authentication errors
    const is3DSError = messageSys?.toLowerCase().includes('authentication') || 
                      messageSys?.toLowerCase().includes('3ds') ||
                      messageSys?.toLowerCase().includes('issuer is rejecting');
    
    if (is3DSError) {
      console.warn('[PagueloFacil Webhook] ⚠️ 3DS Authentication Error detected:', {
        messageSys,
        authStatus,
        status,
        note: 'This may indicate a problem with 3D Secure authentication. Check if you are using the correct test cards for sandbox environment.',
        suggestion: 'Verify that you are using sandbox test cards and that 3DS is properly configured in your PagueloFacil merchant account.',
      });
    }

    // Extract custom parameters from webhook
    // PagueloFacil returns PARM_1, PARM_2, etc. in the webhook
    // We need to extract these to get playerId, paymentType, etc.
    const parm1 = webhookData.PARM_1 || '';
    const parm2 = webhookData.PARM_2 || '';
    const parm3 = webhookData.PARM_3 || '';
    const parm4 = webhookData.PARM_4 || '';
    const parm5 = webhookData.PARM_5 || '';
    const parm6 = webhookData.PARM_6 || '';

    // Extract custom params (same logic as callback)
    let paymentType = parm4 || '';
    let playerId = parm3 || '';
    let amount = parm5 || totalPay || requestPayAmount;
    let monthYear = parm6 || '';
    let type = parm2 || 'payment'; // 'enrollment' | 'payment'

    // Try to extract playerId from orderId if it follows the pattern "payment-{playerId}-{timestamp}"
    if (!playerId && parm1) {
      const orderIdMatch = parm1.match(/^payment-([^-]+)-/);
      if (orderIdMatch) {
        playerId = orderIdMatch[1];
      }
    }

    console.log('[PagueloFacil Webhook] Extracted custom params:', {
      type,
      playerId,
      paymentType,
      amount,
      monthYear,
      fromPARM: {
        PARM_1: parm1,
        PARM_2: parm2,
        PARM_3: parm3,
        PARM_4: parm4,
        PARM_5: parm5,
        PARM_6: parm6,
      },
    });

    // Handle enrollment payment confirmation
    if (isApproved && type === 'enrollment' && amount) {
      try {
        console.log('[PagueloFacil Webhook] Handling enrollment payment confirmation...');
        const supabase = await createClient();
        
        const paymentAmount = parseFloat(amount);
        const operationNumber = codOper || '';
        const orderId = parm1 || '';
        
        let existingPayment = null;
        
        // 1. Search by operation number in notes
        if (operationNumber) {
          console.log('[PagueloFacil Webhook] Searching for payment by operation number:', operationNumber);
          const { data: paymentsByOper } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'paguelofacil')
            .or(`notes.ilike.%${operationNumber}%,notes.ilike.%${operationNumber.toLowerCase()}%`)
            .order('payment_date', { ascending: false })
            .limit(1);
          
          if (paymentsByOper && paymentsByOper.length > 0) {
            existingPayment = paymentsByOper[0];
            console.log('[PagueloFacil Webhook] Found payment by operation number:', existingPayment.id);
          }
        }
        
        // 2. Search by orderId if not found (orderId is usually in the enrollment form submission)
        if (!existingPayment && orderId) {
          console.log('[PagueloFacil Webhook] Searching for payment by orderId:', orderId);
          // First try exact match in notes
          const { data: paymentsByOrder } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'paguelofacil')
            .or(`notes.ilike.%${orderId}%,notes.ilike.%${orderId.toLowerCase()}%`)
            .order('payment_date', { ascending: false })
            .limit(5);
          
          if (paymentsByOrder && paymentsByOrder.length > 0) {
            // Prefer pending payments over approved ones
            const pendingPayment = paymentsByOrder.find(p => p.status === 'Pending');
            existingPayment = pendingPayment || paymentsByOrder[0];
            console.log('[PagueloFacil Webhook] Found payment by orderId:', existingPayment.id);
          }
        }
        
        // 3. Search by amount (within $1 tolerance) in recent pending payments (last 2 hours)
        if (!existingPayment) {
          console.log('[PagueloFacil Webhook] Searching for payment by amount in recent pending payments:', paymentAmount);
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().split('T')[0];
          const { data: enrollmentPayments } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'paguelofacil')
            .eq('status', 'Pending')
            .gte('payment_date', twoHoursAgo)
            .order('payment_date', { ascending: false })
            .limit(20);
          
          if (enrollmentPayments && enrollmentPayments.length > 0) {
            const matchingPayment = enrollmentPayments.find(p => {
              const paymentAmt = parseFloat(p.amount);
              return Math.abs(paymentAmt - paymentAmount) <= 1;
            });
            
            if (matchingPayment) {
              existingPayment = matchingPayment;
              console.log('[PagueloFacil Webhook] Found payment by amount in recent pending payments:', existingPayment.id);
            }
          }
        }
        
        // 4. If payment exists, update it
        if (existingPayment) {
          console.log('[PagueloFacil Webhook] Updating existing enrollment payment:', existingPayment.id);
          
          // Update payment status to "Approved" and add operation details
          const operationInfo = operationNumber ? `Paguelo Fácil Operación: ${operationNumber}` : 'Paguelo Fácil';
          const updatedNotes = `${existingPayment.notes || ''}\n\n${operationInfo} (Webhook). Confirmado: ${new Date().toISOString()}`;
          
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'Approved',
              notes: updatedNotes,
            })
            .eq('id', existingPayment.id);
          
          if (updateError) {
            console.error('[PagueloFacil Webhook] Error updating enrollment payment:', updateError);
          } else {
            console.log('[PagueloFacil Webhook] ✅ Enrollment payment updated to Approved:', existingPayment.id);
            
            // Send payment confirmation email
            try {
              await sendPaymentConfirmationEmail(existingPayment.id);
            } catch (emailError) {
              console.error('[PagueloFacil Webhook] Error sending payment confirmation email:', emailError);
            }
            
            // Revalidate paths
            revalidatePath('/dashboard/finances');
            revalidatePath('/dashboard/finances/transactions');
            revalidatePath('/dashboard/approvals');
          }
        } else {
          // 5. If payment doesn't exist, create a new one
          console.log('[PagueloFacil Webhook] Payment not found. Creating new enrollment payment...');
          
          const operationInfo = operationNumber ? `Paguelo Fácil Operación: ${operationNumber}` : 'Paguelo Fácil';
          const paymentNotes = `Pago de matrícula procesado con Paguelo Fácil (Webhook).\n${operationInfo}. Monto: $${paymentAmount}. Confirmado: ${new Date().toISOString()}\n\nNota: Este pago se creó automáticamente desde el webhook porque no se encontró un pago pendiente asociado.`;
          
          const { data: newPayment, error: createError } = await supabase
            .from('payments')
            .insert({
              player_id: null,
              amount: paymentAmount,
              type: 'enrollment',
              method: 'paguelofacil',
              payment_date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              status: 'Approved',
              notes: paymentNotes,
            })
            .select()
            .single();
          
          if (createError) {
            console.error('[PagueloFacil Webhook] Error creating enrollment payment:', createError);
          } else {
            console.log('[PagueloFacil Webhook] ✅ New enrollment payment created:', newPayment.id);
            
            // Try to link payment to pending players
            await linkEnrollmentPaymentToPendingPlayers(
              supabase,
              newPayment.id,
              paymentAmount,
              operationNumber
            );
            
            // Revalidate paths
            revalidatePath('/dashboard/finances');
            revalidatePath('/dashboard/finances/transactions');
            revalidatePath('/dashboard/approvals');
          }
        }
      } catch (enrollmentError: any) {
        console.error('[PagueloFacil Webhook] Error handling enrollment payment:', enrollmentError);
        // Don't throw - continue processing
      }
    }

    // If transaction was approved and we have payment details, create payment record
    if (isApproved && type === 'payment' && playerId && amount) {
      try {
        console.log('[PagueloFacil Webhook] Attempting to create payment record...');
        const supabase = await createClient();

        // Verify player exists - check both players and pending_players tables
        let playerFound = false;
        let isPendingPlayer = false;

        // First, check in approved players table
        const { data: player, error: playerError } = await supabase
          .from('players')
          .select('id')
          .eq('id', playerId)
          .single();

        if (player) {
          playerFound = true;
          console.log('[PagueloFacil Webhook] Player found in players table');
        } else {
          // If not found in players, check pending_players
          const { data: pendingPlayer, error: pendingError } = await supabase
            .from('pending_players')
            .select('id')
            .eq('id', playerId)
            .single();

          if (pendingPlayer) {
            playerFound = true;
            isPendingPlayer = true;
            console.log('[PagueloFacil Webhook] Player found in pending_players table');
          } else {
            console.error('[PagueloFacil Webhook] Player not found in either table:', {
              playerError: playerError?.message,
              pendingError: pendingError?.message,
            });
          }
        }

        if (playerFound) {
          console.log('[PagueloFacil Webhook] Player found, creating payment...');

          // Build notes with webhook information
          let paymentNotes = `Pago procesado con Paguelo Fácil (Webhook). Operación: ${codOper || 'N/A'}. Fecha: ${date || 'N/A'}`;
          if (operationType) {
            paymentNotes += `. Tipo de operación: ${operationType}`;
          }
          if (messageSys) {
            paymentNotes += `. Mensaje: ${messageSys}`;
          }

          // If player is pending, add format for later linking
          if (isPendingPlayer) {
            paymentNotes += `. Pending Player IDs: ${playerId}`;
          }

          // Create payment record with Approved status
          let createdPayment;

          if (isPendingPlayer) {
            // If player is pending, insert directly with player_id = null
            const paymentData: any = {
              player_id: null,
              amount: parseFloat(amount),
              type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              method: 'paguelofacil' as const,
              payment_date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              status: 'Approved' as const,
              notes: paymentNotes,
            };

            // Note: month_year column does not exist in payments table, so we don't include it
            
            console.log('[PagueloFacil Webhook] Payment data to create (pending player):', paymentData);

            const { data: insertedPayment, error: insertError } = await supabase
              .from('payments')
              .insert(paymentData)
              .select()
              .single();

            if (insertError) {
              console.error('[PagueloFacil Webhook] Error creating payment for pending player:', insertError);
              throw insertError;
            }
            createdPayment = insertedPayment;
          } else {
            // If player is approved, use createPayment function
            const paymentData: any = {
              player_id: playerId,
              amount: parseFloat(amount),
              type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              method: 'paguelofacil' as const,
              payment_date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              status: 'Approved' as const,
              notes: paymentNotes,
            };

            // Note: month_year column does not exist in payments table, so we don't include it
            // The createPayment function will also remove it if it's present

            console.log('[PagueloFacil Webhook] Payment data to create (approved player):', paymentData);
            createdPayment = await createPayment(paymentData);
          }

          // Verify payment was created correctly
          if (createdPayment?.id) {
            const { data: verifyPayment, error: verifyError } = await supabase
              .from('payments')
              .select('*')
              .eq('id', createdPayment.id)
              .single();

            if (verifyError || !verifyPayment) {
              console.error('[PagueloFacil Webhook] ❌ CRITICAL: Payment verification failed:', {
                paymentId: createdPayment.id,
                error: verifyError,
                createdPayment,
              });
            } else {
              console.log('[PagueloFacil Webhook] ✅ Payment verified in database:', {
                paymentId: verifyPayment.id,
                playerId: verifyPayment.player_id,
                expectedPlayerId: isPendingPlayer ? null : playerId,
                verified: verifyPayment.player_id === (isPendingPlayer ? null : playerId),
                amount: verifyPayment.amount,
                status: verifyPayment.status,
                type: verifyPayment.type,
                method: verifyPayment.method,
              });
            }
          } else {
            console.error('[PagueloFacil Webhook] ❌ CRITICAL: Payment created but no ID returned:', {
              createdPayment,
              playerId,
            });
          }

          // Revalidate all relevant paths to show updated data
          revalidatePath('/dashboard/players');
          revalidatePath(`/dashboard/players/${playerId}`, 'page');
          revalidatePath('/dashboard/families');
          revalidatePath('/dashboard/finances');
          revalidatePath('/dashboard/finances/transactions');

          console.log('[PagueloFacil Webhook] ✅ Payment record created successfully:', {
            paymentId: createdPayment?.id,
            playerId,
            amount,
            oper: codOper,
            isPendingPlayer,
            playerIdLinked: !isPendingPlayer,
          });

          // Send payment confirmation email to tutor
          try {
            const emailResult = await sendPaymentConfirmationEmail({
              playerId: playerId,
              amount: parseFloat(amount),
              paymentType: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              paymentDate: createdPayment?.payment_date || new Date().toISOString().split('T')[0],
              monthYear: monthYear || undefined,
              operationId: codOper || undefined,
            });

            if (emailResult.error) {
              console.error('[PagueloFacil Webhook] ⚠️ Error sending confirmation email:', emailResult.error);
            } else {
              console.log('[PagueloFacil Webhook] ✅ Confirmation email queued successfully');
            }
          } catch (emailError: any) {
            console.error('[PagueloFacil Webhook] ⚠️ Error sending confirmation email:', emailError);
            // Don't fail the payment if email fails
          }
        } else {
          console.error('[PagueloFacil Webhook] ❌ Player not found with ID:', playerId);
        }
      } catch (paymentError: any) {
        console.error('[PagueloFacil Webhook] ❌ Error creating payment record:', {
          error: paymentError,
          message: paymentError?.message,
          stack: paymentError?.stack,
        });
        // Return 500 but don't fail completely - webhook should be idempotent
        return NextResponse.json(
          { error: 'Error processing payment', details: paymentError.message },
          { status: 500 }
        );
      }
    } else {
      // Transaction was denied/failed - do NOT record as a payment
      console.log('[PagueloFacil Webhook] ℹ️ Transaction denied - no payment created (rejections are not real payments):', {
        status,
        authStatus,
        totalPay,
        messageSys,
        type,
        hasPlayerId: !!playerId,
        hasAmount: !!amount,
        note: 'Rejected payments are logged but NOT stored as payments - they are not real payments',
      });
    }

    // Log completion
    const processingTime = Date.now() - startTime;
    console.log('[PagueloFacil Webhook] ✅ Webhook processed successfully:', {
      processingTimeMs: processingTime,
      isApproved,
      codOper,
      timestamp: new Date().toISOString(),
    });

    // Return 200 OK to acknowledge receipt of webhook
    // PagueloFacil expects a 200 response to confirm webhook was received
    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('[PagueloFacil Webhook] ❌ CRITICAL ERROR processing webhook:', {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
    });

    // Return 500 but log the error
    // PagueloFacil may retry webhooks that fail
    return NextResponse.json(
      { error: 'Error processing webhook', details: error.message },
      { status: 500 }
    );
  }
}

