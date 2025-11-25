import { NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';

/**
 * GET /api/payments/paguelofacil
 * Get PagueloFacil SDK configuration for client-side initialization
 */
export async function GET() {
  try {
    const config = PagueloFacilService.getSDKConfig();
    return NextResponse.json({
      success: true,
      config: {
        apiKey: config.apiKey,
        cclw: config.cclw,
        sandbox: config.sandbox
      }
    });
  } catch (error: any) {
    console.error('Error getting PagueloFacil config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener configuración de Paguelo Fácil' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/paguelofacil
 * Create a payment transaction
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, description, email, orderId, metadata } = body;

    if (!amount || !description || !email) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos (amount, description, email)' },
        { status: 400 }
      );
    }

    const transaction = await PagueloFacilService.createTransaction({
      amount: parseFloat(amount),
      description,
      email,
      orderId,
      metadata
    });

    if (!transaction.success) {
      return NextResponse.json(
        { success: false, error: transaction.error || 'Error al crear la transacción' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.transactionId,
      config: PagueloFacilService.getSDKConfig()
    });
  } catch (error: any) {
    console.error('Error creating PagueloFacil transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}

