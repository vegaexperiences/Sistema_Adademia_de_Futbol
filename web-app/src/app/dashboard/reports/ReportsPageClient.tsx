'use client';

import { useState, useEffect } from 'react';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import type { 
  FinancialKPIs, 
  ScholarshipImpactAnalysis as ScholarshipAnalysis, 
  BusinessProjection as BusinessProjectionType, 
  OKRsData 
} from '@/lib/actions/reports';

interface ReportsPageClientProps {
  initialKpis: FinancialKPIs;
  startDate: string;
  endDate: string;
}

export function ReportsPageClient({
  initialKpis,
  startDate,
  endDate,
}: ReportsPageClientProps) {
  const [kpis, setKpis] = useState<FinancialKPIs>(initialKpis);
  const [scholarshipAnalysis, setScholarshipAnalysis] = useState<ScholarshipAnalysis | null>(null);
  const [businessProjection, setBusinessProjection] = useState<BusinessProjectionType | null>(null);
  const [okrs, setOkrs] = useState<OKRsData | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    scholarship: false,
    projection: false,
    okrs: false,
  });

  const handleExportReport = async (type: string, period?: string, year?: number): Promise<void> => {
    const params = new URLSearchParams({
      type,
      ...(period && { period }),
      ...(year && { year: String(year) }),
    });
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  const loadScholarshipAnalysis = async () => {
    if (scholarshipAnalysis || loadingStates.scholarship) return;
    
    setLoadingStates(prev => ({ ...prev, scholarship: true }));
    try {
      const response = await fetch(`/api/reports/scholarship?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      setScholarshipAnalysis(data);
    } catch (error) {
      console.error('Error loading scholarship analysis:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, scholarship: false }));
    }
  };

  const loadBusinessProjection = async () => {
    if (businessProjection || loadingStates.projection) return;
    
    setLoadingStates(prev => ({ ...prev, projection: true }));
    try {
      const response = await fetch('/api/reports/projection?months=12');
      const data = await response.json();
      setBusinessProjection(data);
    } catch (error) {
      console.error('Error loading business projection:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, projection: false }));
    }
  };

  const loadOKRs = async (period: 'monthly' | 'quarterly' | 'annual' = 'monthly') => {
    if (okrs || loadingStates.okrs) return;
    
    setLoadingStates(prev => ({ ...prev, okrs: true }));
    try {
      const response = await fetch(`/api/reports/okrs?period=${period}`);
      const data = await response.json();
      setOkrs(data);
    } catch (error) {
      console.error('Error loading OKRs:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, okrs: false }));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-6">
      <ReportsDashboard
        kpis={kpis}
        scholarshipAnalysis={scholarshipAnalysis}
        businessProjection={businessProjection}
        okrs={okrs}
        loadingStates={loadingStates}
        onExportReport={handleExportReport}
        onLoadScholarship={loadScholarshipAnalysis}
        onLoadProjection={loadBusinessProjection}
        onLoadOKRs={loadOKRs}
      />
    </div>
  );
}

