/**
 * Permission utility functions
 * These functions help check user permissions throughout the application
 */

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server'
import { isSuperAdmin } from './academy'

/**
 * Check if user has a specific permission in the current academy
 */
export async function checkPermission(
  userId: string,
  permissionName: string,
  academyId?: string
): Promise<boolean> {
  // Super admins have all permissions
  const isAdmin = await isSuperAdmin(userId)
  if (isAdmin) {
    return true
  }
  
  const currentAcademyId = academyId || await getCurrentAcademyId()
  if (!currentAcademyId) {
    return false // No academy context = no permissions
  }
  
  const supabase = await createClient()
  
  // Get user's role in the academy
  const { data: roleAssignment } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', userId)
    .eq('academy_id', currentAcademyId)
    .single()
  
  if (!roleAssignment) {
    return false // No role = no permissions
  }
  
  // Get permission ID first
  const { data: permissionData } = await supabase
    .from('user_permissions')
    .select('id')
    .eq('name', permissionName)
    .single()
  
  if (!permissionData) {
    return false
  }
  
  // Check if the role has the permission
  const { data: rolePermission } = await supabase
    .from('role_permissions')
    .select('id')
    .eq('role_id', roleAssignment.role_id)
    .eq('permission_id', permissionData.id)
    .single()
  
  return !!rolePermission
}

/**
 * Get all roles for a user in a specific academy
 */
export async function getUserRoles(
  userId: string,
  academyId?: string
): Promise<string[]> {
  // Super admins have all roles implicitly
  const isAdmin = await isSuperAdmin(userId)
  if (isAdmin) {
    return ['super_admin']
  }
  
  const currentAcademyId = academyId || await getCurrentAcademyId()
  if (!currentAcademyId) {
    return []
  }
  
  const supabase = await createClient()
  
  const { data: assignments } = await supabase
    .from('user_role_assignments')
    .select(`
      user_roles (
        name
      )
    `)
    .eq('user_id', userId)
    .eq('academy_id', currentAcademyId)
  
  if (!assignments || assignments.length === 0) {
    return []
  }
  
  return assignments
    .map((a: any) => a.user_roles?.name)
    .filter(Boolean)
}

/**
 * Check if user has a specific role in the current academy
 */
export async function hasRole(
  userId: string,
  roleName: string,
  academyId?: string
): Promise<boolean> {
  // Super admins have all roles
  if (roleName === 'super_admin') {
    return await isSuperAdmin(userId)
  }
  
  const roles = await getUserRoles(userId, academyId)
  return roles.includes(roleName)
}

/**
 * Get effective permissions for current user
 */
export async function getCurrentUserPermissions(academyId?: string): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }
  
  // Super admins have all permissions
  const isAdmin = await isSuperAdmin(user.id)
  if (isAdmin) {
    const { data: allPermissions } = await supabase
      .from('user_permissions')
      .select('name')
    
    return (allPermissions || []).map(p => p.name)
  }
  
  const currentAcademyId = academyId || await getCurrentAcademyId()
  if (!currentAcademyId) {
    return []
  }
  
  // Get user's role
  const { data: roleAssignment } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', user.id)
    .eq('academy_id', currentAcademyId)
    .single()
  
  if (!roleAssignment) {
    return []
  }
  
  // Get permissions for the role
  const { data: rolePermissions } = await supabase
    .from('role_permissions')
    .select(`
      user_permissions (
        name
      )
    `)
    .eq('role_id', roleAssignment.role_id)
  
  if (!rolePermissions) {
    return []
  }
  
  return rolePermissions
    .map((rp: any) => rp.user_permissions?.name)
    .filter(Boolean)
}

/**
 * Check if current user has a specific permission
 */
export async function hasPermission(permissionName: string, academyId?: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return false
  }
  
  return await checkPermission(user.id, permissionName, academyId)
}

// Note: checkIsAdmin has been moved to src/lib/actions/permissions.ts
// as a server action so it can be called from client components.
// Import it from there instead: import { checkIsAdmin } from '@/lib/actions/permissions'

