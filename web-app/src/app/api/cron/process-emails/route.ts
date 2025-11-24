import { processEmailQueue } from '@/lib/actions/email-queue';
import { NextResponse } from 'next/server';

// This endpoint can be called by Vercel Cron or manually
// Example cron: 0 9 * * * (every day at 9 AM)
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate cron call (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processEmailQueue();
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cron email processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process email queue', details: error.message },
      { status: 500 }
    );
  }
}

// Allow manual POST calls for testing
export async function POST() {
  const result = await processEmailQueue();
  return NextResponse.json(result);
}
