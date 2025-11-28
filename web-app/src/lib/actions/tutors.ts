'use server';

import { createClient } from '@/lib/supabase/server';

export async function getAllTutors() {
  const supabase = await createClient();

  // Fetch players with family info
  const { data: players, error } = await supabase
    .from('players')
    .select(`
      tutor_name,
      tutor_cedula,
      tutor_email,
      tutor_phone,
      family_id,
      families (
        tutor_name,
        tutor_cedula,
        tutor_email,
        tutor_phone
      )
    `);

  if (error) {
    console.error('Error fetching tutors:', error);
    return [];
  }

  // Map to unified Tutor object and deduplicate
  const tutorsMap = new Map();

  players.forEach((p: any) => {
    let tutor;
    if (p.family_id && p.families) {
      tutor = {
        name: p.families.tutor_name,
        cedula: p.families.tutor_cedula,
        email: p.families.tutor_email,
        phone: p.families.tutor_phone,
        type: 'Family'
      };
    } else {
      tutor = {
        name: p.tutor_name,
        cedula: p.tutor_cedula,
        email: p.tutor_email,
        phone: p.tutor_phone,
        type: 'Individual'
      };
    }

    if (tutor.name) {
      // Use Cedula or Name as key
      const key = tutor.cedula || tutor.name;
      if (!tutorsMap.has(key)) {
        tutorsMap.set(key, tutor);
      }
    }
  });

  return Array.from(tutorsMap.values());
}

export async function updateSecondaryEmail(familyId: string, email: string | null) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('families')
    .update({ secondary_email: email })
    .eq('id', familyId);

  if (error) {
    console.error('Error updating secondary email:', error);
    return { error: 'Error al actualizar el email secundario' };
  }

  return { success: true };
}
