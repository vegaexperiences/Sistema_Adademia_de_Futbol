import { NextRequest, NextResponse } from 'next/server';
import { YappyService, YappyCallbackParams } from '@/lib/payments/yappy';
import { createPayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendPaymentConfirmationEmail } from '@/lib/actions/payment-confirmation';

/**
 * POST /api/payments/yappy/callback
 * Handles the callback from Yappy after payment processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    console.log('[Yappy Callback] ========== CALLBACK CALLED ==========');
    console.log('[Yappy Callback] Request URL:', request.url);
    console.log('[Yappy Callback] Request method:', request.method);
    console.log('[Yappy Callback] Body:', body);

    // Parse callback parameters
    const callbackParams = YappyService.parseCallbackParams(body);
    console.log('[Yappy Callback] Parsed callback params:', callbackParams);

    // Verify transaction status
    const isApproved = YappyService.isTransactionApproved(callbackParams);
    console.log('[Yappy Callback] Transaction approved?', isApproved);

    // Extract custom parameters from metadata or body
    const metadata = body.metadata || {};
    let type = metadata.type || body.type || '';
    let playerId = metadata.playerId || body.playerId || '';
    let paymentType = metadata.paymentType || body.paymentType || '';
    let amount = callbackParams.amount || body.amount || '';
    let monthYear = metadata.monthYear || body.monthYear || '';
    let notes = metadata.notes || body.notes || '';

    // Try to extract playerId from orderId if it follows the pattern "payment-{playerId}-{timestamp}"
    if (!playerId && callbackParams.orderId) {
      const orderIdMatch = callbackParams.orderId.match(/^payment-([^-]+)-/);
      if (orderIdMatch) {
        playerId = orderIdMatch[1];
      }
    }

    // If amount is not available, try to get it from the order
    if (!amount && isApproved) {
      // Amount should be in the callback, but if not, we'll need to get it from the order
      amount = callbackParams.amount || '';
    }

    console.log('[Yappy Callback] Extracted custom params:', {
      type,
      playerId,
      paymentType,
      amount,
      monthYear,
    });

    // Build redirect URL - extract from request URL if available, otherwise use env var
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      // Try to extract from request URL
      try {
        const requestUrl = new URL(request.url);
        baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      } catch (e) {
        // Fallback to origin header or localhost
        baseUrl = request.headers.get('origin') || 'http://localhost:3000';
      }
    }
    
    // Ensure HTTPS in production (Vercel)
    if (baseUrl.includes('vercel.app') && !baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }

    // If transaction was approved and we have payment details, create or update payment record
    console.log('[Yappy Callback] Checking conditions for payment creation/update:', {
      isApproved,
      type,
      typeMatches: type === 'payment' || type === 'enrollment',
      playerId,
      hasPlayerId: !!playerId,
      amount,
      hasAmount: !!amount,
      orderId: callbackParams.orderId,
      transactionId: callbackParams.transactionId,
      allConditionsMet: isApproved && (type === 'payment' || type === 'enrollment') && amount,
    });

    // Handle enrollment payments: search for existing payment and update it
    if (isApproved && type === 'enrollment' && amount) {
      try {
        console.log('[Yappy Callback] Processing enrollment payment update...');
        const supabase = await createClient();
        
        // Search for existing enrollment payment by orderId or transactionId
        let existingPayment = null;
        
        if (callbackParams.orderId) {
          // Try to find payment by orderId in notes
          const { data: paymentsByOrder } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'yappy')
            .or(`notes.ilike.%${callbackParams.orderId}%,notes.ilike.%${callbackParams.orderId.toLowerCase()}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (paymentsByOrder && paymentsByOrder.length > 0) {
            existingPayment = paymentsByOrder[0];
            console.log('[Yappy Callback] Found enrollment payment by orderId:', existingPayment.id);
          }
        }
        
        // If not found by orderId, try transactionId
        if (!existingPayment && callbackParams.transactionId) {
          const { data: paymentsByTransaction } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'yappy')
            .or(`notes.ilike.%${callbackParams.transactionId}%,notes.ilike.%${callbackParams.transactionId.toLowerCase()}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (paymentsByTransaction && paymentsByTransaction.length > 0) {
            existingPayment = paymentsByTransaction[0];
            console.log('[Yappy Callback] Found enrollment payment by transactionId:', existingPayment.id);
          }
        }
        
        // If still not found, try to find recent pending enrollment payment with matching amount
        if (!existingPayment) {
          const { data: recentPayments } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'yappy')
            .eq('status', 'Pending')
            .eq('amount', parseFloat(amount))
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (recentPayments && recentPayments.length > 0) {
            // Find the most recent one that doesn't have a transaction ID yet
            existingPayment = recentPayments.find(p => 
              !p.notes?.includes('Transacción:') || p.notes?.includes('Transacción: N/A')
            ) || recentPayments[0];
            console.log('[Yappy Callback] Found recent enrollment payment by amount:', existingPayment.id);
          }
        }
        
        if (existingPayment) {
          // Update existing payment with transaction details
          const updatedNotes = `${existingPayment.notes || ''}\n\nPago confirmado con Yappy. Orden: ${callbackParams.orderId || 'N/A'}. Transacción: ${callbackParams.transactionId || 'N/A'}. Número de Operación: ${callbackParams.transactionId || 'N/A'}`;
          
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'Approved',
              notes: updatedNotes,
            })
            .eq('id', existingPayment.id);
          
          if (updateError) {
            console.error('[Yappy Callback] Error updating enrollment payment:', updateError);
          } else {
            console.log('[Yappy Callback] ✅ Enrollment payment updated successfully:', existingPayment.id);
          }
        } else {
          console.warn('[Yappy Callback] ⚠️ Enrollment payment not found. Creating new payment record...');
          // Create new payment if not found (fallback)
          const paymentData = {
            player_id: null,
            amount: parseFloat(amount),
            type: 'enrollment' as const,
            method: 'yappy' as const,
            payment_date: new Date().toISOString().split('T')[0],
            status: 'Approved' as const,
            notes: `Pago de matrícula procesado con Yappy. Orden: ${callbackParams.orderId || 'N/A'}. Transacción: ${callbackParams.transactionId || 'N/A'}. Número de Operación: ${callbackParams.transactionId || 'N/A'}`,
          };
          
          const { error: insertError } = await supabase
            .from('payments')
            .insert(paymentData);
          
          if (insertError) {
            console.error('[Yappy Callback] Error creating enrollment payment:', insertError);
          } else {
            console.log('[Yappy Callback] ✅ New enrollment payment created');
          }
        }
      } catch (enrollmentError: any) {
        console.error('[Yappy Callback] Error processing enrollment payment:', enrollmentError);
      }
    }

    if (isApproved && type === 'payment' && playerId && amount) {
      try {
        console.log('[Yappy Callback] Attempting to create payment record...');
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
          console.log('[Yappy Callback] Player found in players table');
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
            console.log('[Yappy Callback] Player found in pending_players table');
          } else {
            console.error('[Yappy Callback] Player not found in either table:', {
              playerError: playerError?.message,
              pendingError: pendingError?.message
            });
          }
        }

        if (playerFound) {
          console.log('[Yappy Callback] Player found, creating payment...');
          
          // Build notes with appropriate format
          let paymentNotes = `Pago procesado con Yappy Comercial. Orden: ${callbackParams.orderId}. Transacción: ${callbackParams.transactionId || 'N/A'}. ${notes}`;
          
          // If player is pending, add format for later linking
          if (isPendingPlayer) {
            paymentNotes += `. Pending Player IDs: ${playerId}`;
          }
          
          // Create payment record with Approved status
          let createdPayment;
          
          if (isPendingPlayer) {
            // If player is pending, insert directly with player_id = null
            const paymentData = {
              player_id: null,
              amount: parseFloat(amount),
              type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              method: 'yappy' as const,
              payment_date: new Date().toISOString().split('T')[0],
              month_year: monthYear || undefined,
              status: 'Approved' as const,
              notes: paymentNotes,
            };
            
            console.log('[Yappy Callback] Payment data to create (pending player):', paymentData);
            
            const { data: insertedPayment, error: insertError } = await supabase
              .from('payments')
              .insert(paymentData)
              .select()
              .single();
            
            if (insertError) {
              console.error('[Yappy Callback] Error creating payment for pending player:', insertError);
              throw insertError;
            }
            createdPayment = insertedPayment;
          } else {
            // If player is approved, use createPayment function
            const paymentData = {
              player_id: playerId, // This is always a string when not pending
              amount: parseFloat(amount),
              type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              method: 'yappy' as const,
              payment_date: new Date().toISOString().split('T')[0],
              month_year: monthYear || undefined,
              status: 'Approved' as const,
              notes: paymentNotes,
            };
            
            console.log('[Yappy Callback] Payment data to create (approved player):', paymentData);
            createdPayment = await createPayment(paymentData);
          }

          // Revalidate all relevant paths
          revalidatePath('/dashboard/players');
          revalidatePath('/dashboard/players/[id]', 'page');
          revalidatePath('/dashboard/families');
          revalidatePath('/dashboard/finances');
          revalidatePath('/dashboard/finances/transactions');

          console.log('[Yappy Callback] ✅ Payment record created successfully:', {
            paymentId: createdPayment?.id,
            playerId,
            amount,
            orderId: callbackParams.orderId,
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
              operationId: callbackParams.transactionId || callbackParams.orderId,
            });

            if (emailResult.error) {
              console.error('[Yappy Callback] ⚠️ Error sending confirmation email:', emailResult.error);
            } else {
              console.log('[Yappy Callback] ✅ Confirmation email queued successfully');
            }
          } catch (emailError: any) {
            console.error('[Yappy Callback] ⚠️ Error sending confirmation email:', emailError);
          }
        } else {
          console.error('[Yappy Callback] ❌ Player not found with ID:', playerId);
        }
      } catch (paymentError: any) {
        console.error('[Yappy Callback] ❌ Error creating payment record:', {
          error: paymentError,
          message: paymentError?.message,
          stack: paymentError?.stack,
        });
      }
    } else {
      console.warn('[Yappy Callback] ⚠️ Payment not created - conditions not met:', {
        isApproved,
        type,
        hasPlayerId: !!playerId,
        hasAmount: !!amount,
      });
    }

    // Build redirect URL
    let redirectUrl: string;
    if (isApproved) {
      if (type === 'enrollment') {
        redirectUrl = `${baseUrl}/enrollment/success?yappy=success&orderId=${callbackParams.orderId}&amount=${amount}`;
      } else if (type === 'payment' && playerId) {
        redirectUrl = `${baseUrl}/dashboard/players/${playerId}?yappy=success&orderId=${callbackParams.orderId}`;
      } else {
        redirectUrl = `${baseUrl}/dashboard/finances?yappy=success&orderId=${callbackParams.orderId}&amount=${amount}`;
      }
    } else {
      if (type === 'enrollment') {
        redirectUrl = `${baseUrl}/enrollment?yappy=failed&orderId=${callbackParams.orderId}`;
      } else if (type === 'payment' && playerId) {
        redirectUrl = `${baseUrl}/dashboard/players/${playerId}?yappy=failed&orderId=${callbackParams.orderId}`;
      } else {
        redirectUrl = `${baseUrl}/dashboard/finances?yappy=failed&orderId=${callbackParams.orderId}`;
      }
    }

    console.log('[Yappy Callback] Transaction processed:', {
      approved: isApproved,
      orderId: callbackParams.orderId,
      transactionId: callbackParams.transactionId,
      status: callbackParams.status,
      type,
      playerId,
    });

    return NextResponse.json({
      success: isApproved,
      redirectUrl,
    });
  } catch (error: any) {
    console.error('[Yappy Callback] Error processing callback:', error);
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      try {
        const requestUrl = new URL(request.url);
        baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      } catch (e) {
        baseUrl = request.headers.get('origin') || 'http://localhost:3000';
      }
    }
    
    if (baseUrl.includes('vercel.app') && !baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    
    return NextResponse.json({
      success: false,
      redirectUrl: `${baseUrl}/dashboard/finances?yappy=error`,
    });
  }
}

/**
 * GET /api/payments/yappy/callback
 * According to Yappy manual, IPN (Instant Payment Notification) uses GET with query parameters:
 * - orderId: ID de la orden
 * - hash: Hash para validar
 * - status: Estado (E=Ejecutado, R=Rechazado, C=Cancelado, X=Expirado)
 * - domain: Dominio
 * - confirmationNumber: ID de la transacción en Yappy
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    console.log('[Yappy Callback] ========== GET CALLBACK CALLED ==========');
    console.log('[Yappy Callback] Request URL:', request.url);
    console.log('[Yappy Callback] Request headers:', {
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
    });
    console.log('[Yappy Callback] All query params:', Object.fromEntries(searchParams.entries()));

    // Extract parameters according to Yappy manual
    const orderId = searchParams.get('orderId') || searchParams.get('orderid') || '';
    const hash = searchParams.get('hash') || searchParams.get('Hash') || '';
    const status = searchParams.get('status') || searchParams.get('Status') || '';
    const domain = searchParams.get('domain') || searchParams.get('Domain') || '';
    const confirmationNumber = searchParams.get('confirmationNumber') || searchParams.get('ConfirmationNumber') || searchParams.get('confirmationnumber') || '';

    console.log('[Yappy Callback] Extracted Yappy params:', {
      orderId,
      hash: hash ? `${hash.substring(0, 10)}...` : 'N/A',
      hashLength: hash ? hash.length : 0,
      status,
      statusCode: status ? status.charCodeAt(0) : 'N/A', // Log ASCII code to see if it's 'E', 'X', etc.
      domain,
      confirmationNumber,
      hasAllRequiredParams: !!(orderId && status && confirmationNumber),
    });

    // Validate hash (according to Yappy manual)
    const callbackParams: YappyCallbackParams = {
      orderId,
      status,
      domain,
      confirmationNumber,
      transactionId: confirmationNumber,
    };

    // Validate hash if provided
    if (hash) {
      const isValidHash = YappyService.validateCallbackHash(callbackParams, hash);
      if (!isValidHash) {
        console.warn('[Yappy Callback] Hash validation failed');
        // Note: We'll still process the callback but log the warning
        // In production, you may want to reject invalid hashes
      }
    }

    // Verify transaction status
    const isApproved = YappyService.isTransactionApproved(callbackParams);
    console.log('[Yappy Callback] Transaction status check:', {
      status,
      statusCode: status.charCodeAt(0),
      isApproved,
      statusMeaning: status === 'E' ? 'Ejecutado (Approved)' : 
                     status === 'R' ? 'Rechazado (Rejected)' :
                     status === 'C' ? 'Cancelado (Cancelled)' :
                     status === 'X' ? 'Expirado (Expired)' : 'Unknown',
      callbackParams: {
        orderId: callbackParams.orderId,
        status: callbackParams.status,
        transactionId: callbackParams.transactionId,
      },
    });

    // First, try to retrieve order information from database
    // This is the most reliable source since Yappy truncates orderId and doesn't send amount
    let storedOrderInfo: any = null;
    try {
      const supabase = await createClient();
      
      // Truncate orderId to 15 characters to match what was stored
      const truncatedOrderId = orderId.trim().substring(0, 15);
      
      console.log('[Yappy Callback] Attempting to retrieve order info from database:', {
        originalOrderId: orderId,
        originalLength: orderId.length,
        truncatedOrderId,
        truncatedLength: truncatedOrderId.length,
      });
      
      const { data: orderData, error: orderError } = await supabase
        .from('yappy_orders')
        .select('*')
        .eq('order_id', truncatedOrderId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (!orderError && orderData) {
        storedOrderInfo = orderData;
        console.log('[Yappy Callback] ✅ Order info retrieved from database:', {
          orderId: truncatedOrderId,
          playerId: orderData.player_id,
          amount: orderData.amount,
          type: orderData.type,
          paymentType: orderData.payment_type,
          monthYear: orderData.month_year,
          notes: orderData.notes,
        });
      } else {
        console.log('[Yappy Callback] ❌ Order info not found with exact match, trying prefix search...');
        
        // Try to find order by prefix (payment- or enrollment-) and get most recent
        const prefix = truncatedOrderId.startsWith('payment-') ? 'payment-' : 
                      truncatedOrderId.startsWith('enrollment-') ? 'enrollment-' : null;
        
        if (prefix) {
          const { data: prefixOrders, error: prefixError } = await supabase
            .from('yappy_orders')
            .select('*')
            .like('order_id', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!prefixError && prefixOrders && prefixOrders.length > 0) {
            storedOrderInfo = prefixOrders[0];
            console.log('[Yappy Callback] ✅ Order info found by prefix search:', {
              orderId: storedOrderInfo.order_id,
              playerId: storedOrderInfo.player_id,
              amount: storedOrderInfo.amount,
              type: storedOrderInfo.type,
            });
          } else {
            console.log('[Yappy Callback] ❌ Order info not found in database:', {
              orderId: truncatedOrderId,
              originalOrderId: orderId,
              error: orderError?.message || 'No rows returned',
              errorCode: orderError?.code,
              prefixSearchError: prefixError?.message,
            });
          }
        } else {
          console.log('[Yappy Callback] ❌ Order info not found in database:', {
            orderId: truncatedOrderId,
            originalOrderId: orderId,
            error: orderError?.message || 'No rows returned',
            errorCode: orderError?.code,
          });
        }
      }
    } catch (dbError: any) {
      console.error('[Yappy Callback] Exception retrieving order info from database:', {
        error: dbError?.message,
        stack: dbError?.stack,
        orderId,
        truncatedOrderId: orderId.trim().substring(0, 15),
      });
    }

    // Extract custom parameters - try multiple sources
    // Priority: 1) Stored order info, 2) Query params, 3) returnUrl, 4) orderId pattern
    let type = storedOrderInfo?.type || searchParams.get('type') || '';
    let playerId = storedOrderInfo?.player_id || searchParams.get('playerId') || '';
    let paymentType = storedOrderInfo?.payment_type || searchParams.get('paymentType') || '';
    let amount = storedOrderInfo?.amount?.toString() || searchParams.get('amount') || '';
    let monthYear = storedOrderInfo?.month_year || searchParams.get('monthYear') || '';
    let notes = storedOrderInfo?.notes || searchParams.get('notes') || '';
    const returnUrl = searchParams.get('returnUrl') || '';

    console.log('[Yappy Callback] Initial params from query:', {
      hasStoredInfo: !!storedOrderInfo,
      type,
      playerId,
      paymentType,
      amount,
      monthYear,
      notes,
      returnUrl: returnUrl ? 'present' : 'not present',
    });

    // 2. Try to extract from orderId pattern "payment-{playerId}" or "enrollment-{playerId}"
    // Only do this if we don't have stored info (fallback)
    if (orderId && !storedOrderInfo) {
      if (orderId.startsWith('payment-')) {
        const orderIdMatch = orderId.match(/^payment-([^-]+)/);
        if (orderIdMatch && !playerId) {
          const partialPlayerId = orderIdMatch[1];
          // Try to find full playerId by searching for players that start with this partial ID
          try {
            const supabase = await createClient();
            const { data: players, error: playerSearchError } = await supabase
              .from('players')
              .select('id')
              .like('id', `${partialPlayerId}%`)
              .limit(1);
            
            if (!playerSearchError && players && players.length > 0) {
              playerId = players[0].id;
              console.log('[Yappy Callback] Found full playerId from partial match:', { 
                partial: partialPlayerId, 
                full: playerId 
              });
            } else {
              // Fallback to partial ID if no match found
              playerId = partialPlayerId;
              console.log('[Yappy Callback] Using partial playerId (no full match found):', { playerId });
            }
          } catch (searchError: any) {
            console.warn('[Yappy Callback] Error searching for player:', searchError);
            playerId = partialPlayerId; // Fallback to partial
          }
          
          if (!type) type = 'payment';
          console.log('[Yappy Callback] Extracted from orderId pattern (payment) - fallback:', { playerId, type });
        }
      } else if (orderId.startsWith('enrollment-')) {
        const orderIdMatch = orderId.match(/^enrollment-([^-]+)/);
        if (orderIdMatch && !playerId) {
          playerId = orderIdMatch[1];
          if (!type) type = 'enrollment';
          console.log('[Yappy Callback] Extracted from orderId pattern (enrollment) - fallback:', { playerId, type });
        }
      }
    }

    // 3. Try to extract from returnUrl query params if available
    if (returnUrl && (!type || !playerId || !amount)) {
      try {
        const returnUrlObj = new URL(returnUrl);
        type = returnUrlObj.searchParams.get('type') || type;
        playerId = returnUrlObj.searchParams.get('playerId') || playerId;
        paymentType = returnUrlObj.searchParams.get('paymentType') || paymentType;
        amount = returnUrlObj.searchParams.get('amount') || amount;
        monthYear = returnUrlObj.searchParams.get('monthYear') || monthYear;
        notes = returnUrlObj.searchParams.get('notes') || notes;
        console.log('[Yappy Callback] Extracted from returnUrl:', {
          type,
          playerId,
          paymentType,
          amount,
          monthYear,
        });
      } catch (e) {
        console.warn('[Yappy Callback] Error parsing returnUrl:', e);
      }
    }

    console.log('[Yappy Callback] Final extracted params:', {
      type,
      playerId,
      paymentType,
      amount,
      monthYear,
      notes,
    });

    // Build redirect URL - extract from request URL if available, otherwise use env var
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      // Try to extract from request URL
      try {
        const requestUrl = new URL(request.url);
        baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      } catch (e) {
        // Fallback to origin header or localhost
        baseUrl = request.headers.get('origin') || 'http://localhost:3000';
      }
    }
    
    // Ensure HTTPS in production (Vercel)
    if (baseUrl.includes('vercel.app') && !baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }

    // Process payment creation if approved (same logic as POST)
    // Handle both 'payment' and 'enrollment' types
    // Convert to boolean explicitly to avoid string evaluation issues
    const hasValidType = type === 'payment' || type === 'enrollment';
    const hasValidPlayerId = !!playerId && playerId.trim().length > 0;
    
    // If amount is missing, try to get it from returnUrl or use a default based on payment type
    let finalAmount = amount;
    if (!finalAmount || finalAmount.trim().length === 0 || isNaN(parseFloat(finalAmount))) {
      // Try to extract from returnUrl if available
      if (returnUrl) {
        try {
          const returnUrlObj = new URL(returnUrl);
          const urlAmount = returnUrlObj.searchParams.get('amount');
          if (urlAmount && !isNaN(parseFloat(urlAmount))) {
            finalAmount = urlAmount;
            console.log('[Yappy Callback] Amount extracted from returnUrl:', finalAmount);
          }
        } catch (e) {
          console.warn('[Yappy Callback] Error parsing returnUrl for amount:', e);
        }
      }
      
      // If still no amount and we have a valid playerId, we could try to get a default amount
      // but for now, we'll log it and not create payment without amount
      if (!finalAmount || isNaN(parseFloat(finalAmount))) {
        console.warn('[Yappy Callback] ⚠️ Amount is missing and could not be retrieved. Payment will not be created.');
      }
    }
    
    const hasValidAmount = !!finalAmount && finalAmount.trim().length > 0 && !isNaN(parseFloat(finalAmount));
    const shouldCreatePayment = Boolean(isApproved && hasValidType && hasValidPlayerId && hasValidAmount);
    
    console.log('[Yappy Callback] Payment creation check:', {
      isApproved,
      type,
      isPaymentType: type === 'payment',
      isEnrollmentType: type === 'enrollment',
      hasPlayerId: hasValidPlayerId,
      playerId: playerId || 'empty',
      hasAmount: hasValidAmount,
      amount: finalAmount || amount || 'empty',
      shouldCreatePayment,
      orderId,
      confirmationNumber,
    });

    // Handle enrollment payments: search for existing payment and update it
    if (isApproved && type === 'enrollment' && hasValidAmount) {
      try {
        console.log('[Yappy Callback] Processing enrollment payment update (GET)...');
        const supabase = await createClient();
        
        // Search for existing enrollment payment by orderId or transactionId
        let existingPayment = null;
        
        if (orderId) {
          // Try to find payment by orderId in notes
          const { data: paymentsByOrder } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'yappy')
            .or(`notes.ilike.%${orderId}%,notes.ilike.%${orderId.toLowerCase()}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (paymentsByOrder && paymentsByOrder.length > 0) {
            existingPayment = paymentsByOrder[0];
            console.log('[Yappy Callback] Found enrollment payment by orderId (GET):', existingPayment.id);
          }
        }
        
        // If not found by orderId, try transactionId/confirmationNumber
        if (!existingPayment && confirmationNumber) {
          const { data: paymentsByTransaction } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'yappy')
            .or(`notes.ilike.%${confirmationNumber}%,notes.ilike.%${confirmationNumber.toLowerCase()}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (paymentsByTransaction && paymentsByTransaction.length > 0) {
            existingPayment = paymentsByTransaction[0];
            console.log('[Yappy Callback] Found enrollment payment by transactionId (GET):', existingPayment.id);
          }
        }
        
        // If still not found, try to find recent pending enrollment payment with matching amount
        if (!existingPayment) {
          const { data: recentPayments } = await supabase
            .from('payments')
            .select('*')
            .eq('type', 'enrollment')
            .eq('method', 'yappy')
            .eq('status', 'Pending')
            .eq('amount', parseFloat(finalAmount))
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (recentPayments && recentPayments.length > 0) {
            // Find the most recent one that doesn't have a transaction ID yet
            existingPayment = recentPayments.find(p => 
              !p.notes?.includes('Transacción:') || p.notes?.includes('Transacción: N/A')
            ) || recentPayments[0];
            console.log('[Yappy Callback] Found recent enrollment payment by amount (GET):', existingPayment.id);
          }
        }
        
        if (existingPayment) {
          // Update existing payment with transaction details
          const updatedNotes = `${existingPayment.notes || ''}\n\nPago confirmado con Yappy. Orden: ${orderId || 'N/A'}. Transacción: ${confirmationNumber || 'N/A'}. Número de Operación: ${confirmationNumber || 'N/A'}`;
          
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'Approved',
              notes: updatedNotes,
            })
            .eq('id', existingPayment.id);
          
          if (updateError) {
            console.error('[Yappy Callback] Error updating enrollment payment (GET):', updateError);
          } else {
            console.log('[Yappy Callback] ✅ Enrollment payment updated successfully (GET):', existingPayment.id);
          }
        } else {
          console.warn('[Yappy Callback] ⚠️ Enrollment payment not found (GET). Creating new payment record...');
          // Create new payment if not found (fallback)
          const paymentData = {
            player_id: null,
            amount: parseFloat(finalAmount),
            type: 'enrollment' as const,
            method: 'yappy' as const,
            payment_date: new Date().toISOString().split('T')[0],
            status: 'Approved' as const,
            notes: `Pago de matrícula procesado con Yappy. Orden: ${orderId || 'N/A'}. Transacción: ${confirmationNumber || 'N/A'}. Número de Operación: ${confirmationNumber || 'N/A'}`,
          };
          
          const { error: insertError } = await supabase
            .from('payments')
            .insert(paymentData);
          
          if (insertError) {
            console.error('[Yappy Callback] Error creating enrollment payment (GET):', insertError);
          } else {
            console.log('[Yappy Callback] ✅ New enrollment payment created (GET)');
          }
        }
      } catch (enrollmentError: any) {
        console.error('[Yappy Callback] Error processing enrollment payment (GET):', enrollmentError);
      }
    }

    if (shouldCreatePayment) {
      try {
        console.log('[Yappy Callback] Attempting to create payment record from GET callback...');
        const supabase = await createClient();
        
        // Verify player exists
        let playerFound = false;
        let isPendingPlayer = false;
        
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('id', playerId)
          .single();

        if (player) {
          playerFound = true;
        } else {
          const { data: pendingPlayer } = await supabase
            .from('pending_players')
            .select('id')
            .eq('id', playerId)
            .single();

          if (pendingPlayer) {
            playerFound = true;
            isPendingPlayer = true;
          }
        }

        if (playerFound) {
          // Build notes with appropriate format
          let paymentNotes = `Pago procesado con Yappy Comercial. Orden: ${orderId}. Transacción: ${confirmationNumber || 'N/A'}. ${notes || ''}`;
          
          // If player is pending, add format for later linking
          if (isPendingPlayer) {
            paymentNotes += `. Pending Player IDs: ${playerId}`;
          }
          
          // Create payment record with Approved status
          let createdPayment;
          
          if (isPendingPlayer) {
            // If player is pending, insert directly with player_id = null
            const paymentData = {
              player_id: null,
              amount: parseFloat(finalAmount),
              type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              method: 'yappy' as const,
              payment_date: new Date().toISOString().split('T')[0],
              month_year: monthYear || undefined,
              status: 'Approved' as const,
              notes: paymentNotes,
            };
            
            console.log('[Yappy Callback] Payment data to create (pending player from GET):', paymentData);
            
            const { data: insertedPayment, error: insertError } = await supabase
              .from('payments')
              .insert(paymentData)
              .select()
              .single();
            
            if (insertError) {
              console.error('[Yappy Callback] Error creating payment for pending player:', insertError);
              throw insertError;
            }
            createdPayment = insertedPayment;
          } else {
            // If player is approved, use createPayment function
            const paymentData = {
              player_id: playerId, // This is always a string when not pending
              amount: parseFloat(finalAmount),
              type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
              method: 'yappy' as const,
              payment_date: new Date().toISOString().split('T')[0],
              month_year: monthYear || undefined,
              status: 'Approved' as const,
              notes: paymentNotes,
            };
            
            console.log('[Yappy Callback] Payment data to create (approved player from GET):', paymentData);
            createdPayment = await createPayment(paymentData);
          }

          if (createdPayment?.id) {
            console.log('[Yappy Callback] Payment created successfully from GET callback:', {
              paymentId: createdPayment.id,
              playerId,
            });
            
            // Send confirmation email
            try {
              const emailResult = await sendPaymentConfirmationEmail({
                playerId: playerId,
                amount: parseFloat(finalAmount),
                paymentType: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom',
                paymentDate: createdPayment?.payment_date || new Date().toISOString().split('T')[0],
                monthYear: monthYear || undefined,
                operationId: confirmationNumber || orderId,
              });
              
              if (emailResult?.error) {
                console.warn('[Yappy Callback] Email notification issue:', emailResult.error);
              }
            } catch (emailError) {
              console.error('[Yappy Callback] Error sending confirmation email:', emailError);
            }

            // Revalidate paths
            revalidatePath('/dashboard/players');
            revalidatePath('/dashboard/players/[id]', 'page');
            revalidatePath('/dashboard/families');
            revalidatePath('/dashboard/finances');
            revalidatePath('/dashboard/finances/transactions');
          }
        }
      } catch (error: any) {
        console.error('[Yappy Callback] Error creating payment from GET callback:', error);
      }
    }

    // Build redirect URL
    let redirectUrl: string;
    if (isApproved) {
      if (type === 'enrollment') {
        redirectUrl = `${baseUrl}/enrollment/success?yappy=success&orderId=${orderId}&amount=${finalAmount || amount}`;
      } else if (type === 'payment' && playerId) {
        redirectUrl = `${baseUrl}/dashboard/players/${playerId}?yappy=success&orderId=${orderId}&amount=${finalAmount || amount}`;
      } else {
        redirectUrl = `${baseUrl}/dashboard/finances?yappy=success&orderId=${orderId}&amount=${finalAmount || amount}`;
      }
    } else {
      if (type === 'enrollment') {
        redirectUrl = `${baseUrl}/enrollment?yappy=failed&orderId=${orderId}`;
      } else if (type === 'payment' && playerId) {
        redirectUrl = `${baseUrl}/dashboard/players/${playerId}?yappy=failed&orderId=${orderId}`;
      } else {
        redirectUrl = `${baseUrl}/dashboard/finances?yappy=failed&orderId=${orderId}`;
      }
    }

    console.log('[Yappy Callback] GET callback processed:', {
      approved: isApproved,
      orderId,
      status,
      redirectUrl,
    });

    // Redirect to the appropriate page
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[Yappy Callback] Error processing GET callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/dashboard/finances?yappy=error`);
  }
}

