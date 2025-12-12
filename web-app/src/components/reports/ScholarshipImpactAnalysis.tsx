'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { GraduationCap, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import type { ScholarshipImpactAnalysis } from '@/lib/actions/reports';

interface ScholarshipImpactAnalysisProps {
  analysis: ScholarshipImpactAnalysis;
  isLoading?: boolean;
}

export function ScholarshipImpactAnalysis({ analysis, isLoading = false }: ScholarshipImpactAnalysisProps) {
  const [showAllPlayers, setShowAllPlayers] = useState(false);

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
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Data for bar chart: Expected vs Actual income
  const incomeComparisonData = [
    {
      name: 'Ingreso Real',
      value: analysis.impactOnProfit.currentProfit + analysis.monthlyOpportunityCost,
    },
    {
      name: 'Ingreso Esperado',
      value: analysis.impactOnProfit.currentProfit + analysis.monthlyOpportunityCost + analysis.monthlyOpportunityCost,
    },
    {
      name: 'Diferencia (Becados)',
      value: analysis.monthlyOpportunityCost,
    },
  ];

  // Data for pie chart: Players distribution
  const playersDistributionData = [
    { name: 'Activos', value: analysis.totalActivePlayers, color: '#10b981' },
    { name: 'Becados', value: analysis.totalScholarshipPlayers, color: '#3b82f6' },
  ];

  // Top players by opportunity cost
  const topPlayers = [...analysis.players]
    .sort((a, b) => b.opportunityCost - a.opportunityCost)
    .slice(0, showAllPlayers ? analysis.players.length : 10);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}>
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Total Becados</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.totalScholarshipPlayers}</p>
              <p className="text-xs text-gray-500">
                {analysis.scholarshipPercentage.toFixed(1)}% del total
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            }}>
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Costo Oportunidad Mensual</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.monthlyOpportunityCost)}
              </p>
              <p className="text-xs text-gray-500">
                Anual: {formatCurrency(analysis.annualOpportunityCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: analysis.impactOnProfit.scholarshipImpact >= 0
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Impacto en Profit</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.impactOnProfit.scholarshipImpact)}
              </p>
              <p className="text-xs text-gray-500">
                Profit actual: {formatCurrency(analysis.impactOnProfit.currentProfit)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            }}>
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Profit Sin Becados</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.impactOnProfit.profitWithoutScholarships)}
              </p>
              <p className="text-xs text-gray-500">
                Proyección teórica
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Income Comparison */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Comparación de Ingresos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="Monto" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart: Players Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Distribución de Jugadores
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={playersDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {playersDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Players Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Jugadores Becados ({analysis.players.length})
          </h3>
          {analysis.players.length > 10 && (
            <button
              onClick={() => setShowAllPlayers(!showAllPlayers)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              {showAllPlayers ? 'Mostrar menos' : 'Mostrar todos'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Categoría</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Costo de Oportunidad</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.map((player) => (
                <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {player.first_name} {player.last_name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {player.category || 'Sin categoría'}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(player.opportunityCost)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(player.created_at).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {analysis.players.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay jugadores becados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

