import { createClient } from '@/lib/supabase/server';
import FamiliesList from '@/components/families/FamiliesList';

export default async function FamiliesPage() {
  const supabase = await createClient();
  
  const { data: families } = await supabase
    .from('families')
    .select('*, players(id, first_name, last_name, status)')
    .order('tutor_name');
  
  // Filter to only show approved players (Active or Scholarship) and only families with at least one approved player
  const familiesWithApprovedPlayers = families
    ?.map(family => ({
      ...family,
      players: family.players?.filter((player: any) => 
        player.status === 'Active' || player.status === 'Scholarship'
      ) || []
    }))
    .filter(family => family.players.length > 0) || []; // Only show families with at least one approved player

  return <FamiliesList families={familiesWithApprovedPlayers} />;
}
