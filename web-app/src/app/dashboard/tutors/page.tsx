import { createClient } from '@/lib/supabase/server';
import TutorsList from '@/components/tutors/TutorsList';

export default async function TutorsPage() {
  const supabase = await createClient();
  
  // Get all players with tutor info (both from families and individual)
  const { data: players } = await supabase
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
  
  // Get unique tutors by cedula (primary identifier)
  const tutorsMap = new Map<string, any>();
  
  players?.forEach(player => {
    let tutorCedula: string | null = null;
    let tutorData: any = null;
    
    // Get tutor info from family if exists, otherwise from player
    if (player.family_id && player.families) {
      const family = Array.isArray(player.families) ? player.families[0] : player.families;
      tutorCedula = family?.tutor_cedula || null;
      tutorData = {
        name: family?.tutor_name || null,
        email: family?.tutor_email || null,
        secondary_email: family?.secondary_email || null,
        phone: family?.tutor_phone || null,
        cedula: tutorCedula,
        cedula_url: family?.tutor_cedula_url || null,
        playerIds: [] as string[],
        type: 'Family' as const
      };
    } else if (player.tutor_cedula) {
      tutorCedula = player.tutor_cedula;
      tutorData = {
        name: player.tutor_name || null,
        email: player.tutor_email || null,
        secondary_email: null,
        phone: player.tutor_phone || null,
        cedula: tutorCedula,
        cedula_url: null,
        playerIds: [] as string[],
        type: 'Individual' as const
      };
    }
    
    // Add player to tutor's list
    if (tutorCedula && tutorData) {
      if (tutorsMap.has(tutorCedula)) {
        const existing = tutorsMap.get(tutorCedula);
        if (!existing.playerIds.includes(player.id)) {
          existing.playerIds.push(player.id);
        }
      } else {
        tutorData.playerIds = [player.id];
        tutorsMap.set(tutorCedula, tutorData);
      }
    }
  });
  
  // Convert to array and add player count
  const tutors = Array.from(tutorsMap.values()).map(tutor => ({
    ...tutor,
    playerCount: tutor.playerIds.length
  }));

  return <TutorsList tutors={tutors} />;
}
