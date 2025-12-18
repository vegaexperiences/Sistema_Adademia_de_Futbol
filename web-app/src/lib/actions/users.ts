'use server'

import { createClient } from '@/lib/supabase/server'

import { hasRole, getUserRoles as getUserRolesFromPermissions } from '@/lib/utils/permissions'
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
 * Check if user is admin (super admin OR has admin role in academy)
 */
async function isAdminOrSuperAdmin(userId: string): Promise<boolean> {
  // Always allow vegaexperiences@gmail.com as super admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email === 'vegaexperiences@gmail.com') {
    return true
  }
  
  // Single-tenant: just check if user has admin role
  return await hasRole(userId, 'admin')
}

/**
 * Get all users (super admin or admin role)
 */
export async function getAllUsers(): Promise<{ data: User[] | null; error: string | null }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    console.error('[getAllUsers] No authenticated user')
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if super admin or has admin role
  const isAdmin = await isAdminOrSuperAdmin(currentUser.id)
  console.log('[getAllUsers] User:', currentUser.email, 'Is Admin or Super Admin:', isAdmin)
  if (!isAdmin) {
    console.error('[getAllUsers] User is not admin or super admin:', currentUser.id)
    return { data: null, error: 'Unauthorized: Admin access required' }
  }
  
  // Get all users from auth
  console.log('[getAllUsers] Attempting to list users via admin API')
  
  // Check if we need to use service role key for admin operations
  let adminSupabase = supabase
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  
  const { data: { users }, error: usersError } = await adminSupabase.auth.admin.listUsers()
  
  
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
export async function getUserRoles(userId: string): Promise<{ data: UserRole[] | null; error: string | null }> {
  const supabase = await createClient()
  const currentAcademyId = null /* Single-tenant */
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if admin or viewing own roles (single-tenant)
  const isAdmin = await hasRole(currentUser.id, 'admin')
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
    `)
    .eq('user_id', userId)
  
  if (false) /* Single-tenant */ {
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
  
  // Check if super admin or has admin role
  const isAdmin = await isAdminOrSuperAdmin(currentUser.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }
  
  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('user_role_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    
    .single()
  
  if (existing) {
    return { success: false, error: 'Este rol ya está asignado a este usuario para esta academia' }
  }
  
  // Remove any existing role for this user in this academy (one role per academy)
  await supabase
    .from('user_role_assignments')
    .delete()
    .eq('user_id', userId)
    
  
  // Assign new role
  const { error } = await supabase
    .from('user_role_assignments')
    .insert({
      user_id: userId,
      role_id: roleId,
      
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
  academyId?: string // Optional for compatibility
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Check if super admin or has admin role
  const isAdmin = await isAdminOrSuperAdmin(currentUser.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
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
 * Create a new user (super admin or admin role)
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
  
  // Check if super admin or has admin role
  const isAdmin = await isAdminOrSuperAdmin(currentUser.id)
  console.log('[createUser] User:', currentUser.email, 'Is Admin or Super Admin:', isAdmin)
  if (!isAdmin) {
    console.error('[createUser] User is not admin or super admin:', currentUser.id)
    return { data: null, error: 'Unauthorized: Admin access required' }
  }

  // Validate input
  if (!email || !email.includes('@')) {
    return { data: null, error: 'Email inválido' }
  }

  if (!password || password.length < 6) {
    return { data: null, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  try {
    // Create admin client with SERVICE_ROLE_KEY for admin operations
    let adminSupabase = supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      console.log('[createUser] Using admin client with SERVICE_ROLE_KEY')
    } else {
      console.warn('[createUser] SERVICE_ROLE_KEY not available, using regular client (may fail)')
    }

    // Create user using Supabase Admin API
    console.log('[createUser] Attempting to create user:', email)
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
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
  const currentAcademyId = null /* Single-tenant */
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if the user being queried is super admin
  const targetUserIsAdmin = await hasRole(userId, 'admin')
  if (targetUserIsAdmin) {
    // Super admins have all permissions
    const { data: allPermissions } = await supabase
      .from('user_permissions')
      .select('*')
      .order('module, display_name')
    
    return { data: allPermissions, error: null }
  }
  
  // Check if current user has permission to view (super admin or viewing own permissions)
  const currentUserIsAdmin = await hasRole(currentUser.id, "admin")
  if (!currentUserIsAdmin && currentUser.id !== userId) {
    return { data: null, error: 'Unauthorized: You can only view your own permissions' }
  }
  
  // Get user's role in the academy
  const { data: roleAssignment } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', userId)
    // Single-tenant: no academy filter
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

/**
 * Reset user password by sending recovery email (super admin or admin role)
 */
export async function resetUserPassword(userId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Check if super admin or has admin role
  const isAdmin = await isAdminOrSuperAdmin(currentUser.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  try {
    // Get user email first
    let adminSupabase = supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    }

    // Get user by ID
    const { data: { user }, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId)
    
    if (getUserError || !user || !user.email) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Get the base URL for the reset link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'http://localhost:3000'

    // Generate recovery link using admin API
    // Note: generateLink creates the link but doesn't send the email automatically
    // We need to use the regular client method which sends the email
    const { error: resetError } = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: {
        redirectTo: `${baseUrl}/auth/reset-password`,
      },
    })

    if (resetError) {
      console.error('[resetUserPassword] Error generating reset link:', resetError)
      return { success: false, error: resetError.message || 'Error al generar enlace de recuperación' }
    }

    // Note: generateLink doesn't send the email automatically
    // We need to use the regular auth method to send the email
    // For admin operations, we can use the regular client with the user's email
    const regularSupabase = await createClient()
    const { error: emailError } = await regularSupabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${baseUrl}/auth/reset-password`,
    })

    if (emailError) {
      console.error('[resetUserPassword] Error sending reset email:', emailError)
      return { success: false, error: emailError.message || 'Error al enviar email de recuperación' }
    }

    console.log('[resetUserPassword] Password reset email sent to:', user.email)
    return { success: true, error: null }
  } catch (error: any) {
    console.error('[resetUserPassword] Unexpected error:', error)
    return { success: false, error: error.message || 'Error al resetear contraseña' }
  }
}

