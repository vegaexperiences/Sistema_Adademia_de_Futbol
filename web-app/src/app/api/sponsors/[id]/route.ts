import { NextResponse } from 'next/server';
import { getSponsorById } from '@/lib/actions/sponsors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de sponsor requerido' },
        { status: 400 }
      );
    }

    const result = await getSponsorById(id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Sponsor not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error('[API /sponsors/[id]] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener sponsor' },
      { status: 500 }
    );
  }
}

