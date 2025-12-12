import { ReportsPageClient } from './ReportsPageClient';
import { getFinancialKPIs } from '@/lib/actions/reports';
import { Suspense } from 'react';

export default async function ReportsPage() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Current month dates
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

  // Only load KPIs initially - other data will be loaded on demand
  const kpis = await getFinancialKPIs(startOfMonth, endOfMonth);

  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <ReportsPageClient
        initialKpis={kpis}
        startDate={startOfMonth}
        endDate={endOfMonth}
      />
    </Suspense>
  );
}
