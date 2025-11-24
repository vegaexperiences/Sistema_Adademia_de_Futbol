import { DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react';

export default function FinancePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}>
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            💰 Finanzas
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Control de pagos y finanzas de la academia
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Ingresos del Mes</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">$0.00</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              color: '#065f46'
            }}>
              📈 En desarrollo
            </span>
          </div>
        </div>

        <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}>
              <CreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Pagos Pendientes</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              color: '#1e3a8a'
            }}>
              💳 Próximamente
            </span>
          </div>
        </div>

        <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            }}>
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Vencimientos Hoy</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{
              background: 'linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)',
              color: '#92400e'
            }}>
              📅 En desarrollo
            </span>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="glass-card p-12 text-center">
        <div className="p-4 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          <DollarSign className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Módulo de Finanzas
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          El sistema de gestión de pagos, facturas y reportes financieros estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
