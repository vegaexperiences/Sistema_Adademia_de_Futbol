'use client';

import { useState, useEffect } from 'react';
import { Target, Save, DollarSign, TrendingUp, Users, Percent } from 'lucide-react';
import { getOKRSettings, updateOKRSettings, type OKRTargets } from '@/lib/actions/okrs';
import { useRouter } from 'next/navigation';

type Period = 'monthly' | 'quarterly' | 'annual';

export function OKRsSettings() {
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<{
    monthly: OKRTargets;
    quarterly: OKRTargets;
    annual: OKRTargets;
  } | null>(null);
  const [formData, setFormData] = useState<OKRTargets>({
    revenue: null,
    profit: null,
    margin: null,
    activePlayers: null,
    retention: null,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData(settings[activePeriod]);
    }
  }, [activePeriod, settings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getOKRSettings();
      setSettings(data);
      setFormData(data[activePeriod]);
    } catch (error) {
      console.error('Error loading OKR settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateOKRSettings(activePeriod, formData);
      if (result.success) {
        await loadSettings();
        router.refresh();
        alert('Configuración guardada exitosamente');
      } else {
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error saving OKR settings:', error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof OKRTargets, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [field]: isNaN(numValue as number) ? null : numValue,
    }));
  };

  const periods = [
    { id: 'monthly' as Period, label: 'Mensual' },
    { id: 'quarterly' as Period, label: 'Trimestral' },
    { id: 'annual' as Period, label: 'Anual' },
  ];

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
          <Target className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Configuración de OKRs</h3>
          <p className="text-sm text-gray-600">
            Define los objetivos y resultados clave por período
          </p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => setActivePeriod(period.id)}
            className={`
              px-4 py-2 font-semibold transition-colors
              ${activePeriod === period.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Financial OKRs */}
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Objetivos Financieros
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingresos (USD)
              </label>
              <input
                type="number"
                value={formData.revenue === null ? '' : formData.revenue}
                onChange={(e) => handleChange('revenue', e.target.value)}
                placeholder="Dejar vacío para calcular automáticamente"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si está vacío, se calculará como 20% de crecimiento
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profit (USD)
              </label>
              <input
                type="number"
                value={formData.profit === null ? '' : formData.profit}
                onChange={(e) => handleChange('profit', e.target.value)}
                placeholder="Dejar vacío para calcular automáticamente"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si está vacío, se calculará como 15% de crecimiento
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margen de Ganancia (%)
              </label>
              <input
                type="number"
                value={formData.margin === null ? '' : formData.margin}
                onChange={(e) => handleChange('margin', e.target.value)}
                placeholder="30"
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Por defecto: 30%
              </p>
            </div>
          </div>
        </div>

        {/* Operational OKRs */}
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Objetivos Operacionales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jugadores Activos
              </label>
              <input
                type="number"
                value={formData.activePlayers === null ? '' : formData.activePlayers}
                onChange={(e) => handleChange('activePlayers', e.target.value)}
                placeholder="Dejar vacío para calcular automáticamente"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si está vacío, se calculará como 10% de crecimiento
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retención (%)
              </label>
              <input
                type="number"
                value={formData.retention === null ? '' : formData.retention}
                onChange={(e) => handleChange('retention', e.target.value)}
                placeholder="95"
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Por defecto: 95%
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white
              transition-all duration-200
              ${saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }
            `}
          >
            <Save className="h-5 w-5" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}


