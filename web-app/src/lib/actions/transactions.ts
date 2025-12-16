'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademyId } from '@/lib/supabase/server';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  method?: string;
  status?: string;
  category?: string;
  player_name?: string;
  player_cedula?: string;
  family_name?: string;
  tutor_email?: string;
  tutor_cedula?: string;
  reference?: string;
  accumulated_balance?: number;
  proof_url?: string | null;
  notes?: string;
}

export interface Balance {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  period: {
    start: string;
    end: string;
  };
}

export interface TransactionsFilter {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense' | 'all';
  method?: string;
  status?: string;
  search?: string;
}

/**
 * Get all transactions (payments and expenses) for the current academy
 */
export async function getTransactions(filter: TransactionsFilter = {}): Promise<Transaction[]> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return [];
  }

  const transactions: Transaction[] = [];

  // Get payments (income)
  // Include all valid payments:
  // - status = 'Approved' or 'Pending' (valid payments)
  // - status IS NULL or '' (backward compatibility - old payments without status)
  // - Exclude only 'Rejected' and 'Cancelled'
  // - Must have (player_id OR sponsor_id) and amount > 0
  // - Filter by academy_id: include payments with matching academy_id OR payments without academy_id (we'll check player's academy_id in code)
  let paymentsQuery = supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_date,
      type,
      method,
      status,
      notes,
      reference,
      proof_url,
      player_id,
      sponsor_id,
      academy_id,
      players(
        first_name,
        last_name,
        cedula,
        family_id,
        academy_id,
        tutor_email,
        tutor_cedula,
        families(
          tutor_name,
          tutor_email,
          tutor_cedula
        )
      ),
      sponsors(
        id,
        name
      ),
      sponsor_registrations(
        sponsor_name,
        sponsor_email,
        sponsor_cedula
      )
    `)
    .or('player_id.not.is.null,sponsor_id.not.is.null,and(type.eq.custom,player_id.is.null)') // Include payments with player_id OR sponsor_id OR external incomes
    .gt('amount', 0) // Only include payments with amount > 0
    .neq('status', 'Rejected')
    .neq('status', 'Cancelled');
  
  // Filter by academy_id: include payments with matching academy_id OR payments without academy_id
  // We'll filter by player's academy_id in the code for payments without academy_id
  paymentsQuery = paymentsQuery.or(`academy_id.eq.${academyId},academy_id.is.null`);

  if (filter.startDate) {
    paymentsQuery = paymentsQuery.gte('payment_date', filter.startDate);
  }
  if (filter.endDate) {
    paymentsQuery = paymentsQuery.lte('payment_date', filter.endDate);
  }
  if (filter.method) {
    paymentsQuery = paymentsQuery.eq('method', filter.method);
  }
  if (filter.status) {
    paymentsQuery = paymentsQuery.eq('status', filter.status);
  }

  const { data: payments, error: paymentsError } = await paymentsQuery.order('payment_date', { ascending: false });

  if (paymentsError) {
    console.error('[getTransactions] Error fetching payments:', paymentsError);
  } else if (payments) {
    payments.forEach((payment) => {
      const player = Array.isArray(payment.players) ? payment.players[0] : payment.players;
      const family = player?.families ? (Array.isArray(player.families) ? player.families[0] : player.families) : null;
      const sponsor = Array.isArray(payment.sponsors) ? payment.sponsors[0] : payment.sponsors;
      const sponsorRegistration = Array.isArray(payment.sponsor_registrations) ? payment.sponsor_registrations[0] : payment.sponsor_registrations;
      
      // Filter by academy_id: if payment doesn't have academy_id, check if player has matching academy_id
      // This handles old payments that don't have academy_id
      const paymentAcademyId = payment.academy_id;
      const playerAcademyId = player?.academy_id;
      
      if (paymentAcademyId && paymentAcademyId !== academyId) {
        return; // Payment has academy_id but doesn't match
      }
      
      if (!paymentAcademyId && playerAcademyId && playerAcademyId !== academyId) {
        return; // Payment doesn't have academy_id but player has different academy_id
      }
      
      // For sponsor payments, check academy_id directly
      if (payment.type === 'sponsor' && paymentAcademyId && paymentAcademyId !== academyId) {
        return; // Sponsor payment has academy_id but doesn't match
      }
      
      // If payment has no academy_id and player has no academy_id, include it (backward compatibility)
      // This allows old payments to show up
      
      // Build description based on payment type
      let description = '';
      if (payment.type === 'sponsor') {
        const sponsorName = sponsorRegistration?.sponsor_name || sponsor?.name || 'Padrino';
        description = payment.notes || `Padrinazgo: ${sponsorName}`;
      } else {
        description = payment.notes || 
          (player ? `${player.first_name} ${player.last_name}` : 'Pago sin jugador') ||
          `Pago ${payment.type || 'custom'}`;
      }

      // Filter out payments with amount 0 or less (already filtered in query, but double-check)
      const paymentAmount = parseFloat(payment.amount.toString());
      if (paymentAmount <= 0) {
        console.log('[getTransactions] Skipping payment with amount <= 0:', {
          id: payment.id,
          amount: paymentAmount,
          player_id: payment.player_id,
          sponsor_id: payment.sponsor_id,
        });
        return; // Skip this payment
      }

      // Only include if type filter allows income or is 'all'
      if (!filter.type || filter.type === 'all' || filter.type === 'income') {
        // Apply search filter if provided
        if (!filter.search || 
            description.toLowerCase().includes(filter.search.toLowerCase()) ||
            (payment.reference && payment.reference.toLowerCase().includes(filter.search.toLowerCase()))) {
          transactions.push({
            id: payment.id,
            type: 'income',
            amount: paymentAmount,
            date: payment.payment_date,
            description,
            method: payment.method || undefined,
            status: payment.status || undefined,
            player_name: player ? `${player.first_name} ${player.last_name}` : undefined,
            player_cedula: player?.cedula || undefined,
            family_name: payment.type === 'sponsor' 
              ? sponsorRegistration?.sponsor_name 
              : (family?.tutor_name || undefined),
            tutor_email: payment.type === 'sponsor'
              ? sponsorRegistration?.sponsor_email
              : (family?.tutor_email || player?.tutor_email || undefined),
            tutor_cedula: payment.type === 'sponsor'
              ? sponsorRegistration?.sponsor_cedula
              : (family?.tutor_cedula || player?.tutor_cedula || undefined),
            reference: payment.reference || undefined,
            proof_url: payment.proof_url || undefined,
            notes: payment.notes || undefined,
          });
        }
      }
    });
  }

  // Get expenses (outgoing)
  let expensesQuery = supabase
    .from('expenses')
    .select(`
      id,
      amount,
      date,
      description,
      category,
      payment_method
    `)
    .eq('academy_id', academyId);

  if (filter.startDate) {
    expensesQuery = expensesQuery.gte('date', filter.startDate);
  }
  if (filter.endDate) {
    expensesQuery = expensesQuery.lte('date', filter.endDate);
  }
  if (filter.method) {
    expensesQuery = expensesQuery.eq('payment_method', filter.method);
  }

  const { data: expenses, error: expensesError } = await expensesQuery.order('date', { ascending: false });

  if (expensesError) {
    console.error('[getTransactions] Error fetching expenses:', expensesError);
  } else if (expenses) {
    expenses.forEach((expense) => {
      // Only include if type filter allows expense or is 'all'
      if (!filter.type || filter.type === 'all' || filter.type === 'expense') {
        // Apply search filter if provided
        if (!filter.search || 
            expense.description.toLowerCase().includes(filter.search.toLowerCase())) {
          transactions.push({
            id: expense.id,
            type: 'expense',
            amount: parseFloat(expense.amount.toString()),
            date: expense.date,
            description: expense.description,
            method: expense.payment_method || undefined,
            category: expense.category || undefined,
          });
        }
      }
    });
  }

  // Get staff payments (outgoing)
  // First get staff payments, then filter by academy through staff relationship
  let staffPaymentsQuery = supabase
    .from('staff_payments')
    .select(`
      id,
      amount,
      payment_date,
      staff_id,
      staff(first_name, last_name, role, academy_id)
    `);

  if (filter.startDate) {
    staffPaymentsQuery = staffPaymentsQuery.gte('payment_date', filter.startDate);
  }
  if (filter.endDate) {
    staffPaymentsQuery = staffPaymentsQuery.lte('payment_date', filter.endDate);
  }

  const { data: staffPayments, error: staffPaymentsError } = await staffPaymentsQuery.order('payment_date', { ascending: false });

  if (staffPaymentsError) {
    console.error('[getTransactions] Error fetching staff payments:', {
      error: staffPaymentsError,
      message: staffPaymentsError.message,
      code: staffPaymentsError.code,
      details: staffPaymentsError.details,
      hint: staffPaymentsError.hint,
    });
    // Continue without staff payments rather than failing completely
  } else if (staffPayments) {
    staffPayments.forEach((staffPayment) => {
      // Filter out staff payments with amount 0 or less
      const staffAmount = parseFloat(staffPayment.amount.toString());
      if (staffAmount <= 0) {
        return; // Skip this staff payment
      }

      // Get staff info - handle both array and single object responses
      const staff = Array.isArray(staffPayment.staff) ? staffPayment.staff[0] : staffPayment.staff;
      
      // Filter by academy_id if staff has academy_id field
      if (staff && (staff as any).academy_id && (staff as any).academy_id !== academyId) {
        return; // Skip staff payments from other academies
      }

      const description = staff 
        ? `Nómina - ${staff.first_name} ${staff.last_name}${(staff as any).role ? ` (${(staff as any).role})` : ''}`
        : 'Nómina';

      // Only include if type filter allows expense or is 'all'
      if (!filter.type || filter.type === 'all' || filter.type === 'expense') {
        // Apply search filter if provided
        if (!filter.search || description.toLowerCase().includes(filter.search.toLowerCase())) {
          transactions.push({
            id: staffPayment.id,
            type: 'expense',
            amount: staffAmount,
            date: staffPayment.payment_date,
            description,
            category: 'Nómina',
            method: 'transfer', // Staff payments are typically transfers
          });
        }
      }
    });
  }

  // Sort all transactions by date (oldest first for accumulated balance calculation)
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate accumulated balance for each transaction
  let runningBalance = 0;
  transactions.forEach((transaction) => {
    if (transaction.type === 'income') {
      runningBalance += transaction.amount;
    } else {
      runningBalance -= transaction.amount;
    }
    transaction.accumulated_balance = runningBalance;
  });

  // Sort back to newest first for display
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return transactions;
}

/**
 * Calculate balance for a given period
 */
export async function getBalance(startDate?: string, endDate?: string): Promise<Balance> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();

  if (!academyId) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      period: {
        start: startDate || new Date().toISOString().split('T')[0],
        end: endDate || new Date().toISOString().split('T')[0],
      },
    };
  }

  // Default to current month if no dates provided
  const today = new Date();
  const defaultStart = startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // Get all income (approved payments) - include both player payments and sponsor payments
  let paymentsQuery = supabase
    .from('payments')
    .select('amount, status, player_id, type')
    .or('player_id.not.is.null,sponsor_id.not.is.null,and(type.eq.custom,player_id.is.null)') // Include payments with player_id OR sponsor_id OR external incomes
    .neq('status', 'Rejected')
    .neq('status', 'Cancelled')
    .gte('payment_date', defaultStart)
    .lte('payment_date', defaultEnd)
    .eq('academy_id', academyId);

  const { data: payments } = await paymentsQuery;

  const validPayments = (payments || []).filter(p => {
    // Status check
    if (!p.status || p.status === '') {
      // For backward compatibility, check if it's a valid payment type
      const isPlayerPayment = p.player_id !== null;
      const isExternalIncome = p.player_id === null && p.type === 'custom';
      return isPlayerPayment || isExternalIncome;
    }
    const hasValidStatus = p.status === 'Approved' || p.status === 'Pending';
    // Include player payments OR external incomes
    const isPlayerPayment = p.player_id !== null;
    const isExternalIncome = p.player_id === null && p.type === 'custom';
    return hasValidStatus && (isPlayerPayment || isExternalIncome);
  });

  const totalIncome = validPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  // Get all expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('date', defaultStart)
    .lte('date', defaultEnd)
    .eq('academy_id', academyId);

  const totalOperationalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

  // Get staff payments
  const { data: staffPayments } = await supabase
    .from('staff_payments')
    .select('amount')
    .gte('payment_date', defaultStart)
    .lte('payment_date', defaultEnd);

  const totalStaffExpenses = (staffPayments || []).reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);

  const totalExpenses = totalOperationalExpenses + totalStaffExpenses;
  const netBalance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netBalance,
    period: {
      start: defaultStart,
      end: defaultEnd,
    },
  };
}

/**
 * Get balance summary for different periods
 */
export async function getBalanceSummary() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Current month
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

  // Current quarter
  const quarter = Math.floor(currentMonth / 3);
  const startOfQuarter = new Date(currentYear, quarter * 3, 1).toISOString().split('T')[0];
  const endOfQuarter = new Date(currentYear, (quarter + 1) * 3, 0).toISOString().split('T')[0];

  // Current year
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const [monthly, quarterly, annual] = await Promise.all([
    getBalance(startOfMonth, endOfMonth),
    getBalance(startOfQuarter, endOfQuarter),
    getBalance(startOfYear, endOfYear),
  ]);

  return {
    monthly,
    quarterly,
    annual,
  };
}


