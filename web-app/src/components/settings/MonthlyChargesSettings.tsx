'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, DollarSign, Users, CheckCircle, AlertCircle, Play, RefreshCw } from 'lucide-react';
import { generateMonthlyCharges } from '@/lib/actions/monthly-charges';
import { isSeasonActive } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/client';

export function MonthlyChargesSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [seasonDates, setSeasonDates] = useState<{ start: string; end: string } | null>(null);
  const [seasonActive, setSeasonActive] = useState<boolean | null>(null);
  const [activePlayersCount, setActivePlayersCount] = useState<number>(0);
  const [lastChargesMonth, setLastChargesMonth] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get season dates
      const { data: settings } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['season_start_date', 'season_end_date']);

      const settingsMap = settings?.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {}) || {};

      const startDate = settingsMap['season_start_date'] || '';
      const endDate = settingsMap['season_end_date'] || '';
      setSeasonDates({ start: startDate, end: endDate });

      // Check if season is active
      const today = new Date();
      const active = await isSeasonActive(today);
      setSeasonActive(active);

      // Get active players count
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      setActivePlayersCount(count || 0);

      // Get last month with charges
      const { data: lastCharge } = await supabase
        .from('payments')
        .select('month_year')
        .eq('type', 'charge')
        .order('month_year', { ascending: false })
        .limit(1)
        .single();

      setLastChargesMonth(lastCharge?.month_year || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCharges = async () => {
    if (!seasonActive) {
      setMessage({
        type: 'error',
        text: 'La temporada no está activa. Verifica las fechas de temporada en la sección de Temporada.',
      });
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
      const result = await generateMonthlyCharges(undefined, false);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✅ Cargos generados exitosamente: ${result.generated} cargos creados, ${result.skipped} omitidos.`,
        });
        await loadData();
        router.refresh();
      } else {
        setMessage({
          type: 'error',
          text: `❌ Error: ${result.errors.join(', ')}`,
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Error al generar cargos: ${error.message}`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const formatMonthYear = (monthYear: string | null) => {
    if (!monthYear) return 'N/A';
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-PA', { year: 'numeric', month: 'long' });
  };

  const getCurrentMonthYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season Status */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-l-4 border-blue-500">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Estado de Temporada</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {seasonActive ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Temporada Activa</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">Temporada Inactiva</span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-semibold">Inicio:</span>{' '}
              {seasonDates?.start ? new Date(seasonDates.start).toLocaleDateString('es-PA') : 'Sin restricción'}
            </p>
            <p>
              <span className="font-semibold">Fin:</span>{' '}
              {seasonDates?.end ? new Date(seasonDates.end).toLocaleDateString('es-PA') : 'Sin restricción'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Jugadores Activos</p>
              <p className="text-2xl font-bold text-green-700">{activePlayersCount}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Último Mes con Cargos</p>
              <p className="text-lg font-bold text-purple-700">
                {formatMonthYear(lastChargesMonth)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Generate Charges */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-l-4 border-amber-500">
        <div className="flex items-center gap-3 mb-4">
          <Play className="h-6 w-6 text-amber-600" />
          <h3 className="text-xl font-bold text-gray-900">Generar Cargos Mensuales</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Genera los cargos mensuales para todos los jugadores activos del mes actual (
            <strong>{formatMonthYear(getCurrentMonthYear())}</strong>). Los cargos solo se generarán si la temporada está activa.
          </p>

          {!seasonActive && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ La temporada no está activa. Configura las fechas de temporada antes de generar cargos.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerateCharges}
            disabled={generating || !seasonActive}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
            }}
          >
            {generating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Generar Cargos del Mes Actual
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border-l-4 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          }`}
        >
          <p className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
        <p className="text-sm text-gray-700">
          <span className="font-bold">💡 Nota:</span> Los cargos mensuales se generan automáticamente según la configuración de temporada. 
          Solo se generan para jugadores activos (no becados) y respetan las fechas de inicio y fin de temporada configuradas.
        </p>
      </div>
    </div>
  );
}

