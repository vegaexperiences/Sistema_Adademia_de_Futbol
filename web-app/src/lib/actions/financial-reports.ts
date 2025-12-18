'use server';

import { createClient } from '@/lib/supabase/server';
import { getTotalStaffExpenses } from './staff';

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ExpenseByCategoryData {
  category: string;
  amount: number;
  color: string;
}

export async function getMonthlyIncomeVsExpense(year: number): Promise<MonthlyData[]> {
  const supabase = await createClient();
  
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  // Get all payments and expenses for the year in parallel
  // Only approved payments - rejections are not real payments
  // Include external incomes (player_id = null, type = 'custom') and player payments
  const [paymentsResult, expensesResult, staffResult, lateFeesResult] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, payment_date, status, player_id, type')
      .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      ,
    supabase
      .from('expenses')
      .select('amount, date')
      .gte('date', startDate)
      .lte('date', endDate)
      ,
    supabase
      .from('staff_payments')
      .select('amount, payment_date')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate),
    supabase
      .from('late_fees')
      .select('late_fee_amount, applied_at')
      .gte('applied_at', startDate)
      .lte('applied_at', endDate)
      
  ]);
  
  // Group by month in JavaScript
  const data: MonthlyData[] = months.map((monthName, monthIndex) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    
    // Calculate income for this month
    // Filter by status if it exists, otherwise include all payments (for backward compatibility)
    // Include player payments (player_id not null) OR external incomes (player_id null and type = 'custom')
    const income = (paymentsResult.data || [])
      .filter(p => {
        const date = new Date(p.payment_date);
        const isInMonth = date >= monthStart && date <= monthEnd;
        // If status field exists, only include 'Approved' payments
        // If status doesn't exist (before migration), include all payments
        const hasValidStatus = !p.status || p.status === 'Approved';
        // Include player payments OR external incomes (player_id null and type custom)
        const isPlayerPayment = p.player_id !== null;
        const isExternalIncome = p.player_id === null && p.type === 'custom';
        return isInMonth && hasValidStatus && (isPlayerPayment || isExternalIncome);
      })
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
    // Add late fees income for this month
    const lateFeesIncome = (lateFeesResult.data || [])
      .filter(fee => {
        const date = new Date(fee.applied_at);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, fee) => sum + parseFloat(fee.late_fee_amount.toString()), 0);
    
    const totalIncome = income + lateFeesIncome;
    
    // Calculate operational expenses for this month
    const operationalExpenses = (expensesResult.data || [])
      .filter(e => {
        const date = new Date(e.date);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    
    // Calculate staff expenses for this month
    const staffExpenses = (staffResult.data || [])
      .filter(s => {
        const date = new Date(s.payment_date);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
    
    const totalExpenses = operationalExpenses + staffExpenses;
    
    return {
      month: monthName,
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses
    };
  });
  
  return data;
}

export async function getExpensesByCategory(startDate: string, endDate: string): Promise<ExpenseByCategoryData[]> {
  const supabase = await createClient();
  
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      amount,
      expense_categories (
        name,
        color
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    ;
  
  if (!expenses) return [];
  
  // Group by category
  const grouped = expenses.reduce((acc: any, expense: any) => {
    const categoryName = expense.expense_categories?.name || 'Sin categoría';
    const categoryColor = expense.expense_categories?.color || '#94A3B8';
    
    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: categoryName,
        amount: 0,
        color: categoryColor
      };
    }
    
    acc[categoryName].amount += parseFloat(expense.amount.toString());
    return acc;
  }, {});
  
  return Object.values(grouped);
}

export async function getCashFlow(startDate: string, endDate: string) {
  const supabase = await createClient();
  
  // Get all income - only approved payments, rejections are not real payments
  // Include external incomes (player_id = null, type = 'custom') and player payments
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_date, status, player_id, type')
    .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)
    
    .order('payment_date');
  
  // Filter by status if it exists, otherwise include all (backward compatibility)
  // Include player payments (player_id not null) OR external incomes (player_id null and type = 'custom')
  const approvedPayments = (payments || []).filter(p => {
    const hasValidStatus = !p.status || p.status === 'Approved';
    const isPlayerPayment = p.player_id !== null;
    const isExternalIncome = p.player_id === null && p.type === 'custom';
    return hasValidStatus && (isPlayerPayment || isExternalIncome);
  });
  const paymentsIncome = approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  
  // Get late fees income for the period
  const { data: lateFees } = await supabase
    .from('late_fees')
    .select('late_fee_amount')
    .gte('applied_at', startDate)
    .lte('applied_at', endDate)
    ;
  
  const lateFeesIncome = (lateFees || []).reduce((sum, fee) => sum + parseFloat(fee.late_fee_amount.toString()), 0);
  const totalIncome = paymentsIncome + lateFeesIncome;
  
  // Get all expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, date')
    .gte('date', startDate)
    .lte('date', endDate)
    
    .order('date');
  
  const operationalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;
  
  // Get staff expenses
  const staffExpenses = await getTotalStaffExpenses(startDate, endDate);
  
  const totalExpenses = operationalExpenses + staffExpenses;
  
  return {
    income: totalIncome,
    operational_expenses: operationalExpenses,
    staff_expenses: staffExpenses,
    total_expenses: totalExpenses,
    net_cash_flow: totalIncome - totalExpenses
  };
}

