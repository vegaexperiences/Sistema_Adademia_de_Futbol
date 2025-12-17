import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@panama-payments/core';

/**
 * POST /api/payments/yappy/order
 * Creates a payment order with Yappy
 * 
 * This is an example API route. Adapt it to your needs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, orderId, returnUrl, metadata, token, paymentDate, ipnUrl, aliasYappy } = body;

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

    if (!token || !paymentDate) {
      return NextResponse.json(
        { error: 'Token y paymentDate requeridos. Debe validar el merchant primero.' },
        { status: 400 }
      );
    }

    if (orderId.length > 15) {
      return NextResponse.json(
        { error: 'El orderId no puede tener más de 15 caracteres' },
        { status: 400 }
      );
    }

    const baseUrlForCallback = process.env.NEXT_PUBLIC_APP_URL || '';

    const order = await YappyService.createOrder({
      amount,
      description,
      orderId,
      returnUrl,
      metadata,
      token,
      paymentDate,
      ipnUrl: ipnUrl || `${baseUrlForCallback}/api/payments/yappy/callback`,
      aliasYappy,
    }, undefined, undefined, baseUrlForCallback);

    if (!order.success) {
      return NextResponse.json(
        { error: order.error || 'Error al crear orden' },
        { status: order.isClientError ? 400 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderData: order.orderData,
    });
  } catch (error: any) {
    console.error('[Yappy Order] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la orden' },
      { status: 500 }
    );
  }
}

