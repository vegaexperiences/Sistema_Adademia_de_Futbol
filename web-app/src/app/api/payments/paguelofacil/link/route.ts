import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { getBaseUrlFromRequest } from '@/lib/utils/get-base-url';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/payments/paguelofacil/link
 * Creates a payment link using Paguelo Fácil's LinkDeamon service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, returnUrl, email, orderId, customParams, expiresIn, enrollmentData } = body;

    // Validate required fields
    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor o igual a $1.00 USD' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    // Build return URL if not provided (automatically detects local/production/ngrok)
    const baseUrl = getBaseUrlFromRequest(request);
    const finalReturnUrl = returnUrl || `${baseUrl}/api/payments/paguelofacil/callback`;

    // Store enrollment data in database if provided (for enrollment payments)
    if (enrollmentData && orderId && customParams?.type === 'enrollment') {
      try {
        const supabase = await createClient();
        // Store in a temporary table or use existing mechanism
        // For now, we'll store it in a JSON column in a temporary storage
        // Using the orderId as the key
        const { error: storeError } = await supabase
          .from('paguelofacil_orders')
          .upsert({
            order_id: orderId,
            enrollment_data: enrollmentData,
            amount: amount,
            type: 'enrollment',
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'order_id',
          });

        if (storeError) {
          console.error('[PagueloFacil Link] Error storing enrollment data:', storeError);
          // Don't fail - we'll try to get it from URL params as fallback
        } else {
          console.log('[PagueloFacil Link] ✅ Stored enrollment data for orderId:', orderId);
        }
      } catch (storeErr: any) {
        console.error('[PagueloFacil Link] Error storing enrollment data:', storeErr);
        // Don't fail - continue with payment link creation
      }
    }

    console.log('[PagueloFacil Link] Creating payment link with:', {
      amount,
      description,
      email,
      orderId,
      returnUrl: finalReturnUrl,
      customParams,
      baseUrl,
      hasEnrollmentData: !!enrollmentData,
    });

    // Create payment link
    const result = await PagueloFacilService.createPaymentLink({
      amount: parseFloat(amount),
      description: description.trim(),
      returnUrl: finalReturnUrl,
      email,
      orderId,
      customParams,
      expiresIn: expiresIn ? parseInt(expiresIn) : 3600,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al generar enlace de pago' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      code: result.code,
    });
  } catch (error: any) {
    console.error('[PagueloFacil API] Error creating payment link:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

