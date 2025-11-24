'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RecurringExpense {
  id: string;
  category_id: string | null;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  description: string;
  vendor: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  created_at: string;
}

export async function getRecurringExpenses() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('expense_recurrence')
    .select(`
      *,
      expense_categories (
        name,
        icon,
        color
      )
    `)
    .order('is_active', { ascending: false })
    .order('description');
  
  if (error) {
    console.error('Error fetching recurring expenses:', error);
    return [];
  }
  
  return data as any[];
}

export async function createRecurringExpense(expenseData: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('expense_recurrence')
    .insert(expenseData);
  
  if (error) {
    console.error('Error creating recurring expense:', error);
    return { error: 'Error al crear gasto recurrente' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function updateRecurringExpense(id: string, updates: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('expense_recurrence')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating recurring expense:', error);
    return { error: 'Error al actualizar gasto recurrente' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function processRecurringExpenses() {
  // This function generates actual expense records from recurring expense templates
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  
  // Get active recurring expenses that need to be generated
  const { data: recurringExpenses, error } = await supabase
    .from('expense_recurrence')
    .select('*')
    .eq('is_active', true);
  
  if (error || !recurringExpenses) {
    console.error('Error fetching recurring expenses:', error);
    return { error: 'Error al procesar gastos recurrentes' };
  }
  
  let generated = 0;
  
  for (const recurring of recurringExpenses) {
    const shouldGenerate = shouldGenerateExpense(
      recurring.frequency,
      recurring.last_generated_date,
      today,
      recurring.start_date,
      recurring.end_date
    );
    
    if (shouldGenerate) {
      // Create the expense
      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          description: recurring.description,
          amount: recurring.amount,
          category_id: recurring.category_id,
          vendor: recurring.vendor,
          is_recurring: true,
          recurrence_id: recurring.id,
          date: today
        });
      
      if (!insertError) {
        // Update last_generated_date
        await supabase
          .from('expense_recurrence')
          .update({ last_generated_date: today })
          .eq('id', recurring.id);
        
        generated++;
      }
    }
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true, generated };
}

function shouldGenerateExpense(
  frequency: string,
  lastGeneratedDate: string | null,
  today: string,
  startDate: string,
  endDate: string | null
): boolean {
  // Check if we're within the active period
  if (today < startDate) return false;
  if (endDate && today > endDate) return false;
  
  // If never generated and today >= start_date, generate
  if (!lastGeneratedDate) return true;
  
  const last = new Date(lastGeneratedDate);
  const current = new Date(today);
  
  switch (frequency) {
    case 'weekly':
      // Generate if 7+ days since last
      const daysDiff = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 7;
      
    case 'monthly':
      // Generate if different month
      return last.getMonth() !== current.getMonth() || last.getFullYear() !== current.getFullYear();
      
    case 'yearly':
      // Generate if different year
      return last.getFullYear() !== current.getFullYear();
      
    default:
      return false;
  }
}
