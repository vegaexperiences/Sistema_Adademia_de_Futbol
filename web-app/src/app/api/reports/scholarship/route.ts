import { NextRequest, NextResponse } from 'next/server';
import { getScholarshipImpactAnalysis } from '@/lib/actions/reports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const analysis = await getScholarshipImpactAnalysis(startDate, endDate);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error fetching scholarship analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scholarship analysis' },
      { status: 500 }
    );
  }
}

