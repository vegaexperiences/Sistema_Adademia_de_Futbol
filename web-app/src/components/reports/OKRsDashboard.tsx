'use client';

import { Target, TrendingUp, Users, DollarSign } from 'lucide-react';
import type { OKRsData } from '@/lib/actions/reports';

interface OKRsDashboardProps {
  okrs: OKRsData;
  isLoading?: boolean;
}

export function OKRsDashboard({ okrs, isLoading = false }: OKRsDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6 animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#10b981';
    if (progress >= 75) return '#3b82f6';
    if (progress >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const financialOKRs = [
    {
      title: 'Ingresos',
      target: formatCurrency(okrs.financial.revenue.target),
      current: formatCurrency(okrs.financial.revenue.current),
      progress: okrs.financial.revenue.progress,
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      title: 'Profit',
      target: formatCurrency(okrs.financial.profit.target),
      current: formatCurrency(okrs.financial.profit.current),
      progress: okrs.financial.profit.progress,
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    },
    {
      title: 'Margen de Ganancia',
      target: formatPercent(okrs.financial.margin.target),
      current: formatPercent(okrs.financial.margin.current),
      progress: okrs.financial.margin.progress,
      icon: Target,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    },
  ];

  const operationalOKRs = [
    {
      title: 'Jugadores Activos',
      target: okrs.operational.activePlayers.target.toFixed(0),
      current: okrs.operational.activePlayers.current.toFixed(0),
      progress: okrs.operational.activePlayers.progress,
      icon: Users,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    },
    {
      title: 'Retención',
      target: formatPercent(okrs.operational.retention.target),
      current: formatPercent(okrs.operational.retention.current),
      progress: okrs.operational.retention.progress,
      icon: Target,
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Period Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          }}>
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Objetivos y Resultados Clave (OKRs)</h3>
            <p className="text-sm text-gray-600">
              Período: {okrs.period === 'monthly' ? 'Mensual' : okrs.period === 'quarterly' ? 'Trimestral' : 'Anual'}
            </p>
          </div>
        </div>
      </div>

      {/* Financial OKRs */}
      <div>
        <h4 className="text-lg font-bold text-gray-900 mb-4">OKRs Financieros</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {financialOKRs.map((okr, index) => {
            const Icon = okr.icon;
            const progressColor = getProgressColor(okr.progress);
            
            return (
              <div key={index} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: okr.gradient }}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-600">{okr.title}</h5>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Actual</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {formatPercent(okr.progress)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(okr.progress, 100)}%`,
                          backgroundColor: progressColor,
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Actual</span>
                      <span className="text-xs text-gray-500">Meta</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">{okr.current}</span>
                      <span className="text-sm font-semibold text-gray-600">{okr.target}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational OKRs */}
      <div>
        <h4 className="text-lg font-bold text-gray-900 mb-4">OKRs Operacionales</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operationalOKRs.map((okr, index) => {
            const Icon = okr.icon;
            const progressColor = getProgressColor(okr.progress);
            
            return (
              <div key={index} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: okr.gradient }}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-600">{okr.title}</h5>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Actual</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {formatPercent(okr.progress)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(okr.progress, 100)}%`,
                          backgroundColor: progressColor,
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Actual</span>
                      <span className="text-xs text-gray-500">Meta</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">{okr.current}</span>
                      <span className="text-sm font-semibold text-gray-600">{okr.target}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

