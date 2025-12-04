import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { createPayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendPaymentConfirmationEmail } from '@/lib/actions/payment-confirmation';

/**
 * Helper function to get base URL from request headers
 * Prioritizes Vercel headers to ensure correct production URL
 */
function getBaseUrl(request: NextRequest): string {
  // First, try environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    console.log('[getBaseUrl] Using NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Try to construct from Vercel headers
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host');
  
  if (forwardedHost) {
    const url = `${forwardedProto}://${forwardedHost}`;
    console.log('[getBaseUrl] Using x-forwarded-host:', url);
    return url;
  }
  
  if (host) {
    // Determine protocol based on host or default to https for production
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const url = `${protocol}://${host}`;
    console.log('[getBaseUrl] Using host header:', url);
    return url;
  }
  
  // Try origin header
  const origin = request.headers.get('origin');
  if (origin) {
    console.log('[getBaseUrl] Using origin header:', origin);
    return origin;
  }
  
  // Last resort: use request URL
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    console.log('[getBaseUrl] Using request URL:', baseUrl);
    return baseUrl;
  } catch {
    // Final fallback
    const fallback = process.env.NODE_ENV === 'production' 
      ? 'https://sistema-adademia-de-futbol-tura.vercel.app'
      : 'http://localhost:3000';
    console.log('[getBaseUrl] Using fallback:', fallback);
    return fallback;
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
    const baseUrl = getBaseUrl(request);
    console.log('[PagueloFacil Callback] Base URL determined:', baseUrl);

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
    const baseUrl = getBaseUrl(request);
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
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(`${baseUrl}/dashboard/finances?paguelofacil=error`);
  }
}
