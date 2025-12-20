'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Percent, Calendar, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { getLateFeeConfig, updateLateFeeConfig, applyLateFeesToOverdueCharges } from '@/lib/actions/late-fees';
import { createClient } from '@/lib/supabase/client';

export function LateFeesSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    type: 'percentage' as 'percentage' | 'fixed',
    value: 5,
    graceDays: 5,
    paymentDeadlineDay: 1,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewAmount, setPreviewAmount] = useState<number>(0);
  const [previewCharge, setPreviewCharge] = useState<number>(130);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    // Calculate preview when config changes
    if (config.enabled) {
      const lateFee = config.type === 'percentage'
        ? previewCharge * (config.value / 100)
        : config.value;
      setPreviewAmount(lateFee);
    } else {
      setPreviewAmount(0);
    }
  }, [config, previewCharge]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const loadedConfig = await getLateFeeConfig();
      setConfig(loadedConfig);

      // Get payment deadline day from settings
      const supabase = createClient();
      const { data: paymentDaySetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'statement_payment_day')
        .single();

      if (paymentDaySetting) {
        setConfig(prev => ({
          ...prev,
          paymentDeadlineDay: parseInt(paymentDaySetting.value) || 1,
        }));
      }
    } catch (error) {
      console.error('Error loading late fee config:', error);
      setMessage({ type: 'error', text: 'Error al cargar configuración de recargos' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Validate inputs
      if (config.enabled) {
        if (config.value <= 0) {
          setMessage({ type: 'error', text: 'El valor del recargo debe ser mayor a 0' });
          setSaving(false);
          return;
        }
        if (config.graceDays < 0) {
          setMessage({ type: 'error', text: 'Los días de gracia no pueden ser negativos' });
          setSaving(false);
          return;
        }
      }

      const result = await updateLateFeeConfig(config);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Configuración de recargos guardada exitosamente' });
        setTimeout(() => {
          router.refresh();
        }, 1500);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyLateFees = async () => {
    if (!config.enabled) {
      setMessage({ type: 'error', text: 'Los recargos deben estar habilitados para aplicarlos' });
      return;
    }

    if (!confirm('¿Está seguro de aplicar recargos a todos los cargos vencidos? Esta acción no se puede deshacer.')) {
      return;
    }

    setApplying(true);
    setMessage(null);

    try {
      const result = await applyLateFeesToOverdueCharges(undefined, false);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Recargos aplicados exitosamente. ${result.applied} recargo(s) aplicado(s).`,
        });
        if (result.errors.length > 0) {
          console.warn('Some errors occurred:', result.errors);
        }
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: `Error al aplicar recargos: ${result.errors.join(', ')}`,
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al aplicar recargos' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-6 w-6 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-900">Recargos por Pagos Atrasados</h2>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-900">Activar Recargos</label>
            <p className="text-xs text-gray-600 mt-1">
              Habilita el sistema de recargos automáticos para pagos atrasados
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {config.enabled && (
          <>
            {/* Late Fee Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Recargo <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, type: 'percentage' })}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    config.type === 'percentage'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Percent className={`h-5 w-5 ${config.type === 'percentage' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Porcentual</div>
                      <div className="text-xs text-gray-600">% del monto original</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, type: 'fixed' })}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    config.type === 'fixed'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className={`h-5 w-5 ${config.type === 'fixed' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Precio Fijo</div>
                      <div className="text-xs text-gray-600">Monto fijo en dólares</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Late Fee Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {config.type === 'percentage' ? 'Porcentaje' : 'Monto Fijo'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {config.type === 'percentage' ? (
                  <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                ) : (
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                )}
                <input
                  type="number"
                  step={config.type === 'percentage' ? '0.1' : '0.01'}
                  min="0.01"
                  value={config.value}
                  onChange={(e) => setConfig({ ...config, value: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={config.type === 'percentage' ? '5.0' : '10.00'}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {config.type === 'percentage'
                  ? 'Porcentaje del monto original del cargo (ej: 5 = 5%)'
                  : 'Monto fijo en dólares a aplicar como recargo'}
              </p>
            </div>

            {/* Grace Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días de Gracia <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="number"
                  min="0"
                  value={config.graceDays}
                  onChange={(e) => setConfig({ ...config, graceDays: parseInt(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Días después de la fecha límite antes de aplicar el recargo
              </p>
            </div>

            {/* Payment Deadline Day Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Fecha Límite de Pago</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Los pagos deben realizarse antes del día <strong>{config.paymentDeadlineDay}</strong> de cada mes.
                    Esta fecha se configura en la sección de Estados de Cuenta.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Vista Previa del Recargo</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cargo mensual de ejemplo:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={previewCharge}
                    onChange={(e) => setPreviewCharge(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Recargo aplicado:</span>
                  <span className="text-lg font-bold text-red-600">
                    ${previewAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Total a pagar:</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${(previewCharge + previewAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Guardar Configuración
              </>
            )}
          </button>
          {config.enabled && (
            <button
              onClick={handleApplyLateFees}
              disabled={applying}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Aplicar Recargos
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