/**
 * Update user password directly (super admin or admin role)
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Check if super admin or has admin role
  const isAdmin = await isAdminOrSuperAdmin(currentUser.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  // Validate password
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  try {
    // Use admin client with SERVICE_ROLE_KEY
    let adminSupabase = supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    }

    console.log('[updateUserPassword] Updating password for user:', userId)
    console.log('[updateUserPassword] New password length:', newPassword.length)

    // Update user password
    const { data, error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      console.error('[updateUserPassword] Error:', {
        message: updateError.message,
        code: updateError.code,
        status: updateError.status,
        name: updateError.name,
      })
      return { success: false, error: updateError.message || 'Error al actualizar contraseña' }
    }

    console.log('[updateUserPassword] ✅ Password updated successfully')
    console.log('[updateUserPassword] User ID:', data?.user?.id)
    console.log('[updateUserPassword] User email:', data?.user?.email)
    console.log('[updateUserPassword] User updated at:', data?.user?.updated_at)
    return { success: true, error: null }
  } catch (error: any) {
    console.error('[updateUserPassword] Unexpected error:', error)
    return { success: false, error: error.message || 'Error al actualizar contraseña' }
  }
}

/**
 * Set user password (alias for updateUserPassword for clarity)
 */
export async function setUserPassword(
  userId: string,
  password: string
): Promise<{ success: boolean; error: string | null }> {
  return updateUserPassword(userId, password)
}

/**
 * Delete user (super admin or admin role)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Check if super admin or has admin role
  const isAdmin = await isAdminOrSuperAdmin(currentUser.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  // Prevent self-deletion
  if (currentUser.id === userId) {
    return { success: false, error: 'No puedes eliminarte a ti mismo' }
  }

  try {
    // Use admin client with SERVICE_ROLE_KEY
    let adminSupabase = supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    }

    console.log('[deleteUser] Deleting user:', userId)

    // Delete user using admin API
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('[deleteUser] Error:', {
        message: deleteError.message,
        code: deleteError.code,
        status: deleteError.status,
        name: deleteError.name,
      })
      return { success: false, error: deleteError.message || 'Error al eliminar usuario' }
    }

    console.log('[deleteUser] ✅ User deleted successfully:', userId)
    
    // Revalidate paths
    revalidatePath('/dashboard/settings')
    
    return { success: true, error: null }
  } catch (error: any) {
    console.error('[deleteUser] Unexpected error:', error)
    return { success: false, error: error.message || 'Error al eliminar usuario' }
  }
}

