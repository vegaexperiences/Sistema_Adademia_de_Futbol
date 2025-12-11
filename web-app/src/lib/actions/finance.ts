'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPayments() {
  const supabase = await createClient();
  // Only get approved/successful payments - rejections are not real payments
  const { data, error } = await supabase
    .from('payments')
    .select('*, players(first_name, last_name)')
    .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return data;
}

export async function getExpenses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return data;
}

export async function recordPayment(formData: FormData) {
  const supabase = await createClient();
  
  const payment = {
    player_id: formData.get('playerId'),
    amount: parseFloat(formData.get('amount') as string),
    type: formData.get('type'),
    status: 'Paid',
    method: formData.get('method'),
    reference: formData.get('reference'),
    payment_date: new Date().toISOString(),
    notes: formData.get('notes'),
  };

  const { error } = await supabase.from('payments').insert(payment);

  if (error) {
    return { error: 'Error recording payment' };
  }

  revalidatePath('/dashboard/finance');
  return { success: true };
}
