import { FileText, BarChart3, PieChart, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl icon-bg-blue">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            📊 Reportes
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Análisis y reportes de la academia
        </p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="p-4 rounded-xl mb-4 mx-auto w-fit icon-bg-green">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Reporte de Jugadores
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Estadísticas de jugadores activos, becados y pendientes
          </p>
        </div>

        <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="p-4 rounded-xl mb-4 mx-auto w-fit icon-bg-orange">
            <PieChart className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Reporte Financiero
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Análisis de ingresos, pagos y morosidad
          </p>
        </div>

        <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="p-4 rounded-xl mb-4 mx-auto w-fit icon-bg-purple">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Reporte de Crecimiento
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Tendencias y proyecciones de crecimiento
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="glass-card p-12 text-center">
        <div className="p-4 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4" style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        }}>
          <FileText className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Sistema de Reportes
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Los reportes detallados y análisis estadísticos estarán disponibles próximamente.
        </p>
      </div>
    </div>
  );
}
