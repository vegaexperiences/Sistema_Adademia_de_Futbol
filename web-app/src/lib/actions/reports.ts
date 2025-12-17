'use server';

import { createClient } from '@/lib/supabase/server';
import { calculateMonthlyFee } from './payments';
import { getTotalStaffExpenses } from './staff';

export interface FinancialKPIs {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number; // percentage
  activePlayers: number;
  scholarshipPlayers: number;
  scholarshipOpportunityCost: number;
  expectedMonthlyIncome: number;
  actualVsExpected: number; // difference
  actualVsExpectedPercent: number; // percentage difference
}

export interface ScholarshipPlayer {
  id: string;
  first_name: string;
  last_name: string;
  category: string | null;
  family_id: string | null;
  custom_monthly_fee: number | null;
  opportunityCost: number; // What they would pay if not scholarship
  created_at: string;
}

export interface ScholarshipImpactAnalysis {
  totalScholarshipPlayers: number;
  totalActivePlayers: number;
  scholarshipPercentage: number;
  monthlyOpportunityCost: number;
  annualOpportunityCost: number;
  players: ScholarshipPlayer[];
  impactOnProfit: {
    currentProfit: number;
    profitWithoutScholarships: number;
    scholarshipImpact: number;
  };
}

export interface BusinessProjection {
  months: number;
  currentIncome: number;
  currentExpenses: number;
  currentProfit: number;
  projections: {
    optimistic: {
      income: number;
      expenses: number;
      profit: number;
      profitMargin: number;
    };
    realistic: {
      income: number;
      expenses: number;
      profit: number;
      profitMargin: number;
    };
    pessimistic: {
      income: number;
      expenses: number;
      profit: number;
      profitMargin: number;
    };
  };
  historicalData: {
    month: string;
    income: number;
    expenses: number;
    profit: number;
  }[];
}

export interface PlayerReportData {
  summary: {
    totalActive: number;
    totalScholarship: number;
    totalPending: number;
    byCategory: Record<string, number>;
  };
  activePlayers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    category: string | null;
    status: string;
    monthly_fee: number;
    family_name: string | null;
    last_payment_date: string | null;
    payment_status: string | null;
  }>;
  scholarshipPlayers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    category: string | null;
    opportunity_cost: number;
    created_at: string;
  }>;
}

export interface FinancialReportData {
  period: {
    start: string;
    end: string;
    type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  };
  summary: FinancialKPIs;
  income: {
    byType: Record<string, number>;
    byMethod: Record<string, number>;
    byPlayer: Array<{
      player_id: string;
      player_name: string;
      total: number;
    }>;
    byFamily: Array<{
      family_id: string;
      family_name: string;
      total: number;
    }>;
  };
  expenses: {
    operational: Array<{
      category: string;
      amount: number;
    }>;
    staff: number;
    total: number;
  };
  scholarshipImpact: ScholarshipImpactAnalysis;
}

export interface OKRsData {
  period: string;
  financial: {
    revenue: {
      target: number;
      current: number;
      progress: number; // percentage
    };
    profit: {
      target: number;
      current: number;
      progress: number;
    };
    margin: {
      target: number; // percentage
      current: number;
      progress: number;
    };
  };
  operational: {
    activePlayers: {
      target: number;
      current: number;
      progress: number;
    };
    retention: {
      target: number; // percentage
      current: number;
      progress: number;
    };
  };
}

/**
 * Get financial KPIs for a given period
 */
