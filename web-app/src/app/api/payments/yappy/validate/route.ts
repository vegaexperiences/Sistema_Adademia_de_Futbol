import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';

/**
 * POST /api/payments/yappy/validate
 * Validates Yappy merchant credentials
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Yappy Validate] Validating merchant credentials...');

    const result = await YappyService.validateMerchant();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al validar credenciales' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      cdnUrl: YappyService.getCdnUrl(),
      merchantId: YappyService.getConfig().merchantId,
    });
  } catch (error: any) {
    console.error('[Yappy Validate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la validación' },
      { status: 500 }
    );
  }
}

