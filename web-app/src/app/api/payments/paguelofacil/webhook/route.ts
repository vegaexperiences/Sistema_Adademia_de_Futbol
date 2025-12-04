import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { createPayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendPaymentConfirmationEmail } from '@/lib/actions/payment-confirmation';

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
    const type = webhookData.type || webhookData.Tipo || '';
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
      type,
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

            // Only include month_year if it has a valid value
            if (monthYear && monthYear.trim() !== '') {
              paymentData.month_year = monthYear;
            }

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

            // Only include month_year if it has a valid value
            if (monthYear && monthYear.trim() !== '') {
              paymentData.month_year = monthYear;
            }

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

