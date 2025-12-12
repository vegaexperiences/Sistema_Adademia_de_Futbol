import { NextRequest, NextResponse } from 'next/server';
import { getBusinessProjection } from '@/lib/actions/reports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12', 10);

    const projection = await getBusinessProjection(months);
    return NextResponse.json(projection);
  } catch (error) {
    console.error('Error fetching business projection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business projection' },
      { status: 500 }
    );
  }
}

