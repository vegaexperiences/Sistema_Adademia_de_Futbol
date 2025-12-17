'use server';

import { createClient } from '@/lib/supabase/server';
import { hasRole } from '@/lib/utils/permissions';

/**
 * Check if current user is admin
 * Simplified for single-tenant - just checks if user has admin role
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    // Check if user has admin role
    return await hasRole(user.id, 'admin');
  } catch (error) {
    console.error('[checkIsAdmin] Error checking admin status:', error);
    return false;
  }
}
