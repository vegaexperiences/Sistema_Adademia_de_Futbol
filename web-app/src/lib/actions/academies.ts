/**
 * TEMPORARY STUB - Academies actions for compatibility during migration
 * Single-tenant: these return empty/null as academies table no longer exists
 */

'use server';

export interface Academy {
  id: string;
  name: string;
  display_name?: string;
}

export async function getAllAcademies(): Promise<{ data: Academy[] | null; error: string | null }> {
  // Single-tenant: return empty array
  return { data: [], error: null };
}

export async function getAcademyById(id: string): Promise<{ data: Academy | null; error: string | null }> {
  // Single-tenant: no academies
  return { data: null, error: 'Not found' };
}
