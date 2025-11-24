'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_template: string;
  variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getEmailTemplates() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching email templates:', error);
    return [];
  }
  
  return data as EmailTemplate[];
}

export async function getEmailTemplate(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching email template:', error);
    return null;
  }
  
  return data as EmailTemplate;
}

export async function createEmailTemplate(template: {
  name: string;
  subject: string;
  html_template: string;
  variables?: any;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      ...template,
      variables: template.variables || {}
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating email template:', error);
    return { error: 'Error al crear plantilla' };
  }
  
  revalidatePath('/dashboard/settings/emails');
  return { success: true, data };
}

export async function updateEmailTemplate(id: string, updates: {
  subject?: string;
  html_template?: string;
  variables?: any;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('email_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating email template:', error);
    return { error: 'Error al actualizar plantilla' };
  }
  
  revalidatePath('/dashboard/settings/emails');
  return { success: true };
}

export async function deleteEmailTemplate(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting email template:', error);
    return { error: 'Error al eliminar plantilla' };
  }
  
  revalidatePath('/dashboard/settings/emails');
  return { success: true };
}
