'use client';

import { DollarSign, TrendingUp, TrendingDown, Users, GraduationCap, AlertCircle } from 'lucide-react';
import type { FinancialKPIs } from '@/lib/actions/reports';

interface KPICardsProps {
  kpis: FinancialKPIs;
  isLoading?: boolean;
}

export function KPICards({ kpis, isLoading = false }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const cards = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(kpis.totalIncome),
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      bgColor: '#d1fae5',
    },
    {
      title: 'Gastos Totales',
      value: formatCurrency(kpis.totalExpenses),
      icon: TrendingDown,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgColor: '#fee2e2',
    },
    {
      title: 'Profit',
      value: formatCurrency(kpis.profit),
      icon: TrendingUp,
      gradient: kpis.profit >= 0 
        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgColor: kpis.profit >= 0 ? '#dbeafe' : '#fee2e2',
      subtitle: kpis.profit >= 0 ? 'Ganancia' : 'Pérdida',
    },
    {
      title: 'Margen de Ganancia',
      value: formatPercent(kpis.profitMargin),
      icon: TrendingUp,
      gradient: kpis.profitMargin >= 20
        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        : kpis.profitMargin >= 10
        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgColor: kpis.profitMargin >= 20 ? '#d1fae5' : kpis.profitMargin >= 10 ? '#fef3c7' : '#fee2e2',
    },
    {
      title: 'Jugadores Activos',
      value: kpis.activePlayers.toString(),
      icon: Users,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      bgColor: '#ede9fe',
    },
    {
      title: 'Jugadores Becados',
      value: kpis.scholarshipPlayers.toString(),
      icon: GraduationCap,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      bgColor: '#dbeafe',
    },
    {
      title: 'Costo de Oportunidad Becados',
      value: formatCurrency(kpis.scholarshipOpportunityCost),
      icon: AlertCircle,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      bgColor: '#fef3c7',
      subtitle: 'Mensual',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="glass-card p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: card.gradient }}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              {card.subtitle && (
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  {card.subtitle}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        );
      })}
      
      {/* Additional metrics card */}
      <div className="glass-card p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          }}>
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-1">Ingreso Esperado</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(kpis.expectedMonthlyIncome)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Diferencia: {formatCurrency(kpis.actualVsExpected)} ({formatPercent(kpis.actualVsExpectedPercent)})
          </p>
        </div>
      </div>
    </div>
  );
}

