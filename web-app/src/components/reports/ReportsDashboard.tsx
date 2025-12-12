'use client';

import { useState } from 'react';
import { BarChart3, FileText, GraduationCap, TrendingUp, Target, Download } from 'lucide-react';
import { KPICards } from './KPICards';
import { ScholarshipImpactAnalysis } from './ScholarshipImpactAnalysis';
import { BusinessProjection } from './BusinessProjection';
import { FinancialReportsList } from './FinancialReportsList';
import { OKRsDashboard } from './OKRsDashboard';
import type { FinancialKPIs, ScholarshipImpactAnalysis as ScholarshipAnalysis, BusinessProjection as BusinessProjectionType, OKRsData } from '@/lib/actions/reports';

interface ReportsDashboardProps {
  kpis: FinancialKPIs;
  scholarshipAnalysis: ScholarshipAnalysis;
  businessProjection: BusinessProjectionType;
  okrs: OKRsData;
  onExportReport: (type: string, period?: string, year?: number) => Promise<void>;
}

type Tab = 'kpis' | 'reports' | 'scholarship' | 'projections' | 'okrs';

export function ReportsDashboard({
  kpis,
  scholarshipAnalysis,
  businessProjection,
  okrs,
  onExportReport,
}: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('kpis');

  const tabs = [
    { id: 'kpis' as Tab, label: 'KPIs', icon: BarChart3 },
    { id: 'reports' as Tab, label: 'Reportes', icon: FileText },
    { id: 'scholarship' as Tab, label: 'Análisis de Becados', icon: GraduationCap },
    { id: 'projections' as Tab, label: 'Proyecciones', icon: TrendingUp },
    { id: 'okrs' as Tab, label: 'OKRs', icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="glass-card p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'kpis' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Métricas Clave (KPIs)</h2>
              <p className="text-gray-600">
                Indicadores financieros y operacionales en tiempo real
              </p>
            </div>
            <KPICards kpis={kpis} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reportes Financieros</h2>
              <p className="text-gray-600">
                Descarga reportes detallados en formato Excel
              </p>
            </div>
            <FinancialReportsList onExportReport={onExportReport} />
          </div>
        )}

        {activeTab === 'scholarship' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis de Impacto de Becados</h2>
              <p className="text-gray-600">
                Análisis detallado del impacto financiero de jugadores becados en el negocio
              </p>
            </div>
            <ScholarshipImpactAnalysis analysis={scholarshipAnalysis} />
          </div>
        )}

        {activeTab === 'projections' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Proyecciones de Negocio</h2>
              <p className="text-gray-600">
                Proyecciones financieras basadas en tendencias históricas
              </p>
            </div>
            <BusinessProjection projection={businessProjection} />
          </div>
        )}

        {activeTab === 'okrs' && (
          <div className="space-y-6">
            <OKRsDashboard okrs={okrs} />
          </div>
        )}
      </div>
    </div>
  );
}

