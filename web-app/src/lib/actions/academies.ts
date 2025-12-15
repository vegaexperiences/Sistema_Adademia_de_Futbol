'use server'

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/academy'
import { hasRole } from '@/lib/utils/permissions'
import { revalidatePath } from 'next/cache'
import type { Academy as AcademyBase } from '@/lib/utils/academy-types'

/**
 * Check if user is admin (super admin OR has admin role in academy)
 */
async function isAdminOrSuperAdmin(userId: string, academyId?: string): Promise<boolean> {
  // Check if super admin first
  if (await isSuperAdmin(userId)) {
    return true
  }
  
  // Check if has admin role in academy
  const currentAcademyId = academyId || await getCurrentAcademyId()
  if (!currentAcademyId) {
    return false
  }
  
  return await hasRole(userId, 'admin', currentAcademyId)
}

// Extended Academy interface with additional fields
export interface Academy extends AcademyBase {
  domain_status: 'pending' | 'active' | 'inactive' | null
  domain_configured_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all academies (super admin only)
 */
export async function getAllAcademies() {
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:19',message:'getAllAcademies entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
  // #endregion
  const supabase = await createClient()
  
  // Get current user
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:25',message:'Before getUser',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
  // #endregion
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // #region agent log
    try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:28',message:'No user authenticated',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
    // #endregion
    return { error: 'Not authenticated' }
  }
  
  // Check if super admin
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:32',message:'Before isSuperAdmin check',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
  // #endregion
  const isAdmin = await isAdminOrSuperAdmin(user.id)
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:35',message:'After isAdminOrSuperAdmin check',data:{userId:user.id,isAdmin},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
  // #endregion
  if (!isAdmin) {
    // #region agent log
    try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:37',message:'Not admin or super admin',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
    // #endregion
    return { error: 'Unauthorized: Admin access required' }
  }
  
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:42',message:'Before query academies',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
  // #endregion
  
  // If super admin, get all academies. If regular admin, get only their academy
  const isSuperAdminUser = await isSuperAdmin(user.id)
  let query = supabase
    .from('academies')
    .select('*')
    .order('name', { ascending: true })
  
  if (!isSuperAdminUser) {
    // Regular admin: only get their academy
    const academyId = await getCurrentAcademyId()
    if (academyId) {
      query = query.eq('id', academyId)
    }
  }
  
  const { data, error } = await query
  
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academies.ts:47',message:'After query academies',data:{hasError:!!error,errorMessage:error?.message,academiesCount:data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})+'\n');}catch(e){}
  // #endregion
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
 * Create new academy with all settings in one call (super admin only)
 * Validates all configurations before creation
 */
export async function createAcademyWithSettings(data: {
  name: string
  slug: string
  domain?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  settings?: Record<string, any>
}): Promise<{ data: Academy | null; error: string | null }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    return { data: null, error: 'Unauthorized: Super admin access required' }
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    return { data: null, error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
  }

  // Validate settings if provided
  if (data.settings) {
    // Validate payment settings if enabled
    if (data.settings.payments) {
      if (data.settings.payments.yappy?.enabled) {
        if (!data.settings.payments.yappy.merchant_id || 
            !data.settings.payments.yappy.secret_key || 
            !data.settings.payments.yappy.domain_url) {
          return { data: null, error: 'Yappy: All fields are required when enabled' }
        }
      }
      if (data.settings.payments.paguelofacil?.enabled) {
        if (!data.settings.payments.paguelofacil.merchant_id || 
            !data.settings.payments.paguelofacil.api_key) {
          return { data: null, error: 'PagueloFacil: All fields are required when enabled' }
        }
      }
    }

    // Validate email settings
    if (data.settings.email) {
      if (!data.settings.email.brevo_api_key) {
        return { data: null, error: 'Brevo API key is required' }
      }
      if (!data.settings.email.brevo_from_email || !data.settings.email.brevo_from_email.includes('@')) {
        return { data: null, error: 'Valid Brevo from email is required' }
      }
      if (!data.settings.email.brevo_from_name) {
        return { data: null, error: 'Brevo from name is required' }
      }
    }
  }

