'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getFamilies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('families')
    .select('*, players(id, status)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching families:', error);
    return [];
  }

  // Filter families with >= 2 approved players (Active or Scholarship)
  return data.filter((f: any) => {
    const approvedCount = f.players?.filter((p: any) => 
      p.status === 'Active' || p.status === 'Scholarship'
    ).length || 0;
    return approvedCount >= 2;
  });
}

export async function createFamily(formData: FormData) {
  const supabase = await createClient();
  
  const family = {
    name: formData.get('name'),
    tutor_name: formData.get('tutorName'),
    tutor_cedula: formData.get('tutorCedula'),
    tutor_email: formData.get('tutorEmail'),
    tutor_phone: formData.get('tutorPhone'),
  };

  const { error } = await supabase.from('families').insert(family);

  if (error) {
    return { error: 'Error creating family' };
  }

  revalidatePath('/dashboard/families');
  return { success: true };
}
