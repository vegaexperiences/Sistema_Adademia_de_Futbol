'use server';

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Sponsor {
  id: string;
  name: string;
  description?: string;
  amount: number;
  benefits: string[];
  is_active: boolean;
  display_order: number;
  image_url?: string;
  academy_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SponsorRegistration {
  id: string;
  sponsor_id: string;
  sponsor_name: string;
  sponsor_email?: string;
  sponsor_phone?: string;
  sponsor_cedula?: string;
  sponsor_company?: string;
  payment_id?: string;
  status: 'pending' | 'approved' | 'cancelled';
  notes?: string;
  academy_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all active sponsors
 */
export async function getAllSponsors(): Promise<{ data: Sponsor[] | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  let query = supabase
    .from('sponsors')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('amount', { ascending: true });

  if (academyId) {
    query = query.eq('academy_id', academyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getAllSponsors] Error:', error);
    return { data: null, error: error.message };
  }

  // Parse benefits JSONB to array
  const formattedData: Sponsor[] = (data || []).map((sponsor: any) => ({
    ...sponsor,
    benefits: Array.isArray(sponsor.benefits) ? sponsor.benefits : [],
  }));

  return { data: formattedData, error: null };
}

/**
 * Get sponsor by ID
 */
export async function getSponsorById(id: string): Promise<{ data: Sponsor | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  let query = supabase
    .from('sponsors')
    .select('*')
    .eq('id', id)
    .eq('is_active', true);

  if (academyId) {
    query = query.eq('academy_id', academyId);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[getSponsorById] Error:', error);
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: 'Sponsor not found' };
  }

  // Parse benefits JSONB to array
  const formattedData: Sponsor = {
    ...data,
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
  };

  return { data: formattedData, error: null };
}

/**
 * Create sponsor registration
 */
export async function createSponsorRegistration(
  data: {
    sponsor_id: string;
    sponsor_name: string;
    sponsor_email?: string;
    sponsor_phone?: string;
    sponsor_cedula?: string;
    sponsor_company?: string;
    payment_id?: string;
    notes?: string;
  }
): Promise<{ data: SponsorRegistration | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return { data: null, error: 'No academy context found' };
  }

  const registrationData = {
    ...data,
    academy_id: academyId,
    status: 'pending' as const,
  };

  const { data: registration, error } = await supabase
    .from('sponsor_registrations')
    .insert(registrationData)
    .select()
    .single();

  if (error) {
    console.error('[createSponsorRegistration] Error:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/sponsors');
  revalidatePath('/dashboard/finances');

  return { data: registration, error: null };
}

/**
 * Get all sponsor registrations (admin only)
 */
export async function getSponsorRegistrations(): Promise<{ data: SponsorRegistration[] | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  let query = supabase
    .from('sponsor_registrations')
    .select(`
      *,
      sponsors (
        id,
        name,
        amount
      )
    `)
    .order('created_at', { ascending: false });

  if (academyId) {
    query = query.eq('academy_id', academyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getSponsorRegistrations] Error:', error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * Update sponsor registration status
 */
export async function updateSponsorStatus(
  id: string,
  status: 'pending' | 'approved' | 'cancelled'
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('sponsor_registrations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[updateSponsorStatus] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/sponsors');
  revalidatePath('/dashboard/finances');

  return { success: true, error: null };
}

export interface SponsorRegistrationWithPlayers extends SponsorRegistration {
  sponsors?: Sponsor;
  players?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    cedula?: string;
    category?: string;
    assigned_at: string;
    notes?: string;
  }>;
}

/**
 * Get all sponsor registrations with their assigned players
 */
export async function getSponsorRegistrationsWithPlayers(): Promise<{ data: SponsorRegistrationWithPlayers[] | null; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  let query = supabase
    .from('sponsor_registrations')
    .select(`
      *,
      sponsors (
        id,
        name,
        amount,
        description,
        benefits
      ),
      sponsor_player_assignments (
        id,
        assigned_at,
        notes,
        players (
          id,
          first_name,
          last_name,
          cedula,
          category
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (academyId) {
    query = query.eq('academy_id', academyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getSponsorRegistrationsWithPlayers] Error:', error);
    return { data: null, error: error.message };
  }

  // Format the data to include players in a flat structure
  const formattedData: SponsorRegistrationWithPlayers[] = (data || []).map((registration: any) => ({
    ...registration,
    sponsors: Array.isArray(registration.sponsors) ? registration.sponsors[0] : registration.sponsors,
    players: (registration.sponsor_player_assignments || []).map((assignment: any) => ({
      id: assignment.players?.id,
      first_name: assignment.players?.first_name,
      last_name: assignment.players?.last_name,
      cedula: assignment.players?.cedula,
      category: assignment.players?.category,
      assigned_at: assignment.assigned_at,
      notes: assignment.notes,
    })).filter((p: any) => p.id), // Filter out any null players
  }));

  return { data: formattedData, error: null };
}

/**
 * Assign a player to a sponsor
 */
export async function assignPlayerToSponsor(
  sponsorRegistrationId: string,
  playerId: string,
  notes?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return { success: false, error: 'No academy context found' };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  // Verify sponsor registration exists and belongs to current academy
  const { data: registration, error: regError } = await supabase
    .from('sponsor_registrations')
    .select('id, academy_id')
    .eq('id', sponsorRegistrationId)
    .eq('academy_id', academyId)
    .single();

  if (regError || !registration) {
    return { success: false, error: 'Sponsor registration not found' };
  }

  // Verify player exists and belongs to current academy
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, academy_id')
    .eq('id', playerId)
    .eq('academy_id', academyId)
    .single();

  if (playerError || !player) {
    return { success: false, error: 'Player not found' };
  }

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('sponsor_player_assignments')
    .select('id')
    .eq('sponsor_registration_id', sponsorRegistrationId)
    .eq('player_id', playerId)
    .single();

  if (existing) {
    return { success: false, error: 'Player is already assigned to this sponsor' };
  }

  // Create assignment
  const { error } = await supabase
    .from('sponsor_player_assignments')
    .insert({
      sponsor_registration_id: sponsorRegistrationId,
      player_id: playerId,
      academy_id: academyId,
      assigned_by: user.id,
      notes: notes || null,
    });

  if (error) {
    console.error('[assignPlayerToSponsor] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');

  return { success: true, error: null };
}

/**
 * Remove a player from a sponsor
 */
export async function removePlayerFromSponsor(
  assignmentId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('sponsor_player_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('[removePlayerFromSponsor] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');

  return { success: true, error: null };
}

/**
 * Get all players assigned to a specific sponsor
 */
export async function getPlayersForSponsor(
  sponsorRegistrationId: string
): Promise<{ data: Array<{
  id: string;
  first_name: string;
  last_name: string;
  cedula?: string;
  category?: string;
  assigned_at: string;
  notes?: string;
}> | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sponsor_player_assignments')
    .select(`
      id,
      assigned_at,
      notes,
      players (
        id,
        first_name,
        last_name,
        cedula,
        category
      )
    `)
    .eq('sponsor_registration_id', sponsorRegistrationId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('[getPlayersForSponsor] Error:', error);
    return { data: null, error: error.message };
  }

  const formattedData = (data || [])
    .map((assignment: any) => ({
      id: assignment.players?.id,
      first_name: assignment.players?.first_name,
      last_name: assignment.players?.last_name,
      cedula: assignment.players?.cedula,
      category: assignment.players?.category,
      assigned_at: assignment.assigned_at,
      notes: assignment.notes,
    }))
    .filter((p: any) => p.id); // Filter out any null players

  return { data: formattedData, error: null };
}

/**
 * Get all sponsors for a specific player
 */
export async function getSponsorsForPlayer(
  playerId: string
): Promise<{ data: Array<{
  id: string;
  sponsor_name: string;
  sponsor_email?: string;
  sponsor_level: string;
  assigned_at: string;
  notes?: string;
}> | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sponsor_player_assignments')
    .select(`
      id,
      assigned_at,
      notes,
      sponsor_registrations (
        id,
        sponsor_name,
        sponsor_email,
        sponsors (
          name
        )
      )
    `)
    .eq('player_id', playerId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('[getSponsorsForPlayer] Error:', error);
    return { data: null, error: error.message };
  }

  const formattedData = (data || [])
    .map((assignment: any) => {
      const registration = Array.isArray(assignment.sponsor_registrations) 
        ? assignment.sponsor_registrations[0] 
        : assignment.sponsor_registrations;
      const sponsor = Array.isArray(registration?.sponsors)
        ? registration.sponsors[0]
        : registration?.sponsors;
      
      return {
        id: assignment.id,
        sponsor_name: registration?.sponsor_name,
        sponsor_email: registration?.sponsor_email,
        sponsor_level: sponsor?.name || 'N/A',
        assigned_at: assignment.assigned_at,
        notes: assignment.notes,
      };
    })
    .filter((s: any) => s.id);

  return { data: formattedData, error: null };
}

