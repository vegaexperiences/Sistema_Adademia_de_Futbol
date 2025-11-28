import { createClient } from '@/lib/supabase/server';
import FamiliesList from '@/components/families/FamiliesList';

export default async function FamiliesPage() {
  const supabase = await createClient();
  
  const { data: families } = await supabase
    .from('families')
    .select('*, players(id, first_name, last_name, status)')
    .order('tutor_name');

  // Filter to only show approved players (Active or Scholarship) and only families with at least 2 approved players
  const familiesWithApprovedPlayers = families
    ?.map(family => ({
      ...family,
      players: family.players?.filter((player: any) => 
        player.status === 'Active' || player.status === 'Scholarship'
      ) || []
    }))
    .filter(family => family.players.length >= 2) || []; // Only show families with 2+ approved players

  return <FamiliesList families={familiesWithApprovedPlayers} />;
}
