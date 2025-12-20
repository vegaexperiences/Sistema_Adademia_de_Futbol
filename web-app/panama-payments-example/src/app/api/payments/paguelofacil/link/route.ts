import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@panama-payments/core';

/**
 * POST /api/payments/paguelofacil/link
 * Creates a payment link that redirects user to PagueloFacil
 * 
 * This is an example API route. Adapt it to your needs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, email, orderId, returnUrl, customParams, expiresIn } = body;

    // Validate required fields
    if (!amount || amount < 1.0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor o igual a $1.00' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const finalReturnUrl = returnUrl || `${baseUrl}/payment/success`;

    // Create payment link
    const link = await PagueloFacilService.createPaymentLink({
      amount,
      description,
      email,
      orderId,
      returnUrl: finalReturnUrl,
      customParams,
      expiresIn: expiresIn || 3600, // 1 hour default
    });

    if (!link.success) {
      return NextResponse.json(
        { error: link.error || 'Error al crear enlace de pago' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: link.paymentUrl,
      code: link.code,
    });
  } catch (error: any) {
    console.error('[PagueloFacil Link] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}



