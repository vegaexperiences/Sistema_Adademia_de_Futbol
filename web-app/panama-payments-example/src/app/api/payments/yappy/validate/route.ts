import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@panama-payments/core';

/**
 * POST /api/payments/yappy/validate
 * Validates Yappy merchant credentials
 * 
 * This is an example API route. Adapt it to your needs.
 */
export async function POST(request: NextRequest) {
  try {
    // Option 1: Use environment variables (automatic)
    const result = await YappyService.validateMerchant();

    // Option 2: Pass config directly
    // const config = {
    //   merchantId: process.env.YAPPY_MERCHANT_ID!,
    //   secretKey: process.env.YAPPY_SECRET_KEY!,
    //   domainUrl: process.env.YAPPY_DOMAIN_URL!,
    //   environment: 'production'
    // };
    // const result = await YappyService.validateMerchant(config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al validar credenciales' },
        { status: 401 }
      );
    }

    const config = await YappyService.getConfig();
    const cdnUrl = YappyService.getCdnUrl(config);

    return NextResponse.json({
      success: true,
      token: result.token,
      epochTime: result.epochTime,
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



