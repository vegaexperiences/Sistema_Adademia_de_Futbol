/**
 * TEMPORARY STUB - Academy utilities
 */

export { getCurrentAcademyId, getCurrentAcademy } from './academy-stub';

// Stub for isSuperAdmin
export async function isSuperAdmin(userId?: string): Promise<boolean> {
  // Single-tenant: check admin role instead
  if (!userId) return false;
  const { hasRole } = await import('./permissions');
  return await hasRole(userId, 'admin');
}
