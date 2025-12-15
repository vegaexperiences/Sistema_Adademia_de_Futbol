'use server';

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/utils/academy';
import { hasRole } from '@/lib/utils/permissions';

/**
 * Check if current user is admin (super admin OR has admin role)
 * This is a server action that can be called from client components
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    // Check super admin
    if (await isSuperAdmin(user.id)) {
      return true;
    }
    
    // Check admin role in current academy
    const academyId = await getCurrentAcademyId();
    if (academyId) {
      return await hasRole(user.id, 'admin', academyId);
    }
    
    return false;
  } catch (error) {
    console.error('[checkIsAdmin] Error checking admin status:', error);
    return false;
  }
}