  // Determine domain status
  // If domain is provided, set status to 'pending' (needs configuration)
  // If no domain, status will default to 'pending' in database
  const domainStatus = data.domain ? 'pending' : null // null will use DB default
  
  // Create academy with settings
  const { data: academy, error } = await supabase
    .from('academies')
    .insert({
      name: data.name,
      slug: data.slug,
      domain: data.domain || null,
      logo_url: data.logo_url || null,
      primary_color: data.primary_color || null,
      secondary_color: data.secondary_color || null,
      domain_status: domainStatus,
      settings: data.settings || {},
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating academy:', error)
    return { data: null, error: error.message }
  }
  
  revalidatePath('/super-admin/academies')
  revalidatePath('/dashboard/settings')
  
  return { data: academy, error: null }
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
    domain_status: 'pending' | 'active' | 'inactive' | null
    domain_configured_at: string | null
    display_name: string | null
    logo_url: string | null
    logo_small_url: string | null
    logo_medium_url: string | null
    logo_large_url: string | null
    favicon_16_url: string | null
    favicon_32_url: string | null
    apple_touch_icon_url: string | null
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
  
  // Revalidate all paths that might display academy data
  revalidatePath('/super-admin/academies')
  revalidatePath(`/super-admin/academies/${id}`)
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  revalidatePath('/')
  
  // Also revalidate the API route that provides academy data
  revalidatePath('/api/academy/current', 'layout')
  
  console.log('[updateAcademy] ✅ Academy updated successfully:', id, 'Display name:', data.display_name)
  
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
 * Update academy settings (merges with existing settings)
 * Super admin only
 */
export async function updateAcademySettings(
  academyId: string,
  settings: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Check if super admin
  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Super admin access required' }
  }
  
  // Get current academy settings
  const { data: academy, error: fetchError } = await supabase
    .from('academies')
    .select('settings')
    .eq('id', academyId)
    .single()
  
  if (fetchError || !academy) {
    return { success: false, error: 'Academy not found' }
  }
  
  // Merge new settings with existing settings
  const currentSettings = academy.settings || {}
  const mergedSettings = {
    ...currentSettings,
    ...settings,
    // Deep merge for nested objects like payments
    payments: {
      ...(currentSettings.payments || {}),
      ...(settings.payments || {}),
    },
    email: {
      ...(currentSettings.email || {}),
      ...(settings.email || {}),
    },
    // Deep merge for metadata
    metadata: {
      ...(currentSettings.metadata || {}),
      ...(settings.metadata || {}),
    },
    // Deep merge for navigation
    navigation: {
      ...(currentSettings.navigation || {}),
      ...(settings.navigation || {}),
    },
  }
  
  // Update academy with merged settings
  const { error: updateError } = await supabase
    .from('academies')
    .update({ settings: mergedSettings })
    .eq('id', academyId)
  
  if (updateError) {
    console.error('Error updating academy settings:', updateError)
    return { success: false, error: updateError.message }
  }
  
  // Revalidate all paths that might display academy data
  revalidatePath('/super-admin/academies')
  revalidatePath(`/super-admin/academies/${academyId}`)
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  revalidatePath('/')
  
  // Also revalidate the API route that provides academy data
  revalidatePath('/api/academy/current', 'layout')
  
  console.log('[updateAcademySettings] ✅ Academy settings updated successfully:', academyId)
  
  return { success: true }
}

/**
 * Check if current user is super admin
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academies.ts:439',message:'checkIsSuperAdmin entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academies.ts:442',message:'checkIsSuperAdmin getUser result',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!user) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academies.ts:444',message:'checkIsSuperAdmin no user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return false
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academies.ts:447',message:'checkIsSuperAdmin calling isSuperAdmin',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const result = await isSuperAdmin(user.id)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academies.ts:448',message:'checkIsSuperAdmin result',data:{userId:user.id,isSuperAdmin:result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return result
}

