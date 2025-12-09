import { createClient } from '@/lib/supabase/server';
import { Settings, DollarSign, Save, CreditCard, Calendar, Shield, Users } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { PaymentMethodsSettings } from '@/components/settings/PaymentMethodsSettings';
import { SuperAdminSettings } from '@/components/settings/SuperAdminSettings';
import { UserManagement } from '@/components/settings/UserManagement';
import { getSuperAdmins } from '@/lib/actions/super-admin';
import Link from 'next/link';

async function updateSetting(formData: FormData) {
  'use server';
  
  const supabase = await createClient();
  const key = formData.get('key') as string;
  let value = formData.get('value') as string;
  
  // For date settings, empty string means no restriction (store as empty string, not NULL)
  // The value column has NOT NULL constraint, so we use empty string instead
  if (key === 'season_start_date' || key === 'season_end_date') {
    value = value || ''; // Ensure empty string if no value provided
  }
  
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
  
  // Get current user email
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserEmail = user?.email || null;
  
  // Get super admins - simplified to avoid blocking render
  let superAdmins: any[] = [];
  try {
    const superAdminsResult = await getSuperAdmins();
    superAdmins = superAdminsResult.data || [];
  } catch (error) {
    // Silently fail - component will handle empty array
    superAdmins = [];
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with Glass Effect */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              ⚙️ Configuración
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Administra los parámetros del sistema</p>
          </div>
          <Settings size={32} className="text-blue-600 sm:w-10 sm:h-10" />
        </div>
        
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <a 
            href="#pricing" 
            className="px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-lg active:bg-gray-50 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base touch-manipulation text-center"
          >
            💰 Precios
          </a>
          <a 
            href="#season" 
            className="px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-lg active:bg-gray-50 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base touch-manipulation text-center"
          >
            📅 Temporada
          </a>
          <a 
            href="#payment-methods" 
            className="px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-lg active:bg-gray-50 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base touch-manipulation text-center"
          >
            💳 Métodos de Pago
          </a>
          <Link
            href="/dashboard/emails"
            className="px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-lg active:bg-blue-800 hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
          >
            📧 Correos
          </Link>
          <a 
            href="#super-admin" 
            className="px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-lg active:bg-gray-50 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base touch-manipulation text-center"
          >
            🛡️ Super Admin
          </a>
          <a 
            href="#user-management" 
            className="px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-lg active:bg-gray-50 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base touch-manipulation text-center"
          >
            👥 Usuarios
          </a>
        </div>
      </div>

      {/* Pricing Settings */}
      <div id="pricing" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg icon-bg-green">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            💰 Configuración de Precios
          </h2>
        </div>

        <div className="grid gap-6">
          {/* Enrollment Price */}
          {priceSettings.find(s => s.key === 'price_enrollment') && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-l-4 border-blue-500">
              <form action={updateSetting} className="space-y-4">
                <input type="hidden" name="key" value="price_enrollment" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📝 Precio de Matrícula
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
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
                        className="w-full pl-8 pr-4 py-3.5 min-h-[48px] rounded-xl border-2 border-blue-200 bg-white text-gray-900 font-bold text-base sm:text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 touch-manipulation"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto btn-primary shadow-lg shadow-blue-500/30"
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
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-500">
              <form action={updateSetting} className="space-y-4">
                <input type="hidden" name="key" value="price_monthly" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📅 Precio de Mensualidad Regular
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
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
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-purple-200 bg-white text-gray-900 font-bold text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder-gray-400"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 gradient-purple shadow-lg shadow-purple-500/30"
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
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-l-4 border-amber-500">
              <form action={updateSetting} className="space-y-4">
                <input type="hidden" name="key" value="price_monthly_family" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    👨‍👩‍👧‍👦 Precio de Mensualidad Familiar
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
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
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-amber-200 bg-white text-gray-900 font-bold text-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder-gray-400"
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
        <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
          <p className="text-sm text-gray-700">
            <span className="font-bold">💡 Nota:</span> Los cambios en los precios se aplicarán inmediatamente a todas las nuevas matrículas y pagos. Los pagos existentes no se verán afectados.
          </p>
        </div>
      </div>

      {/* Season Settings */}
      <div id="season" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}>
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            📅 Configuración de Temporada
          </h2>
        </div>

        <div className="grid gap-6">
          {/* Season Start Date */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-l-4 border-green-500">
            <form action={updateSetting} className="space-y-4">
              <input type="hidden" name="key" value="season_start_date" />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🗓️ Fecha de Inicio de Temporada
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  No se generarán mensualidades antes de esta fecha. Dejar vacío para sin restricción.
                </p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      name="value"
                      defaultValue={settings?.find(s => s.key === 'season_start_date')?.value || ''}
                      className="w-full pl-4 pr-4 py-3.5 min-h-[48px] rounded-xl border-2 border-green-200 bg-white text-gray-900 font-bold text-base sm:text-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all placeholder-gray-400 touch-manipulation"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Save size={18} />
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Season End Date */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border-l-4 border-teal-500">
            <form action={updateSetting} className="space-y-4">
              <input type="hidden" name="key" value="season_end_date" />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🗓️ Fecha de Fin de Temporada
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  No se generarán mensualidades después de esta fecha. Dejar vacío para sin restricción.
                </p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      name="value"
                      defaultValue={settings?.find(s => s.key === 'season_end_date')?.value || ''}
                      className="w-full pl-4 pr-4 py-3.5 min-h-[48px] rounded-xl border-2 border-teal-200 bg-white text-gray-900 font-bold text-base sm:text-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder-gray-400 touch-manipulation"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
                    style={{
                      background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                      boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)'
                    }}
                  >
                    <Save size={18} />
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
          <p className="text-sm text-gray-700">
            <span className="font-bold">💡 Nota:</span> Las fechas de temporada controlan cuándo se pueden generar mensualidades automáticamente. Si no se configuran fechas, el sistema generará mensualidades sin restricciones de fecha.
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
          <h2 className="text-2xl font-bold text-gray-900">
            💳 Métodos de Pago
          </h2>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border-l-4 border-orange-500">
          <form action={updateSetting} className="space-y-4">
            <input type="hidden" name="key" value="payment_methods" />
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                Activar/Desactivar Métodos
              </label>
              
              {(() => {
                const methods = settings?.find(s => s.key === 'payment_methods')?.value 
                  ? (typeof settings.find(s => s.key === 'payment_methods')?.value === 'string' 
                      ? JSON.parse(settings.find(s => s.key === 'payment_methods')?.value) 
                      : settings.find(s => s.key === 'payment_methods')?.value)
                  : { yappy: true, transfer: true, proof: false, paguelofacil: true };

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

      {/* Super Admin Settings */}
      <div id="super-admin" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          }}>
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            🛡️ Gestión de Super Admins
          </h2>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border-l-4 border-red-500">
          <SuperAdminSettings 
            initialAdmins={superAdmins || []} 
            currentUserEmail={currentUserEmail}
          />
        </div>
        <div className="mt-6 bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-l-4 border-yellow-500">
          <p className="text-sm text-gray-700">
            <span className="font-bold">🔐 Seguridad:</span> La clave de super admin se almacena de forma segura (hasheada) en la base de datos.
          </p>
        </div>
      </div>

      {/* User Management Section */}
      <div id="user-management" className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          }}>
            <Users className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            👥 Gestión de Usuarios y Permisos
          </h2>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-500">
          <UserManagement currentUserEmail={currentUserEmail} />
        </div>
        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
          <p className="text-sm text-gray-700">
            <span className="font-bold">💡 Nota:</span> Los roles se asignan por academia.
          </p>
        </div>
      </div>
    </div>
  );
}
