'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  salary: number;
  payment_frequency: string;
  hire_date: string;
  is_active: boolean;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffPayment {
  id: string;
  staff_id: string;
  amount: number;
  payment_date: string;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
}

export async function getStaff() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('is_active', { ascending: false })
    .order('last_name');
  
  if (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
  
  return data as Staff[];
}

export async function getActiveStaff() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('is_active', true)
    .order('last_name');
  
  if (error) {
    console.error('Error fetching active staff:', error);
    return [];
  }
  
  return data as Staff[];
}

export async function createStaff(staffData: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('staff')
    .insert(staffData);
  
  if (error) {
    console.error('Error creating staff:', error);
    return { error: 'Error al crear empleado' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function updateStaff(id: string, updates: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating staff:', error);
    return { error: 'Error al actualizar empleado' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function deactivateStaff(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('staff')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) {
    console.error('Error deactivating staff:', error);
    return { error: 'Error al desactivar empleado' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function getStaffPayments(staffId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('staff_payments')
    .select('*')
    .eq('staff_id', staffId)
    .order('payment_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching staff payments:', error);
    return [];
  }
  
  return data as StaffPayment[];
}

export async function createStaffPayment(paymentData: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('staff_payments')
    .insert(paymentData);
  
  if (error) {
    console.error('Error creating staff payment:', error);
    return { error: 'Error al registrar pago' };
  }
  
  revalidatePath('/dashboard/finances');
  return { success: true };
}

export async function getTotalStaffExpenses(startDate: string, endDate: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('staff_payments')
    .select('amount')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate);
  
  if (error) {
    console.error('Error fetching staff expenses:', error);
    return 0;
  }
  
  return data.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
}