export async function getFinancialKPIs(startDate: string, endDate: string): Promise<FinancialKPIs> {
  const supabase = await createClient();

  // Get all data in parallel
  // Include all payment methods and filter properly
  const [paymentsResult, expensesResult, staffPaymentsResult, playersResult] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, status, method')
      .not('player_id', 'is', null)
      .neq('status', 'Rejected')
      .neq('status', 'Cancelled')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      ,
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', startDate)
      .lte('date', endDate)
      ,
    supabase
      .from('staff_payments')
      .select('amount')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate),
    supabase
      .from('players')
      .select('id, status')
      .in('status', ['Active', 'Scholarship'])
      ,
  ]);

  // Calculate income - include Approved and Pending payments (Pending might be approved later)
  // Exclude only Rejected and Cancelled
  const validPayments = (paymentsResult.data || []).filter(p => {
    if (!p.status || p.status === '') return true; // Backward compatibility
    return p.status === 'Approved' || p.status === 'Pending';
  });
  
  // Log for debugging
  const rejectedPayments = (paymentsResult.data || []).filter(p => p.status === 'Rejected' || p.status === 'Cancelled');
  if (rejectedPayments.length > 0) {
    console.log('[getFinancialKPIs] Excluded payments:', rejectedPayments.length);
  }
  
  const totalIncome = validPayments
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  // Calculate expenses
  const operationalExpenses = (expensesResult.data || [])
    .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const staffExpenses = (staffPaymentsResult.data || [])
    .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
  const totalExpenses = operationalExpenses + staffExpenses;

  // Calculate profit
  const profit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  // Get players
  const allPlayers = playersResult.data || [];
  const activePlayers = allPlayers.filter(p => p.status === 'Active').length;
  const scholarshipPlayers = allPlayers.filter(p => p.status === 'Scholarship').length;

  // Optimized: Calculate expected monthly income and scholarship opportunity cost in batch
  // Get settings once
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

  // Get all players with their family info and calculate fees in batch
  const { data: playersWithFees } = await supabase
    .from('players')
    .select(`
      id,
      status,
      custom_monthly_fee,
      family_id,
      families(id)
    `)
    .in('status', ['Active', 'Scholarship'])
    ;

  if (!playersWithFees || playersWithFees.length === 0) {
    return {
      totalIncome,
      totalExpenses,
      profit,
      profitMargin,
      activePlayers: 0,
      scholarshipPlayers: 0,
      scholarshipOpportunityCost: 0,
      expectedMonthlyIncome: 0,
      actualVsExpected: totalIncome,
      actualVsExpectedPercent: 0,
    };
  }

  // Get family player counts in one query
  const { data: familyCounts } = await supabase
    .from('players')
    .select('family_id')
    .in('status', ['Active', 'Scholarship'])
    .not('family_id', 'is', null)
    ;

  const familyPlayerCounts: Record<string, number> = {};
  (familyCounts || []).forEach(p => {
    if (p.family_id) {
      familyPlayerCounts[p.family_id] = (familyPlayerCounts[p.family_id] || 0) + 1;
    }
  });

  // Get player order within families for family discount calculation
  const { data: familyPlayerOrder } = await supabase
    .from('players')
    .select('id, family_id, created_at')
    .in('status', ['Active', 'Scholarship'])
    .not('family_id', 'is', null)
    
    .order('family_id')
    .order('created_at');

  const playerOrderInFamily: Record<string, number> = {};
  let currentFamilyId: string | null = null;
  let currentIndex = 0;
  (familyPlayerOrder || []).forEach(p => {
    if (p.family_id !== currentFamilyId) {
      currentFamilyId = p.family_id;
      currentIndex = 0;
    }
    playerOrderInFamily[p.id] = currentIndex;
    currentIndex++;
  });

  // Calculate fees in batch
  let expectedMonthlyIncome = 0;
  let scholarshipOpportunityCost = 0;

  for (const player of playersWithFees) {
    let monthlyFee = 0;
    let opportunityCost = 0;

    if (player.status === 'Scholarship') {
      // Calculate opportunity cost (what they would pay if not scholarship)
      if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
        opportunityCost = player.custom_monthly_fee;
      } else {
        const family = Array.isArray(player.families) ? player.families[0] : player.families;
        if (family?.id && familyPlayerCounts[family.id] >= 2) {
          const playerIndex = playerOrderInFamily[player.id] || 0;
          opportunityCost = playerIndex >= 1 ? familyFee : normalFee;
        } else {
          opportunityCost = normalFee;
        }
      }
      scholarshipOpportunityCost += opportunityCost;
    } else {
      // Calculate monthly fee for active players
      if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
        monthlyFee = player.custom_monthly_fee;
      } else {
        const family = Array.isArray(player.families) ? player.families[0] : player.families;
        if (family?.id && familyPlayerCounts[family.id] >= 2) {
          const playerIndex = playerOrderInFamily[player.id] || 0;
          monthlyFee = playerIndex >= 1 ? familyFee : normalFee;
        } else {
          monthlyFee = normalFee;
        }
      }
      expectedMonthlyIncome += monthlyFee;
    }
  }

  // Calculate actual vs expected
  const actualVsExpected = totalIncome - expectedMonthlyIncome;
  const actualVsExpectedPercent = expectedMonthlyIncome > 0 
    ? (actualVsExpected / expectedMonthlyIncome) * 100 
    : 0;

  return {
    totalIncome,
    totalExpenses,
    profit,
    profitMargin,
    activePlayers,
    scholarshipPlayers,
    scholarshipOpportunityCost,
    expectedMonthlyIncome,
    actualVsExpected,
    actualVsExpectedPercent,
  };
}

