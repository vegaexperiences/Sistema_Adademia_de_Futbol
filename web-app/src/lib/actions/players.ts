'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPlayers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('players')
    .select('*, families(name, tutor_name, tutor_email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }

  return data;
}

export async function createPlayer(formData: FormData) {
  const supabase = await createClient();
  
  const player = {
    first_name: formData.get('firstName'),
    last_name: formData.get('lastName'),
    birth_date: formData.get('birthDate'),
    gender: formData.get('gender'),
    cedula: formData.get('cedula'),
    category: formData.get('category'),
    status: 'Active',
    // family_id would be linked here in a real scenario
  };

  const { error } = await supabase.from('players').insert(player);

  if (error) {
    return { error: 'Error creating player' };
  }

  revalidatePath('/dashboard/players');
  return { success: true };
}
