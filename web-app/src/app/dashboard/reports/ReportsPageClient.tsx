'use client';

import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import type { 
  FinancialKPIs, 
  ScholarshipImpactAnalysis as ScholarshipAnalysis, 
  BusinessProjection as BusinessProjectionType, 
  OKRsData 
} from '@/lib/actions/reports';

interface ReportsPageClientProps {
  kpis: FinancialKPIs;
  scholarshipAnalysis: ScholarshipAnalysis;
  businessProjection: BusinessProjectionType;
  okrs: OKRsData;
}

export function ReportsPageClient({
  kpis,
  scholarshipAnalysis,
  businessProjection,
  okrs,
}: ReportsPageClientProps) {
  const handleExportReport = (type: string, period?: string, year?: number) => {
    const params = new URLSearchParams({
      type,
      ...(period && { period }),
      ...(year && { year: String(year) }),
    });
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-6">
      <ReportsDashboard
        kpis={kpis}
        scholarshipAnalysis={scholarshipAnalysis}
        businessProjection={businessProjection}
        okrs={okrs}
        onExportReport={handleExportReport}
      />
    </div>
  );
}

