import * as XLSX from 'xlsx';
import type {
  FinancialKPIs,
  ScholarshipImpactAnalysis,
  BusinessProjection,
  PlayerReportData,
  FinancialReportData,
  OKRsData,
} from '@/lib/actions/reports';

/**
 * Generic function to export data to Excel
 */
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Export financial report to Excel with multiple sheets
 */
export function exportFinancialReport(
  reportData: FinancialReportData,
  filename: string = `Reporte_Financiero_${new Date().toISOString().split('T')[0]}.xlsx`
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryData = [
    { Métrica: 'Ingresos Totales', Valor: `$${reportData.summary.totalIncome.toFixed(2)}` },
    { Métrica: 'Gastos Totales', Valor: `$${reportData.summary.totalExpenses.toFixed(2)}` },
    { Métrica: 'Profit', Valor: `$${reportData.summary.profit.toFixed(2)}` },
    { Métrica: 'Margen de Ganancia', Valor: `${reportData.summary.profitMargin.toFixed(2)}%` },
    { Métrica: 'Jugadores Activos', Valor: reportData.summary.activePlayers },
    { Métrica: 'Jugadores Becados', Valor: reportData.summary.scholarshipPlayers },
    { Métrica: 'Costo de Oportunidad Becados', Valor: `$${reportData.summary.scholarshipOpportunityCost.toFixed(2)}` },
    { Métrica: 'Ingreso Esperado Mensual', Valor: `$${reportData.summary.expectedMonthlyIncome.toFixed(2)}` },
    { Métrica: 'Diferencia Real vs Esperado', Valor: `$${reportData.summary.actualVsExpected.toFixed(2)}` },
    { Métrica: 'Diferencia %', Valor: `${reportData.summary.actualVsExpectedPercent.toFixed(2)}%` },
    { Métrica: 'Período', Valor: `${reportData.period.start} a ${reportData.period.end}` },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen Ejecutivo');

  // Sheet 2: Income Details
  const incomeData = [
    { Tipo: 'Tipo de Pago', Monto: 'Monto' },
    ...Object.entries(reportData.income.byType).map(([type, amount]) => ({
      Tipo: type,
      Monto: `$${amount.toFixed(2)}`,
    })),
    { Tipo: '', Monto: '' },
    { Tipo: 'Método de Pago', Monto: 'Monto' },
    ...Object.entries(reportData.income.byMethod).map(([method, amount]) => ({
      Tipo: method,
      Monto: `$${amount.toFixed(2)}`,
    })),
  ];
  const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
  XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Ingresos Detallados');

  // Sheet 3: Income by Player
  const incomeByPlayerData = reportData.income.byPlayer.map(p => ({
    'ID Jugador': p.player_id,
    'Nombre': p.player_name,
    'Total': `$${p.total.toFixed(2)}`,
  }));
  const incomeByPlayerSheet = XLSX.utils.json_to_sheet(incomeByPlayerData);
  XLSX.utils.book_append_sheet(workbook, incomeByPlayerSheet, 'Ingresos por Jugador');

  // Sheet 4: Income by Family
  const incomeByFamilyData = reportData.income.byFamily.map(f => ({
    'ID Familia': f.family_id,
    'Nombre': f.family_name,
    'Total': `$${f.total.toFixed(2)}`,
  }));
  const incomeByFamilySheet = XLSX.utils.json_to_sheet(incomeByFamilyData);
  XLSX.utils.book_append_sheet(workbook, incomeByFamilySheet, 'Ingresos por Familia');

  // Sheet 5: Expenses Details
  const expensesData = [
    { Categoría: 'Categoría', Monto: 'Monto' },
    ...reportData.expenses.operational.map(e => ({
      Categoría: e.category,
      Monto: `$${e.amount.toFixed(2)}`,
    })),
    { Categoría: 'Personal', Monto: `$${reportData.expenses.staff.toFixed(2)}` },
    { Categoría: 'Total Gastos', Monto: `$${reportData.expenses.total.toFixed(2)}` },
  ];
  const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Gastos Detallados');

  // Sheet 6: Scholarship Impact
  const scholarshipData = [
    { Métrica: 'Total Jugadores Becados', Valor: reportData.scholarshipImpact.totalScholarshipPlayers },
    { Métrica: 'Total Jugadores Activos', Valor: reportData.scholarshipImpact.totalActivePlayers },
    { Métrica: '% Becados', Valor: `${reportData.scholarshipImpact.scholarshipPercentage.toFixed(2)}%` },
    { Métrica: 'Costo de Oportunidad Mensual', Valor: `$${reportData.scholarshipImpact.monthlyOpportunityCost.toFixed(2)}` },
    { Métrica: 'Costo de Oportunidad Anual', Valor: `$${reportData.scholarshipImpact.annualOpportunityCost.toFixed(2)}` },
    { Métrica: 'Profit Actual', Valor: `$${reportData.scholarshipImpact.impactOnProfit.currentProfit.toFixed(2)}` },
    { Métrica: 'Profit Sin Becados', Valor: `$${reportData.scholarshipImpact.impactOnProfit.profitWithoutScholarships.toFixed(2)}` },
    { Métrica: 'Impacto en Profit', Valor: `$${reportData.scholarshipImpact.impactOnProfit.scholarshipImpact.toFixed(2)}` },
    { Métrica: '', Valor: '' },
    { Métrica: 'Jugador', Valor: 'Costo de Oportunidad' },
    ...reportData.scholarshipImpact.players.map(p => ({
      Métrica: `${p.first_name} ${p.last_name}`,
      Valor: `$${p.opportunityCost.toFixed(2)}`,
    })),
  ];
  const scholarshipSheet = XLSX.utils.json_to_sheet(scholarshipData);
  XLSX.utils.book_append_sheet(workbook, scholarshipSheet, 'Análisis de Becados');

  XLSX.writeFile(workbook, filename);
}

/**
 * Export player report to Excel
 */
export function exportPlayerReport(
  reportData: PlayerReportData,
  filename: string = `Reporte_Jugadores_${new Date().toISOString().split('T')[0]}.xlsx`
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    { Métrica: 'Total Jugadores Activos', Valor: reportData.summary.totalActive },
    { Métrica: 'Total Jugadores Becados', Valor: reportData.summary.totalScholarship },
    { Métrica: 'Total Jugadores Pendientes', Valor: reportData.summary.totalPending },
    { Métrica: '', Valor: '' },
    { Métrica: 'Categoría', Valor: 'Cantidad' },
    ...Object.entries(reportData.summary.byCategory).map(([category, count]) => ({
      Métrica: category,
      Valor: count,
    })),
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  // Sheet 2: Active Players
  const activePlayersData = reportData.activePlayers.map(p => ({
    'ID': p.id,
    'Nombre': `${p.first_name} ${p.last_name}`,
    'Categoría': p.category || 'Sin categoría',
    'Estado': p.status,
    'Tarifa Mensual': `$${p.monthly_fee.toFixed(2)}`,
    'Familia': p.family_name || 'Sin familia',
    'Último Pago': p.last_payment_date || 'N/A',
    'Estado de Pago': p.payment_status || 'N/A',
  }));
  const activePlayersSheet = XLSX.utils.json_to_sheet(activePlayersData);
  XLSX.utils.book_append_sheet(workbook, activePlayersSheet, 'Jugadores Activos');

  // Sheet 3: Scholarship Players
  const scholarshipPlayersData = reportData.scholarshipPlayers.map(p => ({
    'ID': p.id,
    'Nombre': `${p.first_name} ${p.last_name}`,
    'Categoría': p.category || 'Sin categoría',
    'Costo de Oportunidad': `$${p.opportunity_cost.toFixed(2)}`,
    'Fecha de Creación': new Date(p.created_at).toLocaleDateString('es-ES'),
  }));
  const scholarshipPlayersSheet = XLSX.utils.json_to_sheet(scholarshipPlayersData);
  XLSX.utils.book_append_sheet(workbook, scholarshipPlayersSheet, 'Jugadores Becados');

  XLSX.writeFile(workbook, filename);
}

/**
 * Export KPIs report to Excel
 */
export function exportKPIsReport(
  kpis: FinancialKPIs,
  filename: string = `Reporte_KPIs_${new Date().toISOString().split('T')[0]}.xlsx`
): void {
  const data = [
    { KPI: 'Ingresos Totales', Valor: `$${kpis.totalIncome.toFixed(2)}` },
    { KPI: 'Gastos Totales', Valor: `$${kpis.totalExpenses.toFixed(2)}` },
    { KPI: 'Profit', Valor: `$${kpis.profit.toFixed(2)}` },
    { KPI: 'Margen de Ganancia (%)', Valor: `${kpis.profitMargin.toFixed(2)}%` },
    { KPI: 'Jugadores Activos', Valor: kpis.activePlayers },
    { KPI: 'Jugadores Becados', Valor: kpis.scholarshipPlayers },
    { KPI: 'Costo de Oportunidad Becados', Valor: `$${kpis.scholarshipOpportunityCost.toFixed(2)}` },
    { KPI: 'Ingreso Esperado Mensual', Valor: `$${kpis.expectedMonthlyIncome.toFixed(2)}` },
    { KPI: 'Diferencia Real vs Esperado', Valor: `$${kpis.actualVsExpected.toFixed(2)}` },
    { KPI: 'Diferencia %', Valor: `${kpis.actualVsExpectedPercent.toFixed(2)}%` },
  ];

  exportToExcel(data, filename, 'KPIs');
}

/**
 * Export scholarship impact analysis to Excel
 */
export function exportScholarshipImpactReport(
  analysis: ScholarshipImpactAnalysis,
  filename: string = `Reporte_Impacto_Becados_${new Date().toISOString().split('T')[0]}.xlsx`
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    { Métrica: 'Total Jugadores Becados', Valor: analysis.totalScholarshipPlayers },
    { Métrica: 'Total Jugadores Activos', Valor: analysis.totalActivePlayers },
    { Métrica: '% Becados', Valor: `${analysis.scholarshipPercentage.toFixed(2)}%` },
    { Métrica: 'Costo de Oportunidad Mensual', Valor: `$${analysis.monthlyOpportunityCost.toFixed(2)}` },
    { Métrica: 'Costo de Oportunidad Anual', Valor: `$${analysis.annualOpportunityCost.toFixed(2)}` },
    { Métrica: 'Profit Actual', Valor: `$${analysis.impactOnProfit.currentProfit.toFixed(2)}` },
    { Métrica: 'Profit Sin Becados', Valor: `$${analysis.impactOnProfit.profitWithoutScholarships.toFixed(2)}` },
    { Métrica: 'Impacto en Profit', Valor: `$${analysis.impactOnProfit.scholarshipImpact.toFixed(2)}` },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  // Sheet 2: Players Details
  const playersData = analysis.players.map(p => ({
    'ID': p.id,
    'Nombre': `${p.first_name} ${p.last_name}`,
    'Categoría': p.category || 'Sin categoría',
    'Costo de Oportunidad': `$${p.opportunityCost.toFixed(2)}`,
    'Fecha de Creación': new Date(p.created_at).toLocaleDateString('es-ES'),
  }));
  const playersSheet = XLSX.utils.json_to_sheet(playersData);
  XLSX.utils.book_append_sheet(workbook, playersSheet, 'Jugadores Becados');

  XLSX.writeFile(workbook, filename);
}

/**
 * Export business projection to Excel
 */
export function exportBusinessProjectionReport(
  projection: BusinessProjection,
  filename: string = `Reporte_Proyecciones_${new Date().toISOString().split('T')[0]}.xlsx`
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Current Status
  const currentData = [
    { Métrica: 'Ingresos Actuales', Valor: `$${projection.currentIncome.toFixed(2)}` },
    { Métrica: 'Gastos Actuales', Valor: `$${projection.currentExpenses.toFixed(2)}` },
    { Métrica: 'Profit Actual', Valor: `$${projection.currentProfit.toFixed(2)}` },
  ];
  const currentSheet = XLSX.utils.json_to_sheet(currentData);
  XLSX.utils.book_append_sheet(workbook, currentSheet, 'Estado Actual');

  // Sheet 2: Projections
  const projectionsData = [
    { Escenario: 'Escenario', Ingresos: 'Ingresos', Gastos: 'Gastos', Profit: 'Profit', 'Margen %': 'Margen %' },
    {
      Escenario: 'Optimista',
      Ingresos: `$${projection.projections.optimistic.income.toFixed(2)}`,
      Gastos: `$${projection.projections.optimistic.expenses.toFixed(2)}`,
      Profit: `$${projection.projections.optimistic.profit.toFixed(2)}`,
      'Margen %': `${projection.projections.optimistic.profitMargin.toFixed(2)}%`,
    },
    {
      Escenario: 'Realista',
      Ingresos: `$${projection.projections.realistic.income.toFixed(2)}`,
      Gastos: `$${projection.projections.realistic.expenses.toFixed(2)}`,
      Profit: `$${projection.projections.realistic.profit.toFixed(2)}`,
      'Margen %': `${projection.projections.realistic.profitMargin.toFixed(2)}%`,
    },
    {
      Escenario: 'Pesimista',
      Ingresos: `$${projection.projections.pessimistic.income.toFixed(2)}`,
      Gastos: `$${projection.projections.pessimistic.expenses.toFixed(2)}`,
      Profit: `$${projection.projections.pessimistic.profit.toFixed(2)}`,
      'Margen %': `${projection.projections.pessimistic.profitMargin.toFixed(2)}%`,
    },
  ];
  const projectionsSheet = XLSX.utils.json_to_sheet(projectionsData);
  XLSX.utils.book_append_sheet(workbook, projectionsSheet, 'Proyecciones');

  // Sheet 3: Historical Data
  const historicalData = projection.historicalData.map(h => ({
    'Mes': h.month,
    'Ingresos': `$${h.income.toFixed(2)}`,
    'Gastos': `$${h.expenses.toFixed(2)}`,
    'Profit': `$${h.profit.toFixed(2)}`,
  }));
  const historicalSheet = XLSX.utils.json_to_sheet(historicalData);
  XLSX.utils.book_append_sheet(workbook, historicalSheet, 'Datos Históricos');

  XLSX.writeFile(workbook, filename);
}

/**
 * Export OKRs report to Excel
 */
export function exportOKRsReport(
  okrs: OKRsData,
  filename: string = `Reporte_OKRs_${new Date().toISOString().split('T')[0]}.xlsx`
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Financial OKRs
  const financialData = [
    { Objetivo: 'Objetivo', Meta: 'Meta', Actual: 'Actual', Progreso: 'Progreso %' },
    {
      Objetivo: 'Ingresos',
      Meta: `$${okrs.financial.revenue.target.toFixed(2)}`,
      Actual: `$${okrs.financial.revenue.current.toFixed(2)}`,
      Progreso: `${okrs.financial.revenue.progress.toFixed(2)}%`,
    },
    {
      Objetivo: 'Profit',
      Meta: `$${okrs.financial.profit.target.toFixed(2)}`,
      Actual: `$${okrs.financial.profit.current.toFixed(2)}`,
      Progreso: `${okrs.financial.profit.progress.toFixed(2)}%`,
    },
    {
      Objetivo: 'Margen',
      Meta: `${okrs.financial.margin.target.toFixed(2)}%`,
      Actual: `${okrs.financial.margin.current.toFixed(2)}%`,
      Progreso: `${okrs.financial.margin.progress.toFixed(2)}%`,
    },
  ];
  const financialSheet = XLSX.utils.json_to_sheet(financialData);
  XLSX.utils.book_append_sheet(workbook, financialSheet, 'OKRs Financieros');

  // Sheet 2: Operational OKRs
  const operationalData = [
    { Objetivo: 'Objetivo', Meta: 'Meta', Actual: 'Actual', Progreso: 'Progreso %' },
    {
      Objetivo: 'Jugadores Activos',
      Meta: okrs.operational.activePlayers.target.toFixed(0),
      Actual: okrs.operational.activePlayers.current.toFixed(0),
      Progreso: `${okrs.operational.activePlayers.progress.toFixed(2)}%`,
    },
    {
      Objetivo: 'Retención',
      Meta: `${okrs.operational.retention.target.toFixed(2)}%`,
      Actual: `${okrs.operational.retention.current.toFixed(2)}%`,
      Progreso: `${okrs.operational.retention.progress.toFixed(2)}%`,
    },
  ];
  const operationalSheet = XLSX.utils.json_to_sheet(operationalData);
  XLSX.utils.book_append_sheet(workbook, operationalSheet, 'OKRs Operacionales');

  XLSX.writeFile(workbook, filename);
}

