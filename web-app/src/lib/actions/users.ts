'use server'

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/academy'
import { revalidatePath } from 'next/cache'

export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  last_sign_in_at?: string
}

export interface UserRole {
  id: string
  name: string
  display_name: string
  description?: string
  academy_id: string
  academy_name?: string
  assigned_at: string
}

export interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  is_system_role: boolean
}

export interface Permission {
  id: string
  name: string
  display_name: string
  module: string
  description?: string
}

/**
 * Get all users (super admin only)
 */
export async function getAllUsers(): Promise<{ data: User[] | null; error: string | null }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    console.error('[getAllUsers] No authenticated user')
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(currentUser.id)
  console.log('[getAllUsers] User:', currentUser.email, 'Is Super Admin:', isAdmin)
  if (!isAdmin) {
    console.error('[getAllUsers] User is not super admin:', currentUser.id)
    return { data: null, error: 'Unauthorized: Super admin access required' }
  }
  
  // Get all users from auth
  console.log('[getAllUsers] Attempting to list users via admin API')
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('[getAllUsers] Error fetching users:', usersError)
    return { data: null, error: usersError.message || 'Error al obtener usuarios' }
  }
  
  console.log('[getAllUsers] Successfully fetched', users?.length || 0, 'users')
  
  const formattedUsers: User[] = users.map(u => ({
    id: u.id,
    email: u.email!,
    name: u.user_metadata?.name || u.email!,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }))
  
  return { data: formattedUsers, error: null }
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<{ data: Role[] | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .order('display_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching roles:', error)
    return { data: null, error: error.message }
  }
  
  return { data, error: null }
}

/**
 * Get all permissions
 */
export async function getAllPermissions(): Promise<{ data: Permission[] | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .order('module, display_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching permissions:', error)
    return { data: null, error: error.message }
  }
  
  return { data, error: null }
}

/**
 * Get user roles for a specific user
 */
