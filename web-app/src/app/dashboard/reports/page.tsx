import { ReportsPageClient } from './ReportsPageClient';
import {
  getFinancialKPIs,
  getScholarshipImpactAnalysis,
  getBusinessProjection,
  getOKRsData,
} from '@/lib/actions/reports';

export default async function ReportsPage() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Current month dates
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

  // Fetch all data in parallel
  const [kpis, scholarshipAnalysis, businessProjection, okrs] = await Promise.all([
    getFinancialKPIs(startOfMonth, endOfMonth),
    getScholarshipImpactAnalysis(startOfMonth, endOfMonth),
    getBusinessProjection(12),
    getOKRsData('monthly'),
  ]);

  return (
    <ReportsPageClient
      kpis={kpis}
      scholarshipAnalysis={scholarshipAnalysis}
      businessProjection={businessProjection}
      okrs={okrs}
    />
  );
}
