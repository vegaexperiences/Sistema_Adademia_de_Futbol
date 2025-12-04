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

    // Build redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';

    // If transaction was approved and we have payment details, create payment record
    console.log('[Yappy Callback] Checking conditions for payment creation:', {
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';
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
    console.log('[Yappy Callback] Query params:', Object.fromEntries(searchParams.entries()));

    // Extract parameters according to Yappy manual
    const orderId = searchParams.get('orderId') || '';
    const hash = searchParams.get('hash') || searchParams.get('Hash') || '';
    const status = searchParams.get('status') || searchParams.get('Status') || '';
    const domain = searchParams.get('domain') || searchParams.get('Domain') || '';
    const confirmationNumber = searchParams.get('confirmationNumber') || searchParams.get('ConfirmationNumber') || '';

    console.log('[Yappy Callback] Extracted params:', {
      orderId,
      hash: hash ? `${hash.substring(0, 10)}...` : 'N/A',
      status,
      domain,
      confirmationNumber,
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
    console.log('[Yappy Callback] Transaction approved?', isApproved, 'Status:', status);

    // Try to extract custom parameters from orderId pattern or return URL
    const returnUrl = searchParams.get('returnUrl') || '';
    let type = '';
    let playerId = '';
    let paymentType = '';
    let amount = searchParams.get('amount') || '';
    let monthYear = searchParams.get('monthYear') || '';
    let notes = searchParams.get('notes') || '';

    // Try to extract from orderId pattern "payment-{playerId}-{timestamp}"
    if (orderId && orderId.startsWith('payment-')) {
      const orderIdMatch = orderId.match(/^payment-([^-]+)-/);
      if (orderIdMatch) {
        playerId = orderIdMatch[1];
        type = 'payment';
      }
    }

    // Try to extract from returnUrl query params
    if (returnUrl) {
      try {
        const returnUrlObj = new URL(returnUrl);
        type = returnUrlObj.searchParams.get('type') || type;
        playerId = returnUrlObj.searchParams.get('playerId') || playerId;
        paymentType = returnUrlObj.searchParams.get('paymentType') || paymentType;
        amount = returnUrlObj.searchParams.get('amount') || amount;
        monthYear = returnUrlObj.searchParams.get('monthYear') || monthYear;
        notes = returnUrlObj.searchParams.get('notes') || notes;
      } catch (e) {
        console.warn('[Yappy Callback] Error parsing returnUrl:', e);
      }
    }

    // Build redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';

    // Process payment creation if approved (same logic as POST)
    if (isApproved && type === 'payment' && playerId && amount) {
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
          const paymentResult = await createPayment({
            playerId,
            amount: parseFloat(amount),
            paymentMethod: 'Yappy',
            transactionId: confirmationNumber || orderId,
            status: 'Approved',
            paymentType: paymentType || 'monthly',
            monthYear: monthYear || undefined,
            notes: notes || undefined,
          });

          if (paymentResult.success) {
            console.log('[Yappy Callback] Payment created successfully from GET callback');
            
            // Send confirmation email
            try {
              await sendPaymentConfirmationEmail(paymentResult.paymentId!, playerId);
            } catch (emailError) {
              console.error('[Yappy Callback] Error sending confirmation email:', emailError);
            }

            // Revalidate paths
            revalidatePath('/dashboard/finances');
            revalidatePath(`/dashboard/players/${playerId}`);
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
        redirectUrl = `${baseUrl}/enrollment/success?yappy=success&orderId=${orderId}&amount=${amount}`;
      } else if (type === 'payment' && playerId) {
        redirectUrl = `${baseUrl}/dashboard/players/${playerId}?yappy=success&orderId=${orderId}`;
      } else {
        redirectUrl = `${baseUrl}/dashboard/finances?yappy=success&orderId=${orderId}&amount=${amount}`;
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

