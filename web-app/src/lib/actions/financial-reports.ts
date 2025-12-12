'use server';

import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
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
  const academyId = await getCurrentAcademyId();
  
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  // Get all payments and expenses for the year in parallel
  // Only approved payments - rejections are not real payments
  const [paymentsResult, expensesResult, staffResult] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, payment_date, status')
      .not('player_id', 'is', null) // Exclude payments without player_id (pending enrollments)
      .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .eq('academy_id', academyId),
    supabase
      .from('expenses')
      .select('amount, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('academy_id', academyId),
    supabase
      .from('staff_payments')
      .select('amount, payment_date')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
  ]);
  
  // Group by month in JavaScript
  const data: MonthlyData[] = months.map((monthName, monthIndex) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    
    // Calculate income for this month
    // Filter by status if it exists, otherwise include all payments (for backward compatibility)
    const income = (paymentsResult.data || [])
      .filter(p => {
        const date = new Date(p.payment_date);
        const isInMonth = date >= monthStart && date <= monthEnd;
        // If status field exists, only include 'Approved' payments
        // If status doesn't exist (before migration), include all payments
        const hasValidStatus = !p.status || p.status === 'Approved';
        return isInMonth && hasValidStatus;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
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
      income,
      expenses: totalExpenses,
      net: income - totalExpenses
    };
  });
  
  return data;
}

export async function getExpensesByCategory(startDate: string, endDate: string): Promise<ExpenseByCategoryData[]> {
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();
  
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
    .eq('academy_id', academyId);
  
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
  const academyId = await getCurrentAcademyId();
  
  // Get all income - only approved payments, rejections are not real payments
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_date, status')
    .not('player_id', 'is', null) // Exclude payments without player_id (pending enrollments)
    .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)
    .eq('academy_id', academyId)
    .order('payment_date');
  
  // Filter by status if it exists, otherwise include all (backward compatibility)
  const approvedPayments = payments?.filter(p => !p.status || p.status === 'Approved') || [];
  const totalIncome = approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  
  // Get all expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, date')
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('academy_id', academyId)
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
  const academyId = await getCurrentAcademyId();
  
  // Execute all queries in parallel - only approved payments
  const [paymentsResult, expensesResult, staffPaymentsResult] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, status')
      .not('player_id', 'is', null) // Exclude payments without player_id (pending enrollments)
      .neq('status', 'Rejected') // Exclude rejected payments - they are not real payments
      .gte('payment_date', startOfMonth)
      .lte('payment_date', endOfMonth)
      .eq('academy_id', academyId),
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .eq('academy_id', academyId),
    supabase
      .from('staff_payments')
      .select('amount')
      .gte('payment_date', startOfMonth)
      .lte('payment_date', endOfMonth)
  ]);
  
  // Filter by status if it exists, otherwise include all (backward compatibility)
  const approvedPayments = (paymentsResult.data || []).filter(p => !p.status || p.status === 'Approved');
  const income = approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const operationalExpenses = (expensesResult.data || []).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const staffExpenses = (staffPaymentsResult.data || []).reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
  const totalExpenses = operationalExpenses + staffExpenses;
  
  return {
    current_month: {
      income,
      expenses: totalExpenses,
      net: income - totalExpenses
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
  const academyId = await getCurrentAcademyId();

  // Get all scholarship players
  let playersQuery = supabase
    .from('players')
    .select('id, status, custom_monthly_fee, family_id, families(id)')
    .eq('status', 'Scholarship')
    .eq('academy_id', academyId);

  const { data: scholarshipPlayers } = await playersQuery;

  if (!scholarshipPlayers || scholarshipPlayers.length === 0) {
    return 0;
  }

  // Get settings for pricing
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('academy_id', academyId);

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

        if (academyId) {
          familyQuery = familyQuery.eq('academy_id', academyId);
        }

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
