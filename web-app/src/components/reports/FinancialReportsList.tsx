'use client';

import { useState } from 'react';
import { Download, FileText, BarChart3, Users, TrendingUp, GraduationCap, Calendar } from 'lucide-react';

interface FinancialReportsListProps {
  onExportReport: (type: string, period?: string, year?: number) => Promise<void>;
}

export function FinancialReportsList({ onExportReport }: FinancialReportsListProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const handleExport = async (type: string, period?: string, year?: number) => {
    setExporting(type);
    try {
      await onExportReport(type, period, year);
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setExporting(null);
    }
  };

  const reports = [
    {
      id: 'financial-monthly',
      title: 'Reporte Financiero Mensual',
      description: 'Ingresos, gastos y profit del mes actual',
      icon: FileText,
      color: 'bg-blue-500',
      action: () => handleExport('financial', 'monthly', selectedYear),
    },
    {
      id: 'financial-quarterly',
      title: 'Reporte Financiero Trimestral',
      description: 'Análisis financiero del trimestre',
      icon: BarChart3,
      color: 'bg-green-500',
      action: () => handleExport('financial', 'quarterly', selectedYear),
    },
    {
      id: 'financial-annual',
      title: 'Reporte Financiero Anual',
      description: 'Resumen financiero completo del año',
      icon: TrendingUp,
      color: 'bg-purple-500',
      action: () => handleExport('financial', 'annual', selectedYear),
    },
    {
      id: 'players',
      title: 'Reporte de Jugadores',
      description: 'Lista completa de jugadores activos, becados y pendientes',
      icon: Users,
      color: 'bg-orange-500',
      action: () => handleExport('players'),
    },
    {
      id: 'income-vs-expenses',
      title: 'Reporte Ingresos vs Gastos',
      description: 'Comparación mensual de ingresos y gastos',
      icon: BarChart3,
      color: 'bg-indigo-500',
      action: () => handleExport('income-vs-expenses', selectedPeriod, selectedYear),
    },
    {
      id: 'scholarship-impact',
      title: 'Reporte de Impacto de Becados',
      description: 'Análisis detallado del impacto de jugadores becados',
      icon: GraduationCap,
      color: 'bg-pink-500',
      action: () => handleExport('scholarship-impact', selectedPeriod, selectedYear),
    },
    {
      id: 'projections',
      title: 'Reporte de Proyecciones',
      description: 'Proyecciones de negocio a 12 meses',
      icon: TrendingUp,
      color: 'bg-teal-500',
      action: () => handleExport('projections'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Filtros de Reportes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'monthly' | 'quarterly' | 'annual')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annual">Anual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          const isExporting = exporting === report.id;
          
          return (
            <div
              key={report.id}
              className="glass-card p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl ${report.color} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">
                    {report.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {report.description}
                  </p>
                </div>
              </div>
              <button
                onClick={report.action}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Descargar Excel</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

