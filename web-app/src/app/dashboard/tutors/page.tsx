import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import TutorsList from '@/components/tutors/TutorsList';

export default async function TutorsPage() {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();
  
  // Get all players with tutor info (both from families and individual)
  let playersQuery = supabase
    .from('players')
    .select(`
      id,
      tutor_name,
      tutor_email,
      tutor_phone,
      tutor_cedula,
      family_id,
      status,
      families (
        id,
        tutor_name,
        tutor_email,
        tutor_phone,
        tutor_cedula,
        tutor_cedula_url,
        secondary_email
      )
    `);
  
  if (academyId) {
    playersQuery = playersQuery.eq('academy_id', academyId);
  }
  
  const { data: players, error: playersError } = await playersQuery;

  if (playersError) {
    console.error('Error fetching players:', playersError);
  }

  // Also get all families directly to ensure we show family tutors even without players
  let familiesQuery = supabase
    .from('families')
    .select(`
      id,
      tutor_name,
      tutor_email,
      tutor_phone,
      tutor_cedula,
      tutor_cedula_url,
      secondary_email,
      players (id)
    `);
  
  if (academyId) {
    familiesQuery = familiesQuery.eq('academy_id', academyId);
  }
  
  const { data: families, error: familiesError } = await familiesQuery;

  if (familiesError) {
    console.error('Error fetching families:', familiesError);
  }

  console.log('Tutors Page Debug:', {
    playersCount: players?.length || 0,
    familiesCount: families?.length || 0,
    firstFamily: families?.[0],
    firstPlayer: players?.[0]
  });
  
  // Get unique tutors by cedula, email, or name (as fallback identifiers)
  const tutorsMap = new Map<string, any>();

  // First, add tutors from families
  families?.forEach(family => {
    // Accept families if they have tutor_name OR tutor_email OR tutor_cedula
    if (family.tutor_name || family.tutor_email || family.tutor_cedula) {
      const tutorKey = family.tutor_cedula || family.tutor_email || family.tutor_name || `family-${family.id}`;
      if (tutorKey) {
        let playerIds: string[] = [];
        if (Array.isArray(family.players)) {
          playerIds = family.players.map((p: any) => p.id).filter((id: any) => id);
        } else if (family.players && typeof family.players === 'object' && 'id' in family.players) {
          playerIds = [(family.players as any).id].filter((id: any) => id);
        }
        
        tutorsMap.set(tutorKey, {
          name: family.tutor_name || 'Sin nombre',
          email: family.tutor_email || null,
          secondary_email: family.secondary_email || null,
          phone: family.tutor_phone || null,
          cedula: family.tutor_cedula || null,
          cedula_url: family.tutor_cedula_url || null,
          playerIds: playerIds,
          type: 'Family' as const,
          familyId: family.id
        });
      }
    }
  });
  
  players?.forEach(player => {
    let tutorKey: string | null = null;
    let tutorData: any = null;
    
    // Get tutor info from family if exists, otherwise from player
    if (player.family_id && player.families) {
      const family = Array.isArray(player.families) ? player.families[0] : player.families;
      // Use cedula as primary key, fallback to email, then name
      tutorKey = family?.tutor_cedula || family?.tutor_email || family?.tutor_name || null;
      if (tutorKey) {
        tutorData = {
          name: family?.tutor_name || null,
          email: family?.tutor_email || null,
          secondary_email: family?.secondary_email || null,
          phone: family?.tutor_phone || null,
          cedula: family?.tutor_cedula || null,
          cedula_url: family?.tutor_cedula_url || null,
          playerIds: [] as string[],
          type: 'Family' as const,
          familyId: family?.id || null
        };
      }
    } else {
      // Individual player tutor - use email, cedula, or name as key
      tutorKey = player.tutor_cedula || player.tutor_email || player.tutor_name || null;
      if (tutorKey && (player.tutor_name || player.tutor_email)) {
        tutorData = {
          name: player.tutor_name || null,
          email: player.tutor_email || null,
          secondary_email: null,
          phone: player.tutor_phone || null,
          cedula: player.tutor_cedula || null,
          cedula_url: null,
          playerIds: [] as string[],
          type: 'Individual' as const,
          familyId: null
        };
      }
    }
    
    // Add player to tutor's list
    if (tutorKey && tutorData) {
      if (tutorsMap.has(tutorKey)) {
        const existing = tutorsMap.get(tutorKey);
        if (!existing.playerIds.includes(player.id)) {
          existing.playerIds.push(player.id);
        }
        // Update tutor info from player if family info is missing
        if (!existing.name && tutorData.name) existing.name = tutorData.name;
        if (!existing.email && tutorData.email) existing.email = tutorData.email;
        if (!existing.phone && tutorData.phone) existing.phone = tutorData.phone;
        if (!existing.cedula && tutorData.cedula) existing.cedula = tutorData.cedula;
      } else {
        tutorData.playerIds = [player.id];
        tutorsMap.set(tutorKey, tutorData);
      }
    }
  });
  
  // Convert to array and add player count
  const tutors = Array.from(tutorsMap.values()).map(tutor => ({
    ...tutor,
    playerCount: tutor.playerIds.length
  }));

  console.log('Tutors found:', tutors.length, tutors);

  return <TutorsList tutors={tutors} />;
}