/**
 * Calculate opportunity cost for a scholarship player
 * (What they would pay if they were active instead of scholarship)
 */
async function calculateScholarshipOpportunityCost(playerId: string): Promise<number> {
  const supabase = await createClient();

  // Get player data
  let query = supabase
    .from('players')
    .select('*, families(id)')
    .eq('id', playerId);

  if (academyId) {
    query = query;
  }

  const { data: player } = await query.single();

  if (!player || player.status !== 'Scholarship') {
    return 0;
  }

  // Get settings
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

  // If has custom fee, use it
  if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
    return player.custom_monthly_fee;
  }

  // Check if part of family with 2+ players
  if (player.families?.id) {
    let familyQuery = supabase
      .from('players')
      .select('id, first_name')
      .eq('family_id', player.families.id)
      .in('status', ['Active', 'Scholarship'])
      .order('created_at');

    if (academyId) {
      familyQuery = familyQuery;
    }

    const { data: familyPlayers } = await familyQuery;

    if (familyPlayers && familyPlayers.length >= 2) {
      const playerIndex = familyPlayers.findIndex(p => p.id === playerId);
      if (playerIndex >= 1) {
        return familyFee;
      }
    }
  }

  return normalFee;
}

/**
 * Get scholarship impact analysis
 */
export async function getScholarshipImpactAnalysis(
  startDate: string,
  endDate: string
): Promise<ScholarshipImpactAnalysis> {
  const supabase = await createClient();

  // Get all players
  let playersQuery = supabase
    .from('players')
    .select('id, first_name, last_name, category, family_id, custom_monthly_fee, status, created_at')
    .in('status', ['Active', 'Scholarship'])
    ;

  const { data: allPlayers } = await playersQuery;

  if (!allPlayers) {
    return {
      totalScholarshipPlayers: 0,
      totalActivePlayers: 0,
      scholarshipPercentage: 0,
      monthlyOpportunityCost: 0,
      annualOpportunityCost: 0,
      players: [],
      impactOnProfit: {
        currentProfit: 0,
        profitWithoutScholarships: 0,
        scholarshipImpact: 0,
      },
    };
  }

  const activePlayers = allPlayers.filter(p => p.status === 'Active');
  const scholarshipPlayers = allPlayers.filter(p => p.status === 'Scholarship');

  // Optimized: Calculate opportunity costs in batch
  // Get settings once
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

  // Get family player counts
  const { data: familyCounts } = await supabase
    .from('players')
    .select('family_id')
    .in('status', ['Active', 'Scholarship'])
    .not('family_id', 'is', null)
    ;

  const familyPlayerCounts: Record<string, number> = {};
  (familyCounts || []).forEach(p => {
    if (p.family_id) {
      familyPlayerCounts[p.family_id] = (familyPlayerCounts[p.family_id] || 0) + 1;
    }
  });

  // Get player order within families
  const { data: familyPlayerOrder } = await supabase
    .from('players')
    .select('id, family_id, created_at')
    .in('status', ['Active', 'Scholarship'])
    .not('family_id', 'is', null)
    
    .order('family_id')
    .order('created_at');

  const playerOrderInFamily: Record<string, number> = {};
  let currentFamilyId: string | null = null;
  let currentIndex = 0;
  (familyPlayerOrder || []).forEach(p => {
    if (p.family_id !== currentFamilyId) {
      currentFamilyId = p.family_id;
      currentIndex = 0;
    }
    playerOrderInFamily[p.id] = currentIndex;
    currentIndex++;
  });

  // Get family info for scholarship players
  const scholarshipPlayerIds = scholarshipPlayers.map(p => p.id);
  const { data: scholarshipPlayersWithFamilies } = await supabase
    .from('players')
    .select('id, families(id)')
    .in('id', scholarshipPlayerIds)
    ;

  const familyMap: Record<string, any> = {};
  (scholarshipPlayersWithFamilies || []).forEach(p => {
    const family = Array.isArray(p.families) ? p.families[0] : p.families;
    if (family) {
      familyMap[p.id] = family;
    }
  });

  // Calculate opportunity costs in batch
  const scholarshipPlayersWithCost: ScholarshipPlayer[] = scholarshipPlayers.map((player) => {
    let opportunityCost = 0;

    if (player.custom_monthly_fee !== null && player.custom_monthly_fee !== undefined) {
      opportunityCost = player.custom_monthly_fee;
    } else {
      const family = familyMap[player.id];
      if (family?.id && familyPlayerCounts[family.id] >= 2) {
        const playerIndex = playerOrderInFamily[player.id] || 0;
        opportunityCost = playerIndex >= 1 ? familyFee : normalFee;
      } else {
        opportunityCost = normalFee;
      }
    }

    return {
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      category: player.category,
      family_id: player.family_id,
      custom_monthly_fee: player.custom_monthly_fee,
      opportunityCost,
      created_at: player.created_at,
    };
  });

  const monthlyOpportunityCost = scholarshipPlayersWithCost.reduce(
    (sum, p) => sum + p.opportunityCost,
    0
  );
  const annualOpportunityCost = monthlyOpportunityCost * 12;

  // Calculate impact on profit
  const [paymentsResult, expensesResult, staffPaymentsResult] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, status')
      .not('player_id', 'is', null)
      .eq('status', 'Approved')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      ,
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', startDate)
      .lte('date', endDate)
      ,
    supabase
      .from('staff_payments')
      .select('amount')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate),
  ]);

  const currentIncome = (paymentsResult.data || [])
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const operationalExpenses = (expensesResult.data || [])
    .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const staffExpenses = (staffPaymentsResult.data || [])
    .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
  const totalExpenses = operationalExpenses + staffExpenses;

  const currentProfit = currentIncome - totalExpenses;
  const profitWithoutScholarships = (currentIncome + monthlyOpportunityCost) - totalExpenses;
  const scholarshipImpact = profitWithoutScholarships - currentProfit;

  return {
    totalScholarshipPlayers: scholarshipPlayers.length,
    totalActivePlayers: activePlayers.length,
    scholarshipPercentage: allPlayers.length > 0 
      ? (scholarshipPlayers.length / allPlayers.length) * 100 
      : 0,
    monthlyOpportunityCost,
    annualOpportunityCost,
    players: scholarshipPlayersWithCost,
    impactOnProfit: {
      currentProfit,
      profitWithoutScholarships,
      scholarshipImpact,
    },
  };
}

