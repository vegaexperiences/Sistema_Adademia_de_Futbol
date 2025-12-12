import { NextRequest, NextResponse } from 'next/server';
import { getOKRsData } from '@/lib/actions/reports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'monthly') as 'monthly' | 'quarterly' | 'annual';

    const okrs = await getOKRsData(period);
    return NextResponse.json(okrs);
  } catch (error) {
    console.error('Error fetching OKRs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OKRs' },
      { status: 500 }
    );
  }
}

