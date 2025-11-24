'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export async function getExpenseCategories() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    console.error('Error fetching expense categories:', error);
    return [];
  }
  
  return data as ExpenseCategory[];
}

export async function createExpenseCategory(categoryData: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('expense_categories')
    .insert(categoryData);
  
  if (error) {
    console.error('Error creating expense category:', error);
    return { error: 'Error al crear categoría' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function updateExpenseCategory(id: string, updates: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('expense_categories')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating expense category:', error);
    return { error: 'Error al actualizar categoría' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function deleteExpenseCategory(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting expense category:', error);
    return { error: 'Error al eliminar categoría' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}
