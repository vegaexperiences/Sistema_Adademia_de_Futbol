import { sendMonthlyStatements } from '@/lib/actions/monthly-statements';
import { NextResponse } from 'next/server';

// This endpoint is called by Vercel Cron to send monthly statements automatically
// Schedule: 0 8 * * * (every day at 8 AM)
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = request.headers.get('authorization');
    const vercelSignature = request.headers.get('x-vercel-signature');
    
    // Allow Vercel Cron (has signature) or manual calls with CRON_SECRET
    if (process.env.CRON_SECRET) {
      if (!vercelSignature && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[send-monthly-statements] Cron job started');
    
    const result = await sendMonthlyStatements();
    
    console.log('[send-monthly-statements] Cron job completed:', result);
    
    return NextResponse.json({
      success: result.success,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[send-monthly-statements] Cron error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process monthly statements', 
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Allow manual POST calls for testing
export async function POST() {
  try {
    console.log('[send-monthly-statements] Manual trigger started');
    
    const result = await sendMonthlyStatements();
    
    console.log('[send-monthly-statements] Manual trigger completed:', result);
    
    return NextResponse.json({
      success: result.success,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[send-monthly-statements] Manual trigger error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process monthly statements', 
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