export async function getFinancialSummary() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Current month dates
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
  
  const supabase = await createClient();
  
  // Execute all queries in parallel - only approved payments
  // Include all payment methods (cash, transfer, yappy, paguelofacil, card, ach, other)
  // Include external incomes (player_id = null, type = 'custom') and player payments
  const [paymentsResult, expensesResult, staffPaymentsResult, lateFeesResult] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, status, method, player_id, type')
      .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
      .gte('payment_date', startOfMonth)
      .lte('payment_date', endOfMonth)
      ,
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      ,
    supabase
      .from('staff_payments')
      .select('amount')
      .gte('payment_date', startOfMonth)
      .lte('payment_date', endOfMonth),
    supabase
      .from('late_fees')
      .select('late_fee_amount')
      .gte('applied_at', startOfMonth)
      .lte('applied_at', endOfMonth)
      
  ]);
  
  // Filter by status if it exists, otherwise include all (backward compatibility)
  // Include payments with status 'Approved' or null/empty (for backward compatibility)
  // Exclude only 'Rejected' and 'Cancelled' payments
  // Include player payments (player_id not null) OR external incomes (player_id null and type = 'custom')
  const approvedPayments = (paymentsResult.data || []).filter(p => {
    // Status check
    if (p.status === 'Rejected' || p.status === 'Cancelled') return false;
    const hasValidStatus = !p.status || p.status === '' || p.status === 'Approved' || p.status === 'Pending';
    
    // Include player payments OR external incomes
    const isPlayerPayment = p.player_id !== null;
    const isExternalIncome = p.player_id === null && p.type === 'custom';
    
    return hasValidStatus && (isPlayerPayment || isExternalIncome);
  });
  
  // Log for debugging if we find payments with unexpected status
  const unexpectedStatus = approvedPayments.filter(p => p.status && p.status !== 'Approved' && p.status !== 'Pending');
  if (unexpectedStatus.length > 0) {
    console.log('[getFinancialSummary] Payments with unexpected status:', unexpectedStatus.map(p => ({
      id: p.id || 'unknown',
      status: p.status,
      method: p.method,
    })));
  }
  
  const paymentsIncome = approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const lateFeesIncome = (lateFeesResult.data || []).reduce((sum, fee) => sum + parseFloat(fee.late_fee_amount.toString()), 0);
  const totalIncome = paymentsIncome + lateFeesIncome;
  const operationalExpenses = (expensesResult.data || []).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const staffExpenses = (staffPaymentsResult.data || []).reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
  const totalExpenses = operationalExpenses + staffExpenses;
  
  return {
    current_month: {
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses
    },
    period: {
      start: startOfMonth,
      end: endOfMonth
    }
  };
}

/**
 * Get scholarship opportunity cost for a specific month
 * This calculates what the academy would earn if scholarship players were active instead
 */
export async function getScholarshipOpportunityCost(monthYear: string): Promise<number> {
  const supabase = await createClient();

  // Get all scholarship players
  let playersQuery = supabase
    .from('players')
    .select('id, status, custom_monthly_fee, family_id, families(id)')
    .eq('status', 'Scholarship')
    ;

  const { data: scholarshipPlayers } = await playersQuery;

  if (!scholarshipPlayers || scholarshipPlayers.length === 0) {
    return 0;
  }

  // Get settings for pricing
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    ;

  const settingsMap = settings?.reduce((acc: any, s: any) => {
    acc[s.key] = parseFloat(s.value);
    return acc;
  }, {}) || {};

  const normalFee = settingsMap['price_monthly'] || 130;
  const familyFee = settingsMap['price_monthly_family'] || 110.50;

  let totalOpportunityCost = 0;

  // Calculate opportunity cost for each scholarship player
  for (const player of scholarshipPlayers) {
    let opportunityCost = 0;

    // If has custom fee, use it
    if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
      opportunityCost = player.custom_monthly_fee;
    } else {
      // Check if part of family with 2+ players
      const family = Array.isArray(player.families) ? player.families[0] : player.families;
      if (family?.id) {
        let familyQuery = supabase
          .from('players')
          .select('id')
          .eq('family_id', family.id)
          .in('status', ['Active', 'Scholarship'])
          .order('created_at');


        const { data: familyPlayers } = await familyQuery;

        if (familyPlayers && familyPlayers.length >= 2) {
          const playerIndex = familyPlayers.findIndex(p => p.id === player.id);
          if (playerIndex >= 1) {
            opportunityCost = familyFee;
          } else {
            opportunityCost = normalFee;
          }
        } else {
          opportunityCost = normalFee;
        }
      } else {
        opportunityCost = normalFee;
      }
    }

    totalOpportunityCost += opportunityCost;
  }

  return totalOpportunityCost;
}
