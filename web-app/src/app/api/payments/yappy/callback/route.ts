import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';
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
          
          const paymentData = {
            player_id: isPendingPlayer ? null : playerId, // Set to null if pending, will be linked later
            amount: parseFloat(amount),
            type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom', // Use 'type' not 'payment_type'
            method: 'yappy' as const, // Use 'method' not 'payment_method'
            payment_date: new Date().toISOString().split('T')[0],
            month_year: monthYear || undefined,
            status: 'Approved' as const,
            notes: paymentNotes,
          };
          
          console.log('[Yappy Callback] Payment data to create:', paymentData);
          
          // If player is pending, insert directly (createPayment requires player_id)
          let createdPayment;
          if (isPendingPlayer) {
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
              paymentDate: paymentData.payment_date,
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
 * Some implementations might use GET for callbacks
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Convert to POST format
    const body = params;
    const newRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });

    return POST(newRequest);
  } catch (error: any) {
    console.error('[Yappy Callback] Error processing GET callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';
    return NextResponse.json({
      success: false,
      redirectUrl: `${baseUrl}/dashboard/finances?yappy=error`,
    });
  }
}

