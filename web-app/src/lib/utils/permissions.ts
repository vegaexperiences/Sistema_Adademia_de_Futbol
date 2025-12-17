/**
 * Permission utility functions - Single Tenant
 * Simplified version without academy context
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  const supabase = await createClient()
  
  // Get user's role
  const { data: roleAssignment } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (!roleAssignment) {
    return false // No role = no permissions
  }
  
  // Get permission ID first
  const { data: permissionData } = await supabase
    .from('user_permissions')
    .select('id')
    .eq('name', permissionName)
    .maybeSingle()
  
  if (!permissionData) {
    return false
  }
  
  // Check if the role has the permission
  const { data: rolePermission } = await supabase
    .from('role_permissions')
    .select('id')
    .eq('role_id', roleAssignment.role_id)
    .eq('permission_id', permissionData.id)
    .maybeSingle()
  
  return !!rolePermission
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const supabase = await createClient()
  
  const { data: assignments } = await supabase
    .from('user_role_assignments')
    .select(`
      user_roles (
        name
      )
    `)
    .eq('user_id', userId)
  
  if (!assignments || assignments.length === 0) {
    return []
  }
  
  return assignments
    .map((a: any) => a.user_roles?.name)
    .filter(Boolean)
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  userId: string,
  roleName: string
): Promise<boolean> {
  const roles = await getUserRoles(userId)
  return roles.includes(roleName)
}

/**
 * Get effective permissions for current user
 */
export async function getCurrentUserPermissions(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }
  
  // Get user's role
  const { data: roleAssignment } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', user.id)
    .maybeSingle()
  
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
export async function hasPermission(permissionName: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return false
  }
  
  return await checkPermission(user.id, permissionName)
}

// Note: checkIsAdmin has been moved to src/lib/actions/permissions.ts
// as a server action so it can be called from client components.
// Import it from there instead: import { checkIsAdmin } from '@/lib/actions/permissions'
