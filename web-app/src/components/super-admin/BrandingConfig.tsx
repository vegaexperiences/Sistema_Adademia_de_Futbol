'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Image, Type, Navigation } from 'lucide-react'
import { updateAcademy, updateAcademySettings, type Academy } from '@/lib/actions/academies'

interface BrandingConfigProps {
  academy: Academy
}

export function BrandingConfig({ academy }: BrandingConfigProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(academy.display_name || academy.name)
  const [navigationLabels, setNavigationLabels] = useState<Record<string, string>>({
    home: academy.settings?.navigation?.home || 'Inicio',
    enrollment: academy.settings?.navigation?.enrollment || 'Matrícula',
    tournaments: academy.settings?.navigation?.tournaments || 'Torneos',
    access: academy.settings?.navigation?.access || 'Acceso',
    dashboard: academy.settings?.navigation?.dashboard || 'Dashboard',
    approvals: academy.settings?.navigation?.approvals || 'Aprobaciones',
    players: academy.settings?.navigation?.players || 'Jugadores',
    finances: academy.settings?.navigation?.finances || 'Finanzas',
    tutors: academy.settings?.navigation?.tutors || 'Tutores',
    families: academy.settings?.navigation?.families || 'Familias',
    reports: academy.settings?.navigation?.reports || 'Reportes',
    emails: academy.settings?.navigation?.emails || 'Correos',
    settings: academy.settings?.navigation?.settings || 'Configuración',
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Update display_name
      const updateResult = await updateAcademy(academy.id, {
        display_name: displayName.trim() || null,
      })

      if (updateResult.error) {
        setError(updateResult.error)
        setIsSubmitting(false)
        return
      }

      // Update navigation labels in settings
      const currentSettings = academy.settings || {}
      const updatedSettings = {
        ...currentSettings,
        navigation: navigationLabels,
      }

      const settingsResult = await updateAcademySettings(academy.id, updatedSettings)

      if (!settingsResult.success) {
        setError(settingsResult.error || 'Error al actualizar configuración')
      } else {
        setSuccess('Branding actualizado exitosamente')
        console.log('[BrandingConfig] ✅ Branding updated successfully')
        
        // Dispatch custom event to notify AcademyContext
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('academy-updated'))
          // Also set storage event for cross-tab updates
          localStorage.setItem('academy-updated', Date.now().toString())
        }
        
        // Force a hard refresh to ensure all components update
        setTimeout(() => {
          router.refresh()
          // Also reload the page to ensure AcademyContext updates
          window.location.reload()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar branding')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setDisplayName(academy.name)
    setNavigationLabels({
      home: 'Inicio',
      enrollment: 'Matrícula',
      tournaments: 'Torneos',
      access: 'Acceso',
      dashboard: 'Dashboard',
      approvals: 'Aprobaciones',
      players: 'Jugadores',
      finances: 'Finanzas',
      tutors: 'Tutores',
      families: 'Familias',
      reports: 'Reportes',
      emails: 'Correos',
      settings: 'Configuración',
    })
  }

  const navigationFields = [
    { key: 'home', label: 'Inicio (Home)', description: 'Página principal' },
    { key: 'enrollment', label: 'Matrícula (Enrollment)', description: 'Formulario de matrícula' },
    { key: 'tournaments', label: 'Torneos (Tournaments)', description: 'Página de torneos' },
    { key: 'access', label: 'Acceso (Access)', description: 'Botón de login' },
    { key: 'dashboard', label: 'Dashboard', description: 'Panel principal' },
    { key: 'approvals', label: 'Aprobaciones', description: 'Aprobaciones pendientes' },
    { key: 'players', label: 'Jugadores', description: 'Gestión de jugadores' },
    { key: 'finances', label: 'Finanzas', description: 'Gestión financiera' },
    { key: 'tutors', label: 'Tutores', description: 'Gestión de tutores' },
    { key: 'families', label: 'Familias', description: 'Gestión de familias' },
    { key: 'reports', label: 'Reportes', description: 'Reportes y estadísticas' },
    { key: 'emails', label: 'Correos', description: 'Gestión de correos' },
    { key: 'settings', label: 'Configuración', description: 'Configuración del sistema' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Display Name Section */}
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Type className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Nombre de Visualización</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Este es el nombre que se mostrará en la interfaz. Si no se especifica, se usará el nombre técnico de la academia.
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre para Mostrar
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder={academy.name}
          />
          <p className="text-xs text-gray-500 mt-1">
            Nombre técnico: <span className="font-mono">{academy.name}</span>
          </p>
        </div>
      </div>

      {/* Navigation Labels Section */}
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Navigation className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Etiquetas de Navegación</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Personaliza los textos que aparecen en los menús de navegación de la academia.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {navigationFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {field.label}
              </label>
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
              <input
                type="text"
                value={navigationLabels[field.key] || ''}
                onChange={(e) => setNavigationLabels({
                  ...navigationLabels,
                  [field.key]: e.target.value,
                })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={field.label}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Restablecer
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
          }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save size={18} />
              Guardar Branding
            </>
          )}
        </button>
      </div>
    </form>
  )
}

