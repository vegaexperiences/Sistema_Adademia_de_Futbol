'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { queueEmail } from '@/lib/actions/email-queue';

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
  coach_cedula?: string;
  category: string;
}) {
  const supabase = await createClient();
  
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, start_date, location')
    .eq('id', data.tournament_id)
    .single();
  
  const { error } = await supabase
    .from('tournament_registrations')
    .insert([{
      ...data,
      status: 'pending',
      payment_status: 'pending'
    }]);

  if (error) throw error;
  revalidatePath('/dashboard/tournaments');
  revalidatePath('/dashboard/approvals');

  if (tournament) {
    try {
      await queueEmail('tournament_registration_received', data.coach_email, {
        coachName: data.coach_name,
        teamName: data.team_name,
        tournamentName: tournament.name,
        tournamentDate: tournament.start_date
          ? new Date(tournament.start_date).toLocaleDateString('es-ES')
          : '',
        tournamentLocation: tournament.location || 'Por confirmar',
        category: data.category,
      });
    } catch (err) {
      console.error('Error sending registration confirmation:', err);
    }
  }
}

export async function getPendingTournamentRegistrations() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      *,
      tournaments:tournament_id (
        name,
        start_date,
        end_date,
        location
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tournament registrations:', error);
    return [];
  }

  return data || [];
}

export async function approveTournamentRegistration(id: string) {
  const supabase = await createClient();

  const { data: registration, error } = await supabase
    .from('tournament_registrations')
    .select(`
      *,
      tournaments:tournament_id (
        name,
        start_date,
        location
      )
    `)
    .eq('id', id)
    .single();

  if (error || !registration) {
    console.error('Error fetching registration for approval:', error);
    return { error: 'Registro no encontrado' };
  }

  const { error: updateError } = await supabase
    .from('tournament_registrations')
    .update({ status: 'approved' })
    .eq('id', id);

  if (updateError) {
    console.error('Error approving registration:', updateError);
    return { error: 'No se pudo aprobar el registro' };
  }

  try {
    await queueEmail('tournament_registration_approved', registration.coach_email, {
      coachName: registration.coach_name,
      teamName: registration.team_name,
      tournamentName: registration.tournaments?.name || 'Torneo',
      tournamentDate: registration.tournaments?.start_date
        ? new Date(registration.tournaments.start_date).toLocaleDateString('es-ES')
        : '',
      tournamentLocation: registration.tournaments?.location || 'Por confirmar',
      category: registration.category,
      nextSteps: 'Confirma asistencia y presenta tus comprobantes el día del evento.',
    });
  } catch (err) {
    console.error('Error sending approval email:', err);
  }

  revalidatePath('/dashboard/approvals');
  revalidatePath('/dashboard/tournaments');
  return { success: true };
}

export async function rejectTournamentRegistration(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tournament_registrations')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) {
    console.error('Error rejecting registration:', error);
    return { error: 'No se pudo rechazar el registro' };
  }

  revalidatePath('/dashboard/approvals');
  revalidatePath('/dashboard/tournaments');
  return { success: true };
}
