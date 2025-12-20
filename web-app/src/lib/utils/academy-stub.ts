/**
 * TEMPORARY STUB - Academy utilities for single-tenant migration
 * These are simplified versions that don't require multi-tenant logic
 */

// Simple stub that returns null (single-tenant doesn't need academy ID)
export async function getCurrentAcademyId(): Promise<string | null> {
  return null;
}

// Simple stub that returns the current academy (if needed)
export async function getCurrentAcademy() {
  return null;
}

// Logo helpers
export async function getAcademyLogo(size: 'small' | 'medium' | 'large' = 'medium'): Promise<string> {
  return process.env.NEXT_PUBLIC_ACADEMY_LOGO || '/logo.png';
}

export async function getAcademyFavicon(size: number = 32): Promise<string> {
  return process.env.NEXT_PUBLIC_ACADEMY_LOGO || '/logo.png';
}

export async function getAcademyAppleTouchIcon(): Promise<string> {
  return process.env.NEXT_PUBLIC_ACADEMY_LOGO || '/logo.png';
}

// Branding helpers
export async function getAcademyDisplayName(): Promise<string> {
  return process.env.NEXT_PUBLIC_ACADEMY_NAME || 'Academia';
}


