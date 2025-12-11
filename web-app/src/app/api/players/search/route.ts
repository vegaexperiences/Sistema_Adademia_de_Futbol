import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ players: [] });
    }

    const supabase = await createClient();
    const searchTerm = `%${query}%`;

    // Search in players table
    const { data: players, error } = await supabase
      .from('players')
      .select('id, first_name, last_name, cedula, email')
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},cedula.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .limit(10);

    if (error) {
      console.error('Error searching players:', error);
      return NextResponse.json({ error: 'Error al buscar jugadores' }, { status: 500 });
    }

    return NextResponse.json({ players: players || [] });
  } catch (error: any) {
    console.error('Error in search route:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

