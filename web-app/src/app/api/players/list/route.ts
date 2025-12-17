import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const academyId = await getCurrentAcademyId();

    console.log('[players/list] Academy ID:', academyId);

    // If no academy_id, return empty array to avoid RLS issues
    // Similar to how getPlayers() handles this
    if (!academyId) {
      console.warn('[players/list] ⚠️ No academy_id found - returning empty array to avoid RLS issues');
      return NextResponse.json({ players: [] });
    }

    // Build query with academy_id filter - use select('*') like getPlayers() does
    console.log('[players/list] Building query for academy_id:', academyId);
    
    let baseQuery = supabase
      .from('players')
      .select('*')
      .order('first_name', { ascending: true });
    
    if (academyId) {
      baseQuery = baseQuery.eq('academy_id', academyId);
      console.log('[players/list] Filtering by academy_id:', academyId);
    }

    const { data: allPlayers, error } = await baseQuery;

    if (error) {
      console.error('[players/list] ❌ Error fetching players:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      // Return empty array instead of error to prevent UI issues
      return NextResponse.json({ players: [] });
    }

    console.log('[players/list] ✅ Base query succeeded with', allPlayers?.length || 0, 'players');

    // Map to only return needed fields
    const players = allPlayers?.map((p: any) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      cedula: p.cedula,
      email: p.email,
      status: p.status
    })) || [];

    console.log('[players/list] ✅ Mapped', players.length, 'players for response');
    return NextResponse.json({ players });
  } catch (error: any) {
    console.error('[players/list] Exception:', error);
    // Return empty array instead of error to prevent UI issues
    return NextResponse.json({ players: [] });
  }
}

