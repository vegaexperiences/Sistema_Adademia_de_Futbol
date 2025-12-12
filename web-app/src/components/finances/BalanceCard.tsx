import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import type { Balance } from '@/lib/actions/transactions';

interface BalanceCardProps {
  balance: Balance;
  title?: string;
  periodLabel?: string;
}

export function BalanceCard({ balance, title = 'Balance', periodLabel }: BalanceCardProps) {
  const isPositive = balance.netBalance >= 0;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {periodLabel && (
          <span className="text-sm text-gray-600">{periodLabel}</span>
        )}
      </div>

      <div className="space-y-4">
        {/* Total Income */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Ingresos</span>
          </div>
          <span className="text-lg font-bold text-green-600">
            {formatCurrency(balance.totalIncome)}
          </span>
        </div>

        {/* Total Expenses */}
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-gray-700">Gastos</span>
          </div>
          <span className="text-lg font-bold text-red-600">
            {formatCurrency(balance.totalExpenses)}
          </span>
        </div>

        {/* Net Balance */}
        <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
          isPositive 
            ? 'bg-green-100 border-green-500' 
            : 'bg-red-100 border-red-500'
        }`}>
          <div className="flex items-center gap-2">
            <DollarSign className={`h-6 w-6 ${isPositive ? 'text-green-700' : 'text-red-700'}`} />
            <span className="text-base font-bold text-gray-900">Balance Neto</span>
          </div>
          <span className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(balance.netBalance)}
          </span>
        </div>
      </div>

      {/* Period Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Período: {new Date(balance.period.start).toLocaleDateString('es-PA')} - {new Date(balance.period.end).toLocaleDateString('es-PA')}
        </p>
      </div>
    </div>
  );
}

