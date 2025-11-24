import { createClient } from '@/lib/supabase/server';
import TutorsList from '@/components/tutors/TutorsList';

export default async function TutorsPage() {
  const supabase = await createClient();
  
  // Get all players with tutor info
  const { data: players } = await supabase
    .from('players')
    .select('tutor_name, tutor_email, tutor_phone, tutor_cedula')
    .not('tutor_name', 'is', null);
  
  // Get unique tutors and count players
  const tutorsMap = new Map();
  players?.forEach(player => {
    const key = player.tutor_email || player.tutor_name;
    if (key) {
      if (tutorsMap.has(key)) {
        tutorsMap.get(key).playerCount++;
      } else {
        tutorsMap.set(key, {
          name: player.tutor_name,
          email: player.tutor_email,
          phone: player.tutor_phone,
          cedula: player.tutor_cedula,
          playerCount: 1
        });
      }
    }
  });
  
  const tutors = Array.from(tutorsMap.values());

  return <TutorsList tutors={tutors} />;
}
