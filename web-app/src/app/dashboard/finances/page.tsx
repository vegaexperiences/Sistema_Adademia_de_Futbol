import { getFinancialSummary, getMonthlyIncomeVsExpense, getExpensesByCategory } from '@/lib/actions/financial-reports';
import { getActiveStaff } from '@/lib/actions/staff';
import { Plus, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';
import Link from 'next/link';
import IncomeVsExpenseChart from '@/components/finances/IncomeVsExpenseChart';
import ExpensePieChart from '@/components/finances/ExpensePieChart';
import { PagueloFacilSuccessHandler } from '@/components/payments/PagueloFacilSuccessHandler';

export default async function FinancesPage() {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;
  
  // Execute all queries in parallel for better performance
  const [summary, monthlyData, expensesByCategory, activeStaff] = await Promise.all([
    getFinancialSummary(),
    getMonthlyIncomeVsExpense(currentYear),
    getExpensesByCategory(startOfYear, endOfYear),
    getActiveStaff()
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-6">
      <PagueloFacilSuccessHandler />
      {/* Header */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              💰 Gestión Financiera
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Panel de control financiero y reportes
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              href="/dashboard/finances/staff"
              className="px-4 py-2.5 min-h-[44px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-sm sm:text-base"
            >
              <Users size={18} className="sm:w-5 sm:h-5" />
              <span>Personal</span>
            </Link>
            <Link
              href="/dashboard/finances/expenses"
              className="px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-sm sm:text-base"
            >
              <Plus size={18} className="sm:w-5 sm:h-5" />
              <span>Nuevo Gasto</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Income */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Ingresos del Mes</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                ${summary.current_month.income.toFixed(2)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <TrendingUp className="text-green-600 sm:w-6 sm:h-6" size={20} />
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Gastos del Mes</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                ${summary.current_month.expenses.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ganancia Neta</p>
              <p className={`text-2xl font-bold ${summary.current_month.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${Math.abs(summary.current_month.net).toFixed(2)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${summary.current_month.net >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <DollarSign className={summary.current_month.net >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
            </div>
          </div>
        </div>

        {/* Active Staff */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Personal Activo</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeStaff.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Chart */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            📊 Ingresos vs Egresos {currentYear}
          </h2>
          <IncomeVsExpenseChart data={monthlyData} />
        </div>

        {/* Expense Breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            📈 Distribución de Gastos
          </h2>
          <ExpensePieChart data={expensesByCategory} />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📋 Transacciones Recientes
          </h2>
          <Link 
            href="/dashboard/finances/transactions"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Historial de gastos operativos y pagos de nómina
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/dashboard/finances/expenses/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Registrar Gasto
            </Link>
            <Link
              href="/dashboard/finances/staff"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              Pagar Nómina
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/dashboard/finances/expenses/new"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">💸</div>
            <div className="text-sm font-medium">Agregar Gasto</div>
          </Link>
          <Link
            href="/dashboard/finances/staff"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Gestionar Personal</div>
          </Link>
          <Link
            href="/dashboard/finances/expenses"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Config. Gastos</div>
          </Link>
          <Link
            href="/dashboard/finances#transactions"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Ver Transacciones</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
