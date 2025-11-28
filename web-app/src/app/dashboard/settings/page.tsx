import { createClient } from '@/lib/supabase/server';
import { Settings, DollarSign, Save, CreditCard } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { PaymentMethodsSettings } from '@/components/settings/PaymentMethodsSettings';
import Link from 'next/link';

async function updateSetting(formData: FormData) {
  'use server';
  
  const supabase = await createClient();
  const key = formData.get('key') as string;
  const value = formData.get('value') as string;
  
  await supabase
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  
  revalidatePath('/dashboard/settings');
}

export default async function SettingsPage() {
  const supabase = await createClient();
  
  // Get all settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .order('key');

  const priceSettings = settings?.filter(s => s.key.startsWith('price_')) || [];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with Glass Effect */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              ⚙️ Configuración
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Administra los parámetros del sistema</p>
          </div>
          <Settings size={32} className="text-blue-600 sm:w-10 sm:h-10" />
        </div>
        
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <a 
            href="#pricing" 
            className="px-4 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg active:bg-gray-50 dark:active:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base touch-manipulation text-center"
          >
            💰 Precios
          </a>
          <a 
            href="#payment-methods" 
            className="px-4 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg active:bg-gray-50 dark:active:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base touch-manipulation text-center"
          >
            💳 Métodos de Pago
          </a>
          <Link
            href="/dashboard/emails"
            className="px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-lg active:bg-blue-800 hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
          >
            📧 Correos
          </Link>
        </div>
      </div>

      {/* Pricing Settings */}
      <div id="pricing" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}>
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            💰 Configuración de Precios
          </h2>
        </div>

        <div className="grid gap-6">
          {/* Enrollment Price */}
          {priceSettings.find(s => s.key === 'price_enrollment') && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border-l-4 border-blue-500">
              <form action={updateSetting} className="space-y-4">
                <input type="hidden" name="key" value="price_enrollment" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    📝 Precio de Matrícula
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Costo único de inscripción por jugador
                  </p>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        name="value"
                        step="0.01"
                        defaultValue={priceSettings.find(s => s.key === 'price_enrollment')?.value}
                        className="w-full pl-8 pr-4 py-3.5 min-h-[48px] rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-base sm:text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 touch-manipulation"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      <Save size={18} />
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Monthly Price */}
          {priceSettings.find(s => s.key === 'price_monthly') && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border-l-4 border-purple-500">
              <form action={updateSetting} className="space-y-4">
                <input type="hidden" name="key" value="price_monthly" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    📅 Precio de Mensualidad Regular
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Costo mensual por jugador
                  </p>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        name="value"
                        step="0.01"
                        defaultValue={priceSettings.find(s => s.key === 'price_monthly')?.value}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder-gray-400"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                        boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
                      }}
                    >
                      <Save size={18} />
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Family Monthly Price */}
          {priceSettings.find(s => s.key === 'price_monthly_family') && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl border-l-4 border-amber-500">
              <form action={updateSetting} className="space-y-4">
                <input type="hidden" name="key" value="price_monthly_family" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    👨‍👩‍👧‍👦 Precio de Mensualidad Familiar
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Costo mensual después del segundo jugador de la misma familia
                  </p>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        name="value"
                        step="0.01"
                        defaultValue={priceSettings.find(s => s.key === 'price_monthly_family')?.value}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder-gray-400"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                      }}
                    >
                      <Save size={18} />
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-bold">💡 Nota:</span> Los cambios en los precios se aplicarán inmediatamente a todas las nuevas matrículas y pagos. Los pagos existentes no se verán afectados.
          </p>
        </div>
      </div>

      {/* Payment Methods Settings */}
      <div id="payment-methods" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          }}>
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            💳 Métodos de Pago
          </h2>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-xl border-l-4 border-orange-500">
          <form action={updateSetting} className="space-y-4">
            <input type="hidden" name="key" value="payment_methods" />
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                Activar/Desactivar Métodos
              </label>
              
              {(() => {
                const methods = settings?.find(s => s.key === 'payment_methods')?.value 
                  ? (typeof settings.find(s => s.key === 'payment_methods')?.value === 'string' 
                      ? JSON.parse(settings.find(s => s.key === 'payment_methods')?.value) 
                      : settings.find(s => s.key === 'payment_methods')?.value)
                  : { yappy: true, transfer: true, proof: false };

                return <PaymentMethodsSettings initialMethods={methods} />;
              })()}

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
                  }}
                >
                  <Save size={18} />
                  Guardar Configuración
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