/**
 * Get business projection based on historical trends
 */
export async function getBusinessProjection(months: number = 12): Promise<BusinessProjection> {
  const supabase = await createClient();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Get last 12 months of data for trend analysis
  const historicalMonths = 12;
  const startDate = new Date(currentYear, currentMonth - historicalMonths, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Get historical data
  const [paymentsResult, expensesResult, staffPaymentsResult] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, payment_date, status')
      .not('player_id', 'is', null)
      .eq('status', 'Approved')
      .gte('payment_date', startDateStr)
      .lte('payment_date', endDateStr)
      ,
    supabase
      .from('expenses')
      .select('amount, date')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      ,
    supabase
      .from('staff_payments')
      .select('amount, payment_date')
      .gte('payment_date', startDateStr)
      .lte('payment_date', endDateStr),
  ]);

  // Group by month
  const monthlyData: Record<string, { income: number; expenses: number }> = {};

  (paymentsResult.data || []).forEach(p => {
    const date = new Date(p.payment_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    monthlyData[monthKey].income += parseFloat(p.amount.toString());
  });

  (expensesResult.data || []).forEach(e => {
    const date = new Date(e.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    monthlyData[monthKey].expenses += parseFloat(e.amount.toString());
  });

  (staffPaymentsResult.data || []).forEach(s => {
    const date = new Date(s.payment_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    monthlyData[monthKey].expenses += parseFloat(s.amount.toString());
  });

  // Calculate current month data
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const currentIncome = monthlyData[currentMonthKey]?.income || 0;
  const currentExpenses = monthlyData[currentMonthKey]?.expenses || 0;
  const currentProfit = currentIncome - currentExpenses;

  // Calculate average monthly growth rate
  const sortedMonths = Object.keys(monthlyData).sort();
  const incomeValues = sortedMonths.map(m => monthlyData[m].income);
  const expenseValues = sortedMonths.map(m => monthlyData[m].expenses);

  // Calculate growth rates
  let avgIncomeGrowth = 0;
  let avgExpenseGrowth = 0;

  if (incomeValues.length >= 2) {
    const growthRates = [];
    for (let i = 1; i < incomeValues.length; i++) {
      if (incomeValues[i - 1] > 0) {
        growthRates.push((incomeValues[i] - incomeValues[i - 1]) / incomeValues[i - 1]);
      }
    }
    avgIncomeGrowth = growthRates.length > 0
      ? growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
      : 0;
  }

  if (expenseValues.length >= 2) {
    const growthRates = [];
    for (let i = 1; i < expenseValues.length; i++) {
      if (expenseValues[i - 1] > 0) {
        growthRates.push((expenseValues[i] - expenseValues[i - 1]) / expenseValues[i - 1]);
      }
    }
    avgExpenseGrowth = growthRates.length > 0
      ? growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
      : 0.02; // Default 2% inflation if no data
  } else {
    avgExpenseGrowth = 0.02; // Default 2% inflation
  }

  // Projections
  const optimistic = {
    income: currentIncome * Math.pow(1 + (avgIncomeGrowth * 1.5), months),
    expenses: currentExpenses * Math.pow(1 + avgExpenseGrowth, months),
    profit: 0,
    profitMargin: 0,
  };
  optimistic.profit = optimistic.income - optimistic.expenses;
  optimistic.profitMargin = optimistic.income > 0 ? (optimistic.profit / optimistic.income) * 100 : 0;

  const realistic = {
    income: currentIncome * Math.pow(1 + avgIncomeGrowth, months),
    expenses: currentExpenses * Math.pow(1 + avgExpenseGrowth, months),
    profit: 0,
    profitMargin: 0,
  };
  realistic.profit = realistic.income - realistic.expenses;
  realistic.profitMargin = realistic.income > 0 ? (realistic.profit / realistic.income) * 100 : 0;

  const pessimistic = {
    income: currentIncome * Math.pow(1 + (avgIncomeGrowth * 0.5), months),
    expenses: currentExpenses * Math.pow(1 + (avgExpenseGrowth * 1.5), months),
    profit: 0,
    profitMargin: 0,
  };
  pessimistic.profit = pessimistic.income - pessimistic.expenses;
  pessimistic.profitMargin = pessimistic.income > 0 ? (pessimistic.profit / pessimistic.income) * 100 : 0;

  // Format historical data
  const historicalData = sortedMonths.map(monthKey => {
    const data = monthlyData[monthKey];
    const [year, month] = monthKey.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return {
      month: `${monthNames[parseInt(month) - 1]} ${year}`,
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    };
  });

  return {
    months,
    currentIncome,
    currentExpenses,
    currentProfit,
    projections: {
      optimistic,
      realistic,
      pessimistic,
    },
    historicalData,
  };
}

/**
 * Get player report data
 */
export async function getPlayerReportData(): Promise<PlayerReportData> {
  const supabase = await createClient();

  // Get all players
  let playersQuery = supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      category,
      status,
      custom_monthly_fee,
      family_id,
      last_payment_date,
      payment_status,
      created_at,
      families(tutor_name)
    `)
    ;

  const { data: allPlayers } = await playersQuery;

  if (!allPlayers) {
    return {
      summary: {
        totalActive: 0,
        totalScholarship: 0,
        totalPending: 0,
        byCategory: {},
      },
      activePlayers: [],
      scholarshipPlayers: [],
    };
  }

  // Get pending players
  let pendingQuery = supabase
    .from('pending_players')
    .select('id')
    ;

  const { data: pendingPlayers } = await pendingQuery;
  const totalPending = pendingPlayers?.length || 0;

  // Categorize players
  const activePlayers = allPlayers.filter(p => p.status === 'Active');
  const scholarshipPlayers = allPlayers.filter(p => p.status === 'Scholarship');

  // Count by category
  const byCategory: Record<string, number> = {};
  allPlayers.forEach(p => {
    const category = p.category || 'Sin categoría';
    byCategory[category] = (byCategory[category] || 0) + 1;
  });

  // Get monthly fees for active players
  const activePlayersWithFees = await Promise.all(
    activePlayers.map(async (player) => {
      const monthlyFee = await calculateMonthlyFee(player.id);
      const family = Array.isArray(player.families) ? player.families[0] : player.families;
      return {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        category: player.category,
        status: player.status,
        monthly_fee: monthlyFee,
        family_name: family?.tutor_name || null,
        last_payment_date: player.last_payment_date,
        payment_status: player.payment_status,
      };
    })
  );

  // Get opportunity costs for scholarship players
  const scholarshipPlayersWithCosts = await Promise.all(
    scholarshipPlayers.map(async (player) => {
      const opportunityCost = await calculateScholarshipOpportunityCost(player.id);
      return {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        category: player.category,
        opportunity_cost: opportunityCost,
        created_at: player.created_at || new Date().toISOString(),
      };
    })
  );

  return {
    summary: {
      totalActive: activePlayers.length,
      totalScholarship: scholarshipPlayers.length,
      totalPending,
      byCategory,
    },
    activePlayers: activePlayersWithFees,
    scholarshipPlayers: scholarshipPlayersWithCosts,
  };
}

/**
 * Get comprehensive financial report data
 */
export async function getFinancialReportData(
  startDate: string,
  endDate: string
): Promise<FinancialReportData> {
  const supabase = await createClient();

  // Get KPIs
  const kpis = await getFinancialKPIs(startDate, endDate);

  // Get payments with details
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      amount,
      type,
      method,
      payment_date,
      player_id,
      players(first_name, last_name, family_id, families(tutor_name))
    `)
    .not('player_id', 'is', null)
    .eq('status', 'Approved')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)
    ;

  // Group income by type
  const incomeByType: Record<string, number> = {};
  const incomeByMethod: Record<string, number> = {};
  const incomeByPlayer: Record<string, { player_id: string; player_name: string; total: number }> = {};
  const incomeByFamily: Record<string, { family_id: string; family_name: string; total: number }> = {};

  (payments || []).forEach(p => {
    const amount = parseFloat(p.amount.toString());
    const type = p.type || 'custom';
    const method = p.method || 'other';
    const player = Array.isArray(p.players) ? p.players[0] : p.players;
    const family = player?.families ? (Array.isArray(player.families) ? player.families[0] : player.families) : null;

    // By type
    incomeByType[type] = (incomeByType[type] || 0) + amount;

    // By method
    incomeByMethod[method] = (incomeByMethod[method] || 0) + amount;

    // By player
    if (p.player_id && player) {
      const playerName = `${player.first_name} ${player.last_name}`;
      if (!incomeByPlayer[p.player_id]) {
        incomeByPlayer[p.player_id] = {
          player_id: p.player_id,
          player_name: playerName,
          total: 0,
        };
      }
      incomeByPlayer[p.player_id].total += amount;
    }

    // By family
    if (player?.family_id && family) {
      const familyName = family.tutor_name || 'Sin nombre';
      if (!incomeByFamily[player.family_id]) {
        incomeByFamily[player.family_id] = {
          family_id: player.family_id,
          family_name: familyName,
          total: 0,
        };
      }
      incomeByFamily[player.family_id].total += amount;
    }
  });

  // Get expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      amount,
      category,
      expense_categories(name)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    ;

  const expensesByCategory: Record<string, number> = {};
  (expenses || []).forEach(e => {
    const amount = parseFloat(e.amount.toString());
    const expenseCategory = Array.isArray(e.expense_categories) 
      ? e.expense_categories[0] 
      : e.expense_categories;
    const categoryName = expenseCategory?.name || e.category || 'Sin categoría';
    expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + amount;
  });

  const operationalExpenses = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    amount,
  }));

  const staffExpenses = await getTotalStaffExpenses(startDate, endDate);
  const totalExpenses = operationalExpenses.reduce((sum, e) => sum + e.amount, 0) + staffExpenses;

  // Get scholarship impact
  const scholarshipImpact = await getScholarshipImpactAnalysis(startDate, endDate);

  // Determine period type
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  let periodType: 'monthly' | 'quarterly' | 'annual' | 'custom' = 'custom';
  if (daysDiff <= 35) {
    periodType = 'monthly';
  } else if (daysDiff <= 100) {
    periodType = 'quarterly';
  } else if (daysDiff <= 370) {
    periodType = 'annual';
  }

  return {
    period: {
      start: startDate,
      end: endDate,
      type: periodType,
    },
    summary: kpis,
    income: {
      byType: incomeByType,
      byMethod: incomeByMethod,
      byPlayer: Object.values(incomeByPlayer).sort((a, b) => b.total - a.total),
      byFamily: Object.values(incomeByFamily).sort((a, b) => b.total - a.total),
    },
    expenses: {
      operational: operationalExpenses.sort((a, b) => b.amount - a.amount),
      staff: staffExpenses,
      total: totalExpenses,
    },
    scholarshipImpact,
  };
}

