'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, DollarSign, Users, CheckCircle, AlertCircle, Play, RefreshCw, Link as LinkIcon, ExternalLink, Copy, Check } from 'lucide-react';
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
  const [paymentLinkBaseUrl, setPaymentLinkBaseUrl] = useState<string>('');
  const [savingLink, setSavingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

      // Get payment link base URL setting
      const { data: linkSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_link_base_url')
        .single();

      const baseUrl = linkSetting?.value || process.env.NEXT_PUBLIC_APP_URL || 
                     process.env.NEXT_PUBLIC_SITE_URL ||
                     'https://sistema-adademia-de-futbol-tura.vercel.app';
      setPaymentLinkBaseUrl(baseUrl);
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

  const handleSavePaymentLink = async () => {
    setSavingLink(true);
    try {
      const supabase = createClient();
      
      // Check if setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'payment_link_base_url')
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('settings')
          .update({ 
            value: paymentLinkBaseUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('settings')
          .insert({
            key: 'payment_link_base_url',
            value: paymentLinkBaseUrl,
            description: 'URL base para el link de pago público'
          });
        
        if (error) throw error;
      }

      setMessage({
        type: 'success',
        text: '✅ URL del link de pago guardada exitosamente',
      });
      router.refresh();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Error al guardar: ${error.message}`,
      });
    } finally {
      setSavingLink(false);
    }
  };

  const getPreviewLink = (cedula: string = '8-1234-5678') => {
    const baseUrl = paymentLinkBaseUrl.trim() || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL ||
                   'https://sistema-adademia-de-futbol-tura.vercel.app';
    return `${baseUrl}/pay?cedula=${encodeURIComponent(cedula)}`;
  };

  const copyPreviewLink = async (cedula: string = '8-1234-5678') => {
    const link = getPreviewLink(cedula);
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
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

      {/* Payment Link Management */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-l-4 border-indigo-500">
        <div className="flex items-center gap-3 mb-4">
          <LinkIcon className="h-6 w-6 text-indigo-600" />
          <h3 className="text-xl font-bold text-gray-900">Gestión de Link de Pago</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Base del Portal de Pago
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={paymentLinkBaseUrl}
                onChange={(e) => setPaymentLinkBaseUrl(e.target.value)}
                placeholder="https://sistema-adademia-de-futbol-tura.vercel.app"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleSavePaymentLink}
                disabled={savingLink}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingLink ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Guardar
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Esta URL se usará para generar los links de pago en los correos de recordatorio.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Vista Previa del Link</h4>
              <button
                onClick={() => copyPreviewLink()}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-sm font-mono text-gray-800 break-all">
                {getPreviewLink()}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Este es un ejemplo del link que se enviará en los correos. El parámetro <code className="bg-gray-100 px-1 rounded">cedula</code> se reemplazará con la cédula del tutor.
            </p>
          </div>

          {/* Test Link */}
          <div className="flex items-center gap-2">
            <a
              href={getPreviewLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Probar Link en Nueva Pestaña
            </a>
          </div>
        </div>
      </div>

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

