import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    console.log('[players/list] Fetching all players (single-tenant)');

    // Single-tenant: fetch all players
    const { data: allPlayers, error } = await supabase
      .from('players')
      .select('*')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('[players/list] Error fetching players:', error);
      return NextResponse.json({ players: [] });
    }

    console.log(`[players/list] Found ${allPlayers?.length || 0} players`);

    // Map to only return needed fields
    const players = allPlayers?.map((p: any) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      cedula: p.cedula,
      email: p.email,
      status: p.status
    })) || [];

    return NextResponse.json({ players });
  } catch (error: any) {
    console.error('[players/list] Exception:', error);
    return NextResponse.json({ players: [] });
  }
}
