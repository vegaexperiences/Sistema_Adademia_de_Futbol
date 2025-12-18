/**
 * Academy utility functions (server-side only)
 * For client-side functions, see academy-client.ts
 */

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Academy as AcademyBase } from './academy-types'

// Re-export Academy type for backward compatibility
export type Academy = AcademyBase

/**
 * Get current academy ID from headers (server-side)
 */
export async function getAcademyIdFromHeaders(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-academy-id')
}

/**
 * Get current academy slug from headers (server-side)
 */
export async function getAcademySlugFromHeaders(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-academy-slug')
}

/**
 * Get current academy from environment variables (single-tenant mode)
 * No longer queries database - returns static configuration
 */
export async function getCurrentAcademy(): Promise<Academy | null> {
  // Return null since we're in single-tenant mode
  // Components should use env vars or default values directly
  return null
}


/**
 * Check if user is super admin
 * Always returns true for vegaexperiences@gmail.com
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  // Always allow vegaexperiences@gmail.com as super admin
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === 'vegaexperiences@gmail.com') {
      return true
    }
  } catch (error) {
    // If we can't get user, continue with normal check
    console.warn('[isSuperAdmin] Could not check email, continuing with normal check:', error)
  }
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academy.ts:82',message:'isSuperAdmin entry',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})+'\n');}catch(e){}
  // #endregion
  const supabase = await createClient()
  
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academy.ts:85',message:'Before query super_admins',data:{userId,query:'SELECT id FROM super_admins WHERE user_id = ?'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})+'\n');}catch(e){}
  // #endregion
  const { data, error } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  // #region agent log
  try{const fs=await import('fs');const path=await import('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');fs.appendFileSync(logPath,JSON.stringify({location:'academy.ts:89',message:'After query super_admins',data:{userId,hasData:!!data,dataId:data?.id,errorCode:error?.code,errorMessage:error?.message,errorDetails:error},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})+'\n');}catch(e){}
  // #endregion
  
  if (error) {
    // Log error but don't expose details
    console.log('[isSuperAdmin] Error checking super admin:', error.code, error.message)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academy.ts:93',message:'Query error path',data:{userId,errorCode:error.code,errorMessage:error.message,isPGRST116:error.code==='PGRST116'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    // If it's a "not found" error (PGRST116), user is not super admin
    if (error.code === 'PGRST116') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academy.ts:96',message:'PGRST116 - user not found',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return false
    }
    // For other errors, log and return false
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academy.ts:99',message:'Other error - returning false',data:{userId,errorCode:error.code,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return false
  }
  
  if (!data) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academy.ts:103',message:'No data returned',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return false
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'academy.ts:106',message:'isSuperAdmin success',data:{userId,superAdminId:data.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return true
}

