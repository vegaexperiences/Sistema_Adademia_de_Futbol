import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';
import { getCurrentAcademyId } from '@/lib/supabase/server';

/**
 * POST /api/payments/yappy/validate
 * Validates Yappy merchant credentials
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Yappy Validate] Validating merchant credentials...');

    const academyId = await getCurrentAcademyId();
    const result = await YappyService.validateMerchant(academyId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al validar credenciales' },
        { status: 401 }
      );
    }

    const config = await YappyService.getConfig(academyId);
    const cdnUrl = await YappyService.getCdnUrl(academyId);

    return NextResponse.json({
      success: true,
      token: result.token,
      epochTime: result.epochTime, // Required for creating orders
      cdnUrl,
      merchantId: config.merchantId,
    });
  } catch (error: any) {
    console.error('[Yappy Validate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la validación' },
      { status: 500 }
    );
  }
}

