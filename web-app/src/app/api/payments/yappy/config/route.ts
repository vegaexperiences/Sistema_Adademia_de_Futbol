import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';

/**
 * GET /api/payments/yappy/config
 * Returns Yappy configuration for frontend (merchant ID and CDN URL)
 */
export async function GET(request: NextRequest) {
  try {
    const config = YappyService.getConfig();
    
    return NextResponse.json({
      success: true,
      merchantId: config.merchantId,
      cdnUrl: YappyService.getCdnUrl(),
      environment: config.environment,
      domainUrl: config.domainUrl,
    });
  } catch (error: any) {
    console.error('[Yappy Config] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener configuración de Yappy' 
      },
      { status: 500 }
    );
  }
}

