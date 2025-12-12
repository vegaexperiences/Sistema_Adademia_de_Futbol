'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { BusinessProjection } from '@/lib/actions/reports';

interface BusinessProjectionProps {
  projection: BusinessProjection;
  isLoading?: boolean;
}

export function BusinessProjection({ projection, isLoading = false }: BusinessProjectionProps) {
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

  // Generate projection data for chart
  const generateProjectionData = () => {
    const data = [...projection.historicalData];
    
    // Add current month
    const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    data.push({
      month: currentMonth,
      income: projection.currentIncome,
      expenses: projection.currentExpenses,
      profit: projection.currentProfit,
    });

    // Add projections for next N months
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentDate = new Date();
    
    for (let i = 1; i <= projection.months; i++) {
      const futureDate = new Date(currentDate);
      futureDate.setMonth(currentDate.getMonth() + i);
      const monthName = months[futureDate.getMonth()];
      const year = futureDate.getFullYear();
      
      // Calculate projections based on scenarios
      const monthIndex = i;
      const realisticIncome = projection.currentIncome * Math.pow(1 + (projection.projections.realistic.income / projection.currentIncome - 1) / projection.months, monthIndex);
      const realisticExpenses = projection.currentExpenses * Math.pow(1 + (projection.projections.realistic.expenses / projection.currentExpenses - 1) / projection.months, monthIndex);
      
      data.push({
        month: `${monthName} ${year}`,
        income: realisticIncome,
        expenses: realisticExpenses,
        profit: realisticIncome - realisticExpenses,
      });
    }

    return data;
  };

  const chartData = generateProjectionData();

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Ingresos Actuales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(projection.currentIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}>
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Gastos Actuales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(projection.currentExpenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: projection.currentProfit >= 0
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Profit Actual</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(projection.currentProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Projections Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Proyección de Negocio ({projection.months} meses)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval="preserveStartEnd"
            />
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
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Ingresos"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Gastos"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Profit"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Optimistic */}
        <div className="glass-card p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Escenario Optimista</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Ingresos</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(projection.projections.optimistic.income)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gastos</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(projection.projections.optimistic.expenses)}
              </p>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">Profit</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(projection.projections.optimistic.profit)}
              </p>
              <p className="text-xs text-gray-500">
                Margen: {projection.projections.optimistic.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Realistic */}
        <div className="glass-card p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Escenario Realista</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Ingresos</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(projection.projections.realistic.income)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gastos</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(projection.projections.realistic.expenses)}
              </p>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">Profit</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(projection.projections.realistic.profit)}
              </p>
              <p className="text-xs text-gray-500">
                Margen: {projection.projections.realistic.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Pessimistic */}
        <div className="glass-card p-6 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Escenario Pesimista</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Ingresos</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(projection.projections.pessimistic.income)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gastos</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(projection.projections.pessimistic.expenses)}
              </p>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">Profit</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(projection.projections.pessimistic.profit)}
              </p>
              <p className="text-xs text-gray-500">
                Margen: {projection.projections.pessimistic.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

