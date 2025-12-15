import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { createPayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendPaymentConfirmationEmail } from '@/lib/actions/payment-confirmation';
import { getBaseUrlFromRequest } from '@/lib/utils/get-base-url';
import { createEnrollmentFromPayment } from '@/lib/actions/enrollment';

/**
 * Helper function to create fallback payment when enrollment data is not available
 */
async function createFallbackPayment(
  supabase: any,
  paymentAmount: number,
  operationNumber?: string
) {
  const operationInfo = operationNumber ? `Paguelo Fácil Operación: ${operationNumber}` : 'Paguelo Fácil';
  const paymentNotes = `Pago de matrícula procesado con Paguelo Fácil.\n${operationInfo}. Monto: $${paymentAmount}. Confirmado: ${new Date().toISOString()}\n\nNota: Este pago se creó automáticamente desde el callback porque no se encontró un pago pendiente asociado.`;
  
  const { data: newPayment, error: createError } = await supabase
    .from('payments')
    .insert({
      player_id: null,
      amount: paymentAmount,
      type: 'enrollment',
      method: 'paguelofacil',
      payment_date: new Date().toISOString().split('T')[0],
      status: 'Approved',
      notes: paymentNotes,
    })
    .select()
    .single();
  
  if (createError) {
    console.error('[PagueloFacil Callback] Error creating fallback payment:', createError);
    return null;
  }
  
  console.log('[PagueloFacil Callback] ✅ Fallback payment created:', newPayment.id);
  
  // Try to link payment to pending players
  await linkEnrollmentPaymentToPendingPlayers(
    supabase,
    newPayment.id,
    paymentAmount,
    operationNumber
  );
  
  return newPayment;
}

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
 * GET /api/payments/paguelofacil/callback
 * Handles the RETURN_URL callback from Paguelo Fácil after payment processing
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Log that callback was called - CRITICAL for debugging
    console.log('[PagueloFacil Callback] ========== CALLBACK CALLED ==========');
    console.log('[PagueloFacil Callback] Timestamp:', new Date().toISOString());
    console.log('[PagueloFacil Callback] Request URL:', request.url);
    console.log('[PagueloFacil Callback] Request method:', request.method);
    console.log('[PagueloFacil Callback] Headers:', Object.fromEntries(request.headers.entries()));
    
    const searchParams = request.nextUrl.searchParams;
    
    // Log all incoming parameters for debugging
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log('[PagueloFacil Callback] All incoming parameters:', allParams);
    console.log('[PagueloFacil Callback] Total params count:', allParams ? Object.keys(allParams).length : 0);
    
    // Convert URLSearchParams to object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Parse callback parameters from Paguelo Fácil
    const callbackParams = PagueloFacilService.parseCallbackParams(params);
    console.log('[PagueloFacil Callback] Parsed callback params:', callbackParams);

    // Verify transaction status
    const isApproved = PagueloFacilService.isTransactionApproved(callbackParams);
    console.log('[PagueloFacil Callback] Transaction approved?', isApproved);
    console.log('[PagueloFacil Callback] Detailed status check:', {
      Estado: callbackParams.Estado,
      EstadoRaw: callbackParams.Estado,
      TotalPagado: callbackParams.TotalPagado,
      TotalPagadoParsed: parseFloat(callbackParams.TotalPagado || '0'),
      Razon: callbackParams.Razon,
      Oper: callbackParams.Oper,
      isApproved,
    });

    // Extract custom parameters from URL (these were passed in the returnUrl)
    // Also check PARM_1, PARM_2, etc. that Paguelo Fácil returns
    // Note: PARM_1 is usually the orderId, customParams start from PARM_2
    const parm1 = searchParams.get('PARM_1') || callbackParams.PARM_1 || '';
    const parm2 = searchParams.get('PARM_2') || callbackParams.PARM_2 || '';
    const parm3 = searchParams.get('PARM_3') || callbackParams.PARM_3 || '';
    const parm4 = searchParams.get('PARM_4') || callbackParams.PARM_4 || '';
    const parm5 = searchParams.get('PARM_5') || callbackParams.PARM_5 || '';
    const parm6 = searchParams.get('PARM_6') || callbackParams.PARM_6 || '';
    const parm7 = searchParams.get('PARM_7') || callbackParams.PARM_7 || '';
    const parm8 = searchParams.get('PARM_8') || callbackParams.PARM_8 || '';
    const parm9 = searchParams.get('PARM_9') || callbackParams.PARM_9 || '';
    
    // Try to extract from URL params first, then from PARM
    // Based on how we send: customParams = { type, playerId, paymentType, monthYear, isAdvancePayment, sponsorId, sponsorName, etc. }
    let type = searchParams.get('type') || parm2 || ''; // 'enrollment' | 'payment' | 'sponsor'
    let playerId = searchParams.get('playerId') || parm3 || '';
    let paymentType = searchParams.get('paymentType') || parm4 || '';
    let amount = searchParams.get('amount') || parm5 || '';
    let monthYear = searchParams.get('monthYear') || parm6 || '';
    let isAdvancePayment = searchParams.get('isAdvancePayment') === 'true' || parm7 === 'true';
    let sponsorId = searchParams.get('sponsorId') || searchParams.get('sponsor_id') || parm8 || '';
    let sponsorName = searchParams.get('sponsorName') || searchParams.get('sponsor_name') || parm9 || '';
    let sponsorEmail = searchParams.get('sponsorEmail') || searchParams.get('sponsor_email') || '';
    
    // If advance payment, don't use month_year
    if (isAdvancePayment) {
      monthYear = '';
      paymentType = 'custom';
    }
    
    // If amount is not in URL params or PARM, try to get it from callback params
    if (!amount && callbackParams.TotalPagado) {
      amount = callbackParams.TotalPagado;
    }
    
    // Try to extract playerId from orderId if it follows the pattern "payment-{playerId}-{timestamp}"
    if (!playerId && parm1) {
      const orderIdMatch = parm1.match(/^payment-([^-]+)-/);
      if (orderIdMatch) {
        playerId = orderIdMatch[1];
      }
    }
    
    console.log('[PagueloFacil Callback] Extracted custom params:', {
      type,
      playerId,
      paymentType,
      amount,
      monthYear,
      fromUrl: {
        type: searchParams.get('type'),
        playerId: searchParams.get('playerId'),
        paymentType: searchParams.get('paymentType'),
        amount: searchParams.get('amount'),
      },
      fromPARM: {
        PARM_1: searchParams.get('PARM_1'),
        PARM_2: searchParams.get('PARM_2'),
        PARM_3: searchParams.get('PARM_3'),
        PARM_4: searchParams.get('PARM_4'),
        PARM_5: searchParams.get('PARM_5'),
        PARM_6: searchParams.get('PARM_6'),
      },
    });

    // Build redirect URL with transaction result
    const baseUrl = getBaseUrlFromRequest(request);
    console.log('[PagueloFacil Callback] Base URL determined:', baseUrl);

    // Handle enrollment payment confirmation
    if (isApproved && type === 'enrollment' && amount) {
      try {
        console.log('[PagueloFacil Callback] Handling enrollment payment confirmation...');
        const supabase = await createClient();
        
        const paymentAmount = parseFloat(amount);
        const operationNumber = callbackParams.Oper || '';
        const orderId = parm1 || '';
        
        let existingPayment = null;
        
        // 1. Search by operation number in notes
        if (operationNumber) {
          console.log('[PagueloFacil Callback] Searching for payment by operation number:', operationNumber);
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
            console.log('[PagueloFacil Callback] Found payment by operation number:', existingPayment.id);
          }
        }
        
        // 2. Search by orderId if not found (orderId is usually in the enrollment form submission)
        if (!existingPayment && orderId) {
          console.log('[PagueloFacil Callback] Searching for payment by orderId:', orderId);
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
            console.log('[PagueloFacil Callback] Found payment by orderId:', existingPayment.id);
          }
        }
        
        // 3. Search by amount (within $1 tolerance) in recent pending payments (last 2 hours)
        if (!existingPayment) {
          console.log('[PagueloFacil Callback] Searching for payment by amount in recent pending payments:', paymentAmount);
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
              console.log('[PagueloFacil Callback] Found payment by amount in recent pending payments:', existingPayment.id);
            }
          }
        }
        
        // 4. If payment exists, update it
        if (existingPayment) {
          console.log('[PagueloFacil Callback] Updating existing enrollment payment:', existingPayment.id);
          
          // Update payment status to "Approved" and add operation details
          const operationInfo = operationNumber ? `Paguelo Fácil Operación: ${operationNumber}` : 'Paguelo Fácil';
          const updatedNotes = `${existingPayment.notes || ''}\n\n${operationInfo}. Confirmado: ${new Date().toISOString()}`;
          
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'Approved',
              notes: updatedNotes,
            })
            .eq('id', existingPayment.id);
          
          if (updateError) {
            console.error('[PagueloFacil Callback] Error updating enrollment payment:', updateError);
          } else {
            console.log('[PagueloFacil Callback] ✅ Enrollment payment updated to Approved:', existingPayment.id);
            
            // Send payment confirmation email
            try {
              await sendPaymentConfirmationEmail(existingPayment.id);
            } catch (emailError) {
              console.error('[PagueloFacil Callback] Error sending payment confirmation email:', emailError);
            }
            
            // Revalidate paths
            revalidatePath('/dashboard/finances');
            revalidatePath('/dashboard/finances/transactions');
            revalidatePath('/dashboard/approvals');
          }
        } else {
          // 5. If payment doesn't exist, create enrollment from payment callback
          console.log('[PagueloFacil Callback] Payment not found. Creating enrollment from payment callback...');
          
          // Try to get enrollment data from database first (using orderId)
          let enrollmentData = null;
          
          if (orderId) {
            console.log('[PagueloFacil Callback] 🔍 Searching for enrollmentData in database:', {
              orderId,
              orderIdLength: orderId.length,
              orderIdType: typeof orderId,
            });
            
            try {
              // First, check if table exists by trying to query it
              const { data: storedOrder, error: orderError } = await supabase
                .from('paguelofacil_orders')
                .select('enrollment_data, amount, type, created_at')
                .eq('order_id', orderId)
                .single();
              
              if (!orderError && storedOrder?.enrollment_data) {
                enrollmentData = storedOrder.enrollment_data;
                console.log('[PagueloFacil Callback] ✅ Enrollment data retrieved from database:', {
                  orderId,
                  tutorName: enrollmentData.tutorName,
                  tutorEmail: enrollmentData.tutorEmail,
                  playerCount: enrollmentData.players?.length || 0,
                  storedAmount: storedOrder.amount,
                  storedType: storedOrder.type,
                  storedAt: storedOrder.created_at,
                });
              } else {
                console.warn('[PagueloFacil Callback] ⚠️ No enrollment data found in database:', {
                  orderId,
                  error: orderError ? {
                    code: orderError.code,
                    message: orderError.message,
                    details: orderError.details,
                    hint: orderError.hint,
                  } : 'No error but no data',
                  hasStoredOrder: !!storedOrder,
                  hasEnrollmentData: !!storedOrder?.enrollment_data,
                });
                
                // Try to find any recent orders to verify table exists
                const { data: recentOrders, error: recentError } = await supabase
                  .from('paguelofacil_orders')
                  .select('order_id, type, created_at')
                  .order('created_at', { ascending: false })
                  .limit(5);
                
                if (!recentError && recentOrders) {
                  console.log('[PagueloFacil Callback] 📋 Recent orders in database (for debugging):', {
                    count: recentOrders.length,
                    orders: recentOrders.map(o => ({
                      orderId: o.order_id,
                      type: o.type,
                      created: o.created_at,
                    })),
                  });
                } else if (recentError) {
                  console.error('[PagueloFacil Callback] ❌ Error checking recent orders (table may not exist):', {
                    code: recentError.code,
                    message: recentError.message,
                    hint: recentError.hint,
                  });
                }
              }
            } catch (dbError: any) {
              console.error('[PagueloFacil Callback] ❌ Error retrieving enrollment data from database:', {
                orderId,
                error: dbError.message,
                stack: dbError.stack,
                code: dbError.code,
                hint: dbError.hint,
              });
            }
          } else {
            console.warn('[PagueloFacil Callback] ⚠️ No orderId available to search for enrollmentData:', {
              parm1,
              callbackParams: {
                Oper: callbackParams.Oper,
                PARM_1: callbackParams.PARM_1,
              },
            });
          }
          
          // Fallback: Try to extract from URL params if not found in database
          if (!enrollmentData) {
            const enrollmentDataParam = searchParams.get('enrollmentData');
            console.log('[PagueloFacil Callback] Checking for enrollmentData in URL (fallback):', {
              hasParam: !!enrollmentDataParam,
              paramLength: enrollmentDataParam?.length || 0,
              paramPreview: enrollmentDataParam?.substring(0, 100) || 'N/A',
            });
            
            if (enrollmentDataParam) {
              try {
                // Decode: first decodeURIComponent, then base64
                const decodedData = Buffer.from(decodeURIComponent(enrollmentDataParam), 'base64').toString('utf-8');
                enrollmentData = JSON.parse(decodedData);
                console.log('[PagueloFacil Callback] ✅ Enrollment data extracted from URL and parsed successfully:', {
                  tutorName: enrollmentData.tutorName,
                  tutorEmail: enrollmentData.tutorEmail,
                  playerCount: enrollmentData.players?.length || 0,
                });
              } catch (parseError: any) {
                console.error('[PagueloFacil Callback] ❌ Error parsing enrollment data from URL:', {
                  error: parseError.message,
                  stack: parseError.stack,
                  paramLength: enrollmentDataParam.length,
                  paramPreview: enrollmentDataParam.substring(0, 200),
                });
              }
            } else {
              console.warn('[PagueloFacil Callback] ⚠️ No enrollmentData found in database or URL');
            }
          }
          
          if (enrollmentData) {
            // Create enrollment using helper function
            console.log('[PagueloFacil Callback] Creating enrollment with helper function...');
            const result = await createEnrollmentFromPayment(
              enrollmentData,
              paymentAmount,
              'paguelofacil',
              operationNumber
            );
            
            if (result.success) {
              console.log('[PagueloFacil Callback] ✅ Enrollment created successfully:', {
                playerIds: result.playerIds,
                paymentId: result.paymentId,
                familyId: result.familyId,
              });
              
              // Send payment confirmation email
              if (result.paymentId) {
                try {
                  await sendPaymentConfirmationEmail(result.paymentId);
                } catch (emailError) {
                  console.error('[PagueloFacil Callback] Error sending payment confirmation email:', emailError);
                }
              }
              
              // Revalidate paths
              revalidatePath('/dashboard/finances');
              revalidatePath('/dashboard/finances/transactions');
              revalidatePath('/dashboard/approvals');
            } else {
              console.error('[PagueloFacil Callback] ❌ Error creating enrollment:', {
                error: result.error,
                enrollmentData: {
                  tutorName: enrollmentData.tutorName,
                  tutorEmail: enrollmentData.tutorEmail,
                  playerCount: enrollmentData.players?.length || 0,
                },
                paymentAmount,
                operationNumber,
                orderId,
              });
              
              // IMPORTANT: Even if createEnrollmentFromPayment failed, it may have created players
              // before the error. We MUST keep those players because the payment was already confirmed.
              // If payment wasn't created, create it now and link it to any players that were created.
              
              if (result.playerIds && result.playerIds.length > 0) {
                console.log('[PagueloFacil Callback] ⚠️ Players were created before error. Keeping them and creating payment...', {
                  playerIds: result.playerIds,
                });
                
                // Create payment if it wasn't created
                if (!result.paymentId) {
                  const playerIdsString = result.playerIds.join(', ');
                  const operationInfo = operationNumber 
                    ? `Paguelo Fácil Operación: ${operationNumber}` 
                    : 'Paguelo Fácil';
                  const paymentNotes = `Pago de matrícula procesado con Paguelo Fácil.\n${operationInfo}. Monto: $${paymentAmount}. Confirmado: ${new Date().toISOString()}\n\nMatrícula para ${result.playerIds.length} jugador(es). Tutor: ${enrollmentData.tutorName}. Pending Player IDs: ${playerIdsString}\n\nNota: Este pago se creó después de un error parcial en el enrollment, pero los jugadores fueron creados correctamente.`;
                  
                  const { data: newPayment, error: paymentError } = await supabase
                    .from('payments')
                    .insert({
                      player_id: null,
                      amount: paymentAmount,
                      type: 'enrollment',
                      method: 'paguelofacil',
                      payment_date: new Date().toISOString().split('T')[0],
                      status: 'Approved',
                      notes: paymentNotes,
                    })
                    .select()
                    .single();
                  
                  if (!paymentError && newPayment) {
                    console.log('[PagueloFacil Callback] ✅ Payment created after partial enrollment error:', newPayment.id);
                    
                    // Try to send email
                    try {
                      await sendPaymentConfirmationEmail(newPayment.id);
                    } catch (emailError) {
                      console.error('[PagueloFacil Callback] Error sending payment confirmation email:', emailError);
                    }
                  } else {
                    console.error('[PagueloFacil Callback] Error creating payment after partial enrollment error:', paymentError);
                  }
                } else {
                  console.log('[PagueloFacil Callback] Payment was already created:', result.paymentId);
                }
              } else {
                // No players were created, use normal fallback
                console.log('[PagueloFacil Callback] No players were created. Using fallback payment...');
                await createFallbackPayment(supabase, paymentAmount, operationNumber);
              }
              
              // Revalidate paths even on error to show any players that were created
              revalidatePath('/dashboard/finances');
              revalidatePath('/dashboard/finances/transactions');
              revalidatePath('/dashboard/approvals');
            }
          } else {
            console.log('[PagueloFacil Callback] No enrollment data found. Creating fallback payment...');
            // Fallback: create payment only and try to link to existing pending players
            await createFallbackPayment(supabase, paymentAmount, operationNumber);
          }
        }
      } catch (enrollmentError: any) {
        console.error('[PagueloFacil Callback] Error handling enrollment payment:', enrollmentError);
        // Don't throw - continue with redirect
      }
    }

    // If transaction was approved and we have payment details, create payment record
    console.log('[PagueloFacil Callback] Checking conditions for payment creation:', {
      isApproved,
      type,
      typeMatches: type === 'payment',
      playerId,
      hasPlayerId: !!playerId,
      amount,
      hasAmount: !!amount,
      allConditionsMet: isApproved && type === 'payment' && playerId && amount,
    });

    if (isApproved && type === 'payment' && playerId && amount) {
      try {
        console.log('[PagueloFacil Callback] Attempting to create payment record...');
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
          console.log('[PagueloFacil Callback] Player found in players table');
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
            console.log('[PagueloFacil Callback] Player found in pending_players table');
          } else {
            console.error('[PagueloFacil Callback] Player not found in either table:', {
              playerError: playerError?.message,
              pendingError: pendingError?.message
            });
          }
        }

        if (playerFound) {
          console.log('[PagueloFacil Callback] Player found, creating payment...');
          
          // Build notes with appropriate format
          let paymentNotes = `Pago procesado con Paguelo Fácil. Operación: ${callbackParams.Oper || 'N/A'}. Fecha: ${callbackParams.Fecha || 'N/A'} ${callbackParams.Hora || 'N/A'}`;
          
          // If advance payment, add note
          if (isAdvancePayment) {
            paymentNotes += `\nPago adelantado voluntario - ${new Date().toLocaleDateString('es-PA')}`;
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
              payment_date: new Date().toISOString().split('T')[0],
              status: 'Approved' as const,
              notes: paymentNotes,
            };
            
            // Note: month_year column does not exist in payments table, so we don't include it
            
            console.log('[PagueloFacil Callback] Payment data to create (pending player):', paymentData);
            
            const { data: insertedPayment, error: insertError } = await supabase
              .from('payments')
              .insert(paymentData)
              .select()
              .single();
            
            if (insertError) {
              console.error('[PagueloFacil Callback] Error creating payment for pending player:', insertError);
              throw insertError;
            }
            createdPayment = insertedPayment;
          } else {
            // If player is approved, use createPayment function
            const paymentData: any = {
              player_id: playerId, // This is always a string when not pending
              amount: parseFloat(amount),
              type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              method: 'paguelofacil' as const,
              payment_date: new Date().toISOString().split('T')[0],
              status: 'Approved' as const,
              notes: paymentNotes,
            };
            
            // Note: month_year column does not exist in payments table, so we don't include it
            // The createPayment function will also remove it if it's present
            
            console.log('[PagueloFacil Callback] Payment data to create (approved player):', paymentData);
            createdPayment = await createPayment(paymentData);
          }

          // CRITICAL: Verify payment was created correctly by querying it back
          if (createdPayment?.id) {
            const { data: verifyPayment, error: verifyError } = await supabase
              .from('payments')
              .select('*')
              .eq('id', createdPayment.id)
              .single();
            
            if (verifyError || !verifyPayment) {
              console.error('[PagueloFacil Callback] ❌ CRITICAL: Payment verification failed:', {
                paymentId: createdPayment.id,
                error: verifyError,
                createdPayment,
              });
            } else {
              console.log('[PagueloFacil Callback] ✅ Payment verified in database:', {
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
            console.error('[PagueloFacil Callback] ❌ CRITICAL: Payment created but no ID returned:', {
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

          console.log('[PagueloFacil Callback] ✅ Payment record created successfully:', {
            paymentId: createdPayment?.id,
            playerId,
            amount,
            oper: callbackParams.Oper,
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
              operationId: callbackParams.Oper || undefined,
            });

            if (emailResult.error) {
              console.error('[PagueloFacil Callback] ⚠️ Error sending confirmation email:', emailResult.error);
            } else {
              console.log('[PagueloFacil Callback] ✅ Confirmation email queued successfully');
            }
          } catch (emailError: any) {
            console.error('[PagueloFacil Callback] ⚠️ Error sending confirmation email:', emailError);
            // Don't fail the payment if email fails
          }
        } else {
          console.error('[PagueloFacil Callback] ❌ Player not found with ID:', playerId);
        }
      } catch (paymentError: any) {
        console.error('[PagueloFacil Callback] ❌ Error creating payment record:', {
          error: paymentError,
          message: paymentError?.message,
          stack: paymentError?.stack,
        });
        // Continue with redirect even if payment creation fails
      }
    } else {
      // Transaction was denied/failed - do NOT record as a payment
      // Rejected payments are not real payments and should not appear in payment history
      // We only log for audit purposes, but don't store in database
      if (!isApproved && type === 'payment' && playerId && amount) {
        console.log('[PagueloFacil Callback] ⚠️ Payment denied - NOT recording as payment (rejections are not payments):', {
          playerId,
          amount,
          estado: callbackParams.Estado,
          razon: callbackParams.Razon,
          oper: callbackParams.Oper,
          note: 'Denied payments are logged but not stored as payments - they are not real payments',
        });
      }
      
      // Log transaction denial - rejected payments are NOT stored as payments
      const is3DSError = callbackParams.Razon?.toLowerCase().includes('authentication') || 
                        callbackParams.Razon?.toLowerCase().includes('3ds') ||
                        callbackParams.Razon?.toLowerCase().includes('issuer is rejecting');
      
      if (is3DSError) {
        console.warn('[PagueloFacil Callback] ⚠️ 3DS Authentication Error:', {
          estado: callbackParams.Estado,
          razon: callbackParams.Razon,
          oper: callbackParams.Oper,
          tipo: callbackParams.Tipo,
          note: 'This transaction was denied due to 3DS authentication failure. This may indicate:',
          possibleCauses: [
            'Using incorrect test cards for sandbox environment',
            '3DS not properly configured in PagueloFacil merchant account',
            'Test cards requiring 3DS authentication that is not being completed',
            'Sandbox environment configuration issue',
          ],
          suggestion: 'Verify that you are using the correct sandbox test cards and that 3DS is properly configured.',
        });
      }
      
      console.log('[PagueloFacil Callback] ℹ️ Transaction denied - no payment created (rejections are not real payments):', {
        estado: callbackParams.Estado,
        razon: callbackParams.Razon,
        is3DSError,
        type,
        hasPlayerId: !!playerId,
        hasAmount: !!amount,
        note: 'Rejected payments are logged but NOT stored as payments - they are not real payments',
      });
    }

    // Build redirect URL
    let redirectUrl: string;
    if (isApproved) {
      // Success page
      if (type === 'enrollment') {
        // For enrollment, redirect to enrollment success page
        redirectUrl = `${baseUrl}/enrollment/success?paguelofacil=success&oper=${callbackParams.Oper}&monto=${callbackParams.TotalPagado}`;
      } else if (type === 'payment' && playerId) {
        // For regular payments, redirect to player or family page
        redirectUrl = `${baseUrl}/dashboard/players/${playerId}?paguelofacil=success&oper=${callbackParams.Oper}`;
      } else {
        // Generic success
        redirectUrl = `${baseUrl}/dashboard/finances?paguelofacil=success&oper=${callbackParams.Oper}&monto=${callbackParams.TotalPagado}`;
      }
    } else {
      // Failure page
      if (type === 'enrollment') {
        redirectUrl = `${baseUrl}/enrollment?paguelofacil=failed&razon=${encodeURIComponent(callbackParams.Razon || 'Transacción denegada')}`;
      } else if (type === 'sponsor') {
        redirectUrl = `${baseUrl}/sponsors/checkout/${sponsorId}?paguelofacil=failed&razon=${encodeURIComponent(callbackParams.Razon || 'Transacción denegada')}`;
      } else if (type === 'payment' && playerId) {
        redirectUrl = `${baseUrl}/dashboard/players/${playerId}?paguelofacil=failed&razon=${encodeURIComponent(callbackParams.Razon || 'Transacción denegada')}`;
      } else {
        redirectUrl = `${baseUrl}/dashboard/finances?paguelofacil=failed&razon=${encodeURIComponent(callbackParams.Razon || 'Transacción denegada')}`;
      }
    }

    // Log transaction for debugging
    console.log('[PagueloFacil Callback] Transaction processed:', {
      approved: isApproved,
      oper: callbackParams.Oper,
      amount: callbackParams.TotalPagado,
      status: callbackParams.Estado,
      reason: callbackParams.Razon,
      type,
      playerId,
    });

    // Log completion
    const processingTime = Date.now() - startTime;
    console.log('[PagueloFacil Callback] ✅ Callback processed successfully:', {
      processingTimeMs: processingTime,
      isApproved,
      redirectUrl,
      timestamp: new Date().toISOString(),
    });

    // Redirect to appropriate page
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('[PagueloFacil Callback] ❌ CRITICAL ERROR processing callback:', {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
      requestUrl: request.url,
    });
    
    // Redirect to error page
    const baseUrl = getBaseUrlFromRequest(request);
    return NextResponse.redirect(`${baseUrl}/dashboard/finances?paguelofacil=error&message=${encodeURIComponent(error.message || 'Error desconocido')}`);
  }
}

/**
 * POST /api/payments/paguelofacil/callback
 * Some implementations might use POST for callbacks (webhook style)
 */
export async function POST(request: NextRequest) {
  // For POST callbacks, parse body instead of query params
  try {
    const body = await request.json().catch(() => ({}));
    
    // Convert body to query-like format
    const params: Record<string, string> = {};
    Object.entries(body).forEach(([key, value]) => {
      params[key] = String(value);
    });

    // Create a new request with query params
    const url = new URL(request.url);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const newRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    });

    return GET(newRequest);
  } catch (error: any) {
    console.error('[PagueloFacil Callback] Error processing POST callback:', error);
    const baseUrl = getBaseUrlFromRequest(request);
    return NextResponse.redirect(`${baseUrl}/dashboard/finances?paguelofacil=error`);
  }
}
