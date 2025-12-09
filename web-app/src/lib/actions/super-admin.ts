'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createHash } from 'crypto'

/**
 * Get the super admin key from settings
 */
async function getSuperAdminKey(): Promise<string | null> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'super_admin_key')
    .single()
  
  return data?.value || null
}

/**
 * Set the super admin key in settings
 */
async function setSuperAdminKey(key: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Hash the key before storing
  const hashedKey = createHash('sha256').update(key).digest('hex')
  
  const { error } = await supabase
    .from('settings')
    .upsert({
      key: 'super_admin_key',
      value: hashedKey,
      description: 'Clave de acceso para gestionar super admins (hasheada)',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'key'
    })
  
  if (error) {
    console.error('Error setting super admin key:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Verify super admin key
 */
export async function verifySuperAdminKey(key: string): Promise<{ success: boolean; error?: string }> {
  'use server'
  const storedKey = await getSuperAdminKey()
  
  if (!storedKey) {
    // If no key is set, set it now (first time setup)
    await setSuperAdminKey(key)
    return { success: true }
  }
  
  // Hash the provided key and compare
  const hashedKey = createHash('sha256').update(key).digest('hex')
  
  if (hashedKey === storedKey) {
    return { success: true }
  }
  
  return { success: false, error: 'Clave incorrecta' }
}

/**
 * Get all super admins (server action for client components)
 */
export async function getSuperAdminsAction(): Promise<{ data: any[] | null; error: string | null }> {
  'use server'
  return await getSuperAdmins()
}

/**
 * Get all super admins
 */
export async function getSuperAdmins(): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('super_admins')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.warn('super_admins table does not exist yet. Run migrations first.')
        return { data: [], error: null }
      }
      console.error('Error fetching super admins:', error)
      return { data: null, error: error.message }
    }
    
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Exception in getSuperAdmins:', error)
    // Return empty array on exception so UI can still render
    return { data: [], error: error.message || 'Unknown error' }
  }
}

/**
 * Create a new super admin
 */
export async function createSuperAdmin(
  email: string,
  verificationKey: string
): Promise<{ success: boolean; error?: string }> {
  'use server'
  // Verify key first
  const keyCheck = await verifySuperAdminKey(verificationKey)
  if (!keyCheck.success) {
    return { success: false, error: 'Clave de verificación incorrecta' }
  }
  
  const supabase = await createClient()
  
  // Get user by email from auth
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('Error fetching users:', usersError)
    return { success: false, error: 'Error al buscar usuarios' }
  }
  
  const user = users.find(u => u.email === email)
  
  if (!user) {
    return { success: false, error: 'Usuario no encontrado. El usuario debe existir en Supabase Auth primero.' }
  }
  
  // Check if super admin already exists
  const { data: existingAdmin } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  if (existingAdmin) {
    return { success: false, error: 'Este usuario ya es super admin' }
  }
  
  // Create super admin
  const { error: createError } = await supabase
    .from('super_admins')
    .insert({
      user_id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!,
    })
  
  if (createError) {
    console.error('Error creating super admin:', createError)
    return { success: false, error: createError.message }
  }
  
  revalidatePath('/dashboard/settings')
  
  return { success: true }
}

/**
 * Delete a super admin
 */
export async function deleteSuperAdmin(
  adminId: string,
  verificationKey: string
): Promise<{ success: boolean; error?: string }> {
  'use server'
  // Verify key first
  const keyCheck = await verifySuperAdminKey(verificationKey)
  if (!keyCheck.success) {
    return { success: false, error: 'Clave de verificación incorrecta' }
  }
  
  const supabase = await createClient()
  
  // Get current user to prevent self-deletion
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: adminToDelete } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('id', adminId)
      .single()
    
    if (adminToDelete && adminToDelete.user_id === user.id) {
      return { success: false, error: 'No puedes eliminarte a ti mismo' }
    }
  }
  
  const { error } = await supabase
    .from('super_admins')
    .delete()
    .eq('id', adminId)
  
  if (error) {
    console.error('Error deleting super admin:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/settings')
  
  return { success: true }
}

/**
 * Set or update the super admin key
 */
export async function setSuperAdminKeyAction(
  newKey: string,
  currentKey?: string
): Promise<{ success: boolean; error?: string }> {
  // If current key is provided, verify it first
  if (currentKey) {
    const keyCheck = await verifySuperAdminKey(currentKey)
    if (!keyCheck.success) {
      return { success: false, error: 'Clave actual incorrecta' }
    }
  }
  
  return await setSuperAdminKey(newKey)
}

