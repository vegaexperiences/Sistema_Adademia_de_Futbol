import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilTokenizationService } from '@/lib/payments/paguelofacil-tokenization';

/**
 * POST /api/payments/paguelofacil/tokenize
 * Tokenize a credit card for secure storage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardData, email } = body;

    // Validate required fields
    if (!cardData || !email) {
      return NextResponse.json(
        { success: false, error: 'cardData y email son requeridos' },
        { status: 400 }
      );
    }

    // Validate card data structure
    const requiredFields = ['cardNumber', 'cardholderName', 'cvv', 'expiryMonth', 'expiryYear'];
    const missingFields = requiredFields.filter((field) => !cardData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Campos faltantes: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Tokenize the card
    const result = await PagueloFacilTokenizationService.tokenizeCard({
      cardData,
      email,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error al tokenizar la tarjeta' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      token: result.token || result.cardToken,
      cardToken: result.cardToken,
    });
  } catch (error: any) {
    console.error('[PagueloFacil] Tokenize error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al tokenizar la tarjeta' },
      { status: 500 }
    );
  }
}

