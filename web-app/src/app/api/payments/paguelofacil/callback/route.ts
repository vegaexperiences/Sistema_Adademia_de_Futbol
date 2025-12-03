import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { createPayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendPaymentConfirmationEmail } from '@/lib/actions/payment-confirmation';

/**
 * GET /api/payments/paguelofacil/callback
 * Handles the RETURN_URL callback from Paguelo Fácil after payment processing
 */
export async function GET(request: NextRequest) {
  try {
    // Log that callback was called
    console.log('[PagueloFacil Callback] ========== CALLBACK CALLED ==========');
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

    // Extract custom parameters from URL (these were passed in the returnUrl)
    // Also check PARM_1, PARM_2, etc. that Paguelo Fácil returns
    // Note: PARM_1 is usually the orderId, customParams start from PARM_2
    const parm1 = searchParams.get('PARM_1') || callbackParams.PARM_1 || '';
    const parm2 = searchParams.get('PARM_2') || callbackParams.PARM_2 || '';
    const parm3 = searchParams.get('PARM_3') || callbackParams.PARM_3 || '';
    const parm4 = searchParams.get('PARM_4') || callbackParams.PARM_4 || '';
    const parm5 = searchParams.get('PARM_5') || callbackParams.PARM_5 || '';
    const parm6 = searchParams.get('PARM_6') || callbackParams.PARM_6 || '';
    
    // Try to extract from URL params first, then from PARM
    // Based on how we send: customParams = { type, playerId, paymentType, monthYear }
    let type = searchParams.get('type') || parm2 || ''; // 'enrollment' | 'payment'
    let playerId = searchParams.get('playerId') || parm3 || '';
    let paymentType = searchParams.get('paymentType') || parm4 || '';
    let amount = searchParams.get('amount') || parm5 || '';
    let monthYear = searchParams.get('monthYear') || parm6 || '';
    
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';

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
          
          // If player is pending, add format for later linking
          if (isPendingPlayer) {
            paymentNotes += `. Pending Player IDs: ${playerId}`;
          }
          
          // Create payment record with Approved status
          const paymentData = {
            player_id: isPendingPlayer ? null : playerId, // Set to null if pending, will be linked later
            amount: parseFloat(amount),
            type: (paymentType as 'enrollment' | 'monthly' | 'custom') || 'custom', // Use 'type' not 'payment_type'
            method: 'paguelofacil' as const, // Use 'method' not 'payment_method'
            payment_date: new Date().toISOString().split('T')[0],
            month_year: monthYear || undefined,
            status: 'Approved' as const, // Paguelo Fácil payments are automatically approved
            notes: paymentNotes,
          };
          
          console.log('[PagueloFacil Callback] Payment data to create:', paymentData);
          
          // If player is pending, insert directly (createPayment requires player_id)
          let createdPayment;
          if (isPendingPlayer) {
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
            createdPayment = await createPayment(paymentData);
          }

          // Revalidate all relevant paths to show updated data
          revalidatePath('/dashboard/players');
          revalidatePath('/dashboard/players/[id]', 'page');
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
              paymentDate: paymentData.payment_date,
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
      console.warn('[PagueloFacil Callback] ⚠️ Payment not created - conditions not met:', {
        isApproved,
        type,
        hasPlayerId: !!playerId,
        hasAmount: !!amount,
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

    // Redirect to appropriate page
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[PagueloFacil Callback] Error processing callback:', error);
    
    // Redirect to error page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/dashboard/finances?paguelofacil=error`);
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/dashboard/finances?paguelofacil=error`);
  }
}
