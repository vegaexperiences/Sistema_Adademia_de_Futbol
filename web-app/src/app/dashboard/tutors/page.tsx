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
  
  // Get unique tutors by cedula, email, or name (as fallback identifiers)
  const tutorsMap = new Map<string, any>();
  
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

  return <TutorsList tutors={tutors} />;
}