export async function getUserRoles(userId: string, academyId?: string): Promise<{ data: UserRole[] | null; error: string | null }> {
  const supabase = await createClient()
  const currentAcademyId = academyId || await getCurrentAcademyId()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if super admin or viewing own roles
  const isAdmin = await isSuperAdmin(currentUser.id)
  if (!isAdmin && currentUser.id !== userId) {
    return { data: null, error: 'Unauthorized' }
  }
  
  let query = supabase
    .from('user_role_assignments')
    .select(`
      id,
      role_id,
      academy_id,
      created_at,
      user_roles!inner (
        id,
        name,
        display_name,
        description
      ),
      academies (
        id,
        name
      )
    `)
    .eq('user_id', userId)
  
  if (currentAcademyId && !isAdmin) {
    query = query.eq('academy_id', currentAcademyId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching user roles:', error)
    return { data: null, error: error.message }
  }
  
  const formattedRoles: UserRole[] = (data || []).map((assignment: any) => ({
    id: assignment.id,
    name: assignment.user_roles.name,
    display_name: assignment.user_roles.display_name,
    description: assignment.user_roles.description,
    academy_id: assignment.academy_id,
    academy_name: assignment.academies?.name,
    assigned_at: assignment.created_at,
  }))
  
  return { data: formattedRoles, error: null }
}

/**
 * Assign role to user for a specific academy
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  academyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(currentUser.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Super admin access required' }
  }
  
  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('user_role_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .eq('academy_id', academyId)
    .single()
  
  if (existing) {
    return { success: false, error: 'Este rol ya está asignado a este usuario para esta academia' }
  }
  
  // Remove any existing role for this user in this academy (one role per academy)
  await supabase
    .from('user_role_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('academy_id', academyId)
  
  // Assign new role
  const { error } = await supabase
    .from('user_role_assignments')
    .insert({
      user_id: userId,
      role_id: roleId,
      academy_id: academyId,
      assigned_by: currentUser.id,
    })
  
  if (error) {
    console.error('Error assigning role:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/settings')
  
  return { success: true }
}

/**
 * Remove role from user for a specific academy
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string,
  academyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(currentUser.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Super admin access required' }
  }
  
  // Prevent removing own role
  if (currentUser.id === userId) {
    return { success: false, error: 'No puedes remover tu propio rol' }
  }
  
  const { error } = await supabase
    .from('user_role_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .eq('academy_id', academyId)
  
  if (error) {
    console.error('Error removing role:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/settings')
  
  return { success: true }
}

/**
 * Get effective permissions for a user in a specific academy
 */
/**
 * Create a new user (super admin only)
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<{ data: User | null; error: string | null }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(currentUser.id)
  console.log('[createUser] User:', currentUser.email, 'Is Super Admin:', isAdmin)
  if (!isAdmin) {
    console.error('[createUser] User is not super admin:', currentUser.id)
    return { data: null, error: 'Unauthorized: Super admin access required' }
  }

  // Validate input
  if (!email || !email.includes('@')) {
    return { data: null, error: 'Email inválido' }
  }

  if (!password || password.length < 6) {
    return { data: null, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  try {
    // Create user using Supabase Admin API
    console.log('[createUser] Attempting to create user:', email)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || email,
      },
    })

    if (createError) {
      console.error('[createUser] Error creating user:', createError)
      return { data: null, error: createError.message || 'Error al crear usuario' }
    }
    
    console.log('[createUser] User created successfully:', newUser.user?.id)

    if (!newUser.user) {
      return { data: null, error: 'Error al crear usuario: usuario no retornado' }
    }

    const formattedUser: User = {
      id: newUser.user.id,
      email: newUser.user.email!,
      name: newUser.user.user_metadata?.name || newUser.user.email!,
      created_at: newUser.user.created_at,
      last_sign_in_at: newUser.user.last_sign_in_at,
    }

    return { data: formattedUser, error: null }
  } catch (error: any) {
    console.error('Error creating user:', error)
    return { data: null, error: error.message || 'Error al crear usuario' }
  }
}

export async function getUserPermissions(
  userId: string,
  academyId?: string
): Promise<{ data: Permission[] | null; error: string | null }> {
  const supabase = await createClient()
  const currentAcademyId = academyId || await getCurrentAcademyId()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if the user being queried is super admin
  const targetUserIsAdmin = await isSuperAdmin(userId)
  if (targetUserIsAdmin) {
    // Super admins have all permissions
    const { data: allPermissions } = await supabase
      .from('user_permissions')
      .select('*')
      .order('module, display_name')
    
    return { data: allPermissions, error: null }
  }
  
  // Check if current user has permission to view (super admin or viewing own permissions)
  const currentUserIsAdmin = await isSuperAdmin(currentUser.id)
  if (!currentUserIsAdmin && currentUser.id !== userId) {
    return { data: null, error: 'Unauthorized: You can only view your own permissions' }
  }
  
  // Get user's role in the academy
  const { data: roleAssignment } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', userId)
    .eq('academy_id', currentAcademyId || '')
    .single()
  
  if (!roleAssignment) {
    return { data: [], error: null } // No role = no permissions
  }
  
  // Get permissions for the role
  const { data: permissions, error } = await supabase
    .from('role_permissions')
    .select(`
      permission_id,
      user_permissions (*)
    `)
    .eq('role_id', roleAssignment.role_id)
  
  if (error) {
    console.error('Error fetching permissions:', error)
    return { data: null, error: error.message }
  }
  
  const formattedPermissions: Permission[] = (permissions || [])
    .map((rp: any) => rp.user_permissions)
    .filter(Boolean)
  
  return { data: formattedPermissions, error: null }
}

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(roleId: string): Promise<{ data: Permission[] | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      permission_id,
      user_permissions (*)
    `)
    .eq('role_id', roleId)
  
  if (error) {
    console.error('Error fetching role permissions:', error)
    return { data: null, error: error.message }
  }
  
  const formattedPermissions: Permission[] = (data || [])
    .map((rp: any) => rp.user_permissions)
    .filter(Boolean)
  
  return { data: formattedPermissions, error: null }
}

