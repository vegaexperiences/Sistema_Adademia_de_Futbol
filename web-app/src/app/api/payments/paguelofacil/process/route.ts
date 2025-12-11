import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilTokenizationService } from '@/lib/payments/paguelofacil-tokenization';
import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/payments/paguelofacil/process
 * Process a direct payment using token or card data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      description,
      email,
      orderId,
      cardToken,
      cardData,
      metadata,
    } = body;

    // Validate required fields
    if (!amount || !description || !email) {
      return NextResponse.json(
        { success: false, error: 'amount, description y email son requeridos' },
        { status: 400 }
      );
    }

    // Must have either cardToken or cardData
    if (!cardToken && !cardData) {
      return NextResponse.json(
        { success: false, error: 'Se requiere cardToken o cardData' },
        { status: 400 }
      );
    }

    // Get academy ID for payment config
    const academyId = await getCurrentAcademyId();

    // Process the payment
    const result = await PagueloFacilTokenizationService.processPayment({
      amount: parseFloat(amount),
      description,
      email,
      orderId,
      cardToken,
      cardData,
      metadata,
    }, academyId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error al procesar el pago' },
        { status: 400 }
      );
    }

    // If payment was successful and metadata contains playerId or familyId, create payment record
    if (result.transactionId && metadata) {
      try {
        const supabase = await createClient();

        // Extract payment type and related IDs from metadata
        const { playerId, familyId, paymentType, monthYear } = metadata;

        if (playerId) {
          // Create payment record in database
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              player_id: playerId,
              amount: parseFloat(amount),
              payment_type: paymentType || 'custom',
              payment_method: 'paguelofacil',
              payment_date: new Date().toISOString().split('T')[0],
              month_year: monthYear || null,
              notes: `Pago procesado mediante Paguelo Fácil. Transacción: ${result.transactionId}`,
            });

          if (paymentError) {
            console.error('[PagueloFacil] Error creating payment record:', paymentError);
            // Don't fail the request if payment record creation fails
          } else {
            // Revalidate relevant paths
            if (playerId) {
              revalidatePath(`/dashboard/players/${playerId}`);
            }
            if (familyId) {
              revalidatePath(`/dashboard/families/${familyId}`);
            }
            revalidatePath('/dashboard/finance');
          }
        }
      } catch (dbError: any) {
        console.error('[PagueloFacil] Error handling payment record:', dbError);
        // Don't fail the payment if DB operations fail
      }
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      operationId: result.operationId,
      status: result.status,
    });
  } catch (error: any) {
    console.error('[PagueloFacil] Process payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}

