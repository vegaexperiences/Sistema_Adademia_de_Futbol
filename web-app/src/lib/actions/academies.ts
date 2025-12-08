'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentAcademyId, isSuperAdmin } from '@/lib/utils/academy'
import { revalidatePath } from 'next/cache'

export interface Academy {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Get all academies (super admin only)
 */
export async function getAllAcademies() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    return { error: 'Unauthorized: Super admin access required' }
  }
  
  const { data, error } = await supabase
    .from('academies')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching academies:', error)
    return { error: error.message }
  }
  
  return { data }
}

/**
 * Get academy by ID or slug
 */
export async function getAcademyById(id: string): Promise<{ data: Academy | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('academies')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching academy:', error)
    return { data: null, error: error.message }
  }
  
  return { data, error: null }
}

export async function getAcademyBySlug(slug: string): Promise<{ data: Academy | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('academies')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error) {
    console.error('Error fetching academy:', error)
    return { data: null, error: error.message }
  }
  
  return { data, error: null }
}

/**
 * Create new academy (super admin only)
 */
export async function createAcademy(data: {
  name: string
  slug: string
  domain?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  settings?: Record<string, any>
}) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    return { error: 'Unauthorized: Super admin access required' }
  }
  
  // Validate slug format (alphanumeric and hyphens only)
  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    return { error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
  }
  
  const { data: academy, error } = await supabase
    .from('academies')
    .insert({
      name: data.name,
      slug: data.slug,
      domain: data.domain || null,
      logo_url: data.logo_url || null,
      primary_color: data.primary_color || null,
      secondary_color: data.secondary_color || null,
      settings: data.settings || {},
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating academy:', error)
    return { error: error.message }
  }
  
  revalidatePath('/super-admin/academies')
  
  return { data: academy, error: null }
}

/**
 * Update academy (super admin only)
 */
export async function updateAcademy(
  id: string,
  data: Partial<{
    name: string
    slug: string
    domain: string | null
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
    settings: Record<string, any>
  }>
) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    return { error: 'Unauthorized: Super admin access required' }
  }
  
  // Validate slug format if provided
  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    return { error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
  }
  
  const { data: academy, error } = await supabase
    .from('academies')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating academy:', error)
    return { error: error.message }
  }
  
  revalidatePath('/super-admin/academies')
  revalidatePath(`/super-admin/academies/${id}`)
  
  return { data: academy, error: null }
}

/**
 * Delete academy (super admin only)
 * Note: This will cascade delete all related data
 */
export async function deleteAcademy(id: string) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    return { error: 'Unauthorized: Super admin access required' }
  }
  
  // Prevent deleting default academy
  const { data: academy } = await supabase
    .from('academies')
    .select('settings')
    .eq('id', id)
    .single()
  
  if (academy?.settings?.isDefault) {
    return { error: 'Cannot delete default academy' }
  }
  
  const { error } = await supabase
    .from('academies')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting academy:', error)
    return { error: error.message }
  }
  
  revalidatePath('/super-admin/academies')
  
  return { success: true, error: null }
}

/**
 * Check if current user is super admin
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return false
  }
  
  return await isSuperAdmin(user.id)
}

