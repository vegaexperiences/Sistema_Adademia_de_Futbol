import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';

/**
 * POST /api/payments/yappy/order
 * Creates a payment order with Yappy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, orderId, returnUrl, metadata, token, paymentDate, ipnUrl } = body;

    // Validate required fields
    if (!amount || amount < 0.01) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor o igual a $0.01' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    if (!orderId || orderId.trim().length === 0) {
      return NextResponse.json(
        { error: 'El ID de orden es requerido' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token de validación requerido. Debe validar el merchant primero llamando a /api/payments/yappy/validate' },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: 'paymentDate (epochTime) requerido. Debe validar el merchant primero llamando a /api/payments/yappy/validate' },
        { status: 400 }
      );
    }

    // Validate orderId length (max 15 characters according to manual)
    if (orderId.length > 15) {
      return NextResponse.json(
        { error: 'El orderId no puede tener más de 15 caracteres' },
        { status: 400 }
      );
    }

    console.log('[Yappy Order] Creating order with /payments/payment-wc:', {
      amount,
      description,
      orderId,
      returnUrl,
      hasToken: !!token,
      paymentDate,
    });

    // Build IPN URL if not provided
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (request.headers.get('origin') || 'http://localhost:3000');
    const finalIpnUrl = ipnUrl || `${baseUrl}/api/payments/yappy/callback`;

    // Create order using the new flow
    const result = await YappyService.createOrder({
      amount: parseFloat(amount),
      description: description.trim(),
      orderId: orderId.trim().substring(0, 15), // Max 15 characters
      returnUrl,
      metadata,
      token, // Token from validation
      paymentDate, // epochTime from validation
      ipnUrl: finalIpnUrl, // IPN URL for callback
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al crear orden de pago' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderData: result.orderData,
      cdnUrl: YappyService.getCdnUrl(),
      merchantId: YappyService.getConfig().merchantId,
    });
  } catch (error: any) {
    console.error('[Yappy Order] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

