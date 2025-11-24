'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getTournaments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getActiveTournament() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching active tournament:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
  
  return data;
}

export async function createTournament(data: {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  categories: string[];
}) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('tournaments')
    .insert([{
      ...data,
      status: 'inactive',
      registration_open: false
    }]);

  if (error) throw error;
  revalidatePath('/dashboard/tournaments');
}

export async function updateTournamentStatus(id: string, status: 'active' | 'inactive' | 'completed') {
  const supabase = await createClient();
  
  // If setting to active, first set all others to inactive (optional rule, but good for single active tournament)
  if (status === 'active') {
    await supabase
      .from('tournaments')
      .update({ status: 'inactive', registration_open: false })
      .neq('id', id);
  }

  const { error } = await supabase
    .from('tournaments')
    .update({ 
      status,
      registration_open: status === 'active' // Auto open registration if active, or manage separately
    })
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/dashboard/tournaments');
  revalidatePath('/tournaments');
}

export async function toggleRegistration(id: string, isOpen: boolean) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('tournaments')
    .update({ registration_open: isOpen })
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/dashboard/tournaments');
  revalidatePath('/tournaments');
}

export async function deleteTournament(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/dashboard/tournaments');
}

export async function registerTeam(data: {
  tournament_id: string;
  team_name: string;
  coach_name: string;
  coach_email: string;
  coach_phone: string;
  category: string;
}) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('tournament_registrations')
    .insert([{
      ...data,
      status: 'pending',
      payment_status: 'pending'
    }]);

  if (error) throw error;
  revalidatePath('/dashboard/tournaments');
}
