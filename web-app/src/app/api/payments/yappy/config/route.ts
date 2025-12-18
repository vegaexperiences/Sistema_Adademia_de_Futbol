import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/payments/yappy/config
 * Returns Yappy configuration for frontend (merchant ID and CDN URL)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Single-tenant: pass null for academyId
    const config = await YappyService.getConfig(null);
    const cdnUrl = await YappyService.getCdnUrl(null);
    
    return NextResponse.json({
      success: true,
      merchantId: config.merchantId,
      cdnUrl,
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
