import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';

/**
 * POST /api/payments/yappy/order
 * Creates a payment order with Yappy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, orderId, returnUrl, metadata } = body;

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

    console.log('[Yappy Order] Creating order:', {
      amount,
      description,
      orderId,
      returnUrl,
    });

    // Build return URL if not provided
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (request.headers.get('origin') || 'http://localhost:3000');
    const finalReturnUrl = returnUrl || `${baseUrl}/api/payments/yappy/callback`;

    // Create order
    const result = await YappyService.createOrder({
      amount: parseFloat(amount),
      description: description.trim(),
      orderId: orderId.trim(),
      returnUrl: finalReturnUrl,
      metadata,
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

