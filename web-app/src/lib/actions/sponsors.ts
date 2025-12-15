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
    .eq('is_active', true)
    .single();

  if (academyId) {
    query = query.eq('academy_id', academyId);
  }

  const { data, error } = await query;

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

