import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { getBaseUrlFromRequest } from '@/lib/utils/get-base-url';

/**
 * POST /api/payments/paguelofacil/link
 * Creates a payment link using Paguelo Fácil's LinkDeamon service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, returnUrl, email, orderId, customParams, expiresIn } = body;

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

    console.log('[PagueloFacil Link] Creating payment link with:', {
      amount,
      description,
      email,
      orderId,
      returnUrl: finalReturnUrl,
      customParams,
      baseUrl,
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

