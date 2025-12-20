/**
 * TEMPORARY STUB - Brevo client for single-tenant migration
 */

import { brevo } from './client';

export async function getBrevoClientForAcademy(academyId: string | null) {
  // Return the default brevo client with environment variables
  return {
    transactional: brevo,
    fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@academy.com',
    fromName: process.env.BREVO_FROM_NAME || 'Academia',
  };
}