/**
 * Get OKRs data
 */
export async function getOKRsData(period: 'monthly' | 'quarterly' | 'annual' = 'monthly'): Promise<OKRsData> {
  const today = new Date();
  let startDate: string;
  let endDate: string;

  if (period === 'monthly') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    startDate = start.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
  } else if (period === 'quarterly') {
    const quarter = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), quarter * 3, 1);
    const end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
    startDate = start.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
  } else {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    startDate = start.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
  }

  const kpis = await getFinancialKPIs(startDate, endDate);

  // Get player count from previous period for retention calculation
  const supabase = await createClient();

  const prevStart = new Date(startDate);
  prevStart.setMonth(prevStart.getMonth() - (period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12));
  const prevEnd = new Date(startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const { data: currentPlayers } = await supabase
    .from('players')
    .select('id')
    .in('status', ['Active', 'Scholarship'])
    ;

  const { data: previousPlayers } = await supabase
    .from('players')
    .select('id')
    .in('status', ['Active', 'Scholarship'])
    
    .lte('created_at', prevEnd.toISOString());

  const currentPlayerCount = currentPlayers?.length || 0;
  const previousPlayerCount = previousPlayers?.length || 0;
  const retention = previousPlayerCount > 0 
    ? (currentPlayerCount / previousPlayerCount) * 100 
    : 100;

  // Get targets from settings (with fallback to calculated defaults)
  const { getOKRTarget } = await import('@/lib/actions/okrs');
  
  const revenueTarget = await getOKRTarget(period, 'revenue', kpis.totalIncome);
  const profitTarget = await getOKRTarget(period, 'profit', kpis.profit);
  const marginTarget = await getOKRTarget(period, 'margin', kpis.profitMargin);
  const activePlayersTarget = await getOKRTarget(period, 'activePlayers', currentPlayerCount);
  const retentionTarget = await getOKRTarget(period, 'retention', retention);

  return {
    period,
    financial: {
      revenue: {
        target: revenueTarget,
        current: kpis.totalIncome,
        progress: revenueTarget > 0 ? (kpis.totalIncome / revenueTarget) * 100 : 0,
      },
      profit: {
        target: profitTarget,
        current: kpis.profit,
        progress: profitTarget > 0 ? (kpis.profit / profitTarget) * 100 : 0,
      },
      margin: {
        target: marginTarget,
        current: kpis.profitMargin,
        progress: marginTarget > 0 ? (kpis.profitMargin / marginTarget) * 100 : 0,
      },
    },
    operational: {
      activePlayers: {
        target: activePlayersTarget,
        current: currentPlayerCount,
        progress: activePlayersTarget > 0 ? (currentPlayerCount / activePlayersTarget) * 100 : 0,
      },
      retention: {
        target: retentionTarget,
        current: retention,
        progress: retentionTarget > 0 ? (retention / retentionTarget) * 100 : 0,
      },
    },
  };
}

