'use client'

import { useState } from 'react'
import { createAcademy, updateAcademy, deleteAcademy, type Academy } from '@/lib/actions/academies'
import { Plus, Edit, Trash2, Building2, Settings, AlertCircle, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { AcademySettingsForm } from './AcademySettingsForm'
import { AcademyCreationWizard } from './AcademyCreationWizard'
import { DomainConfigurationGuide } from './DomainConfigurationGuide'

interface AcademiesListProps {
  academies: Academy[]
}

export default function AcademiesList({ academies: initialAcademies }: AcademiesListProps) {
  const [academies, setAcademies] = useState(initialAcademies)
  const [showWizard, setShowWizard] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settingsAcademyId, setSettingsAcademyId] = useState<string | null>(null)
  const [domainGuideAcademyId, setDomainGuideAcademyId] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    logo_url: '',
    primary_color: '',
    secondary_color: '',
  })

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) {
      alert('Nombre y slug son requeridos')
      return
    }

    const result = await createAcademy({
      name: formData.name,
      slug: formData.slug,
      domain: formData.domain || null,
      logo_url: formData.logo_url || null,
      primary_color: formData.primary_color || null,
      secondary_color: formData.secondary_color || null,
    })

    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      setAcademies([...academies, result.data!])
      setIsCreating(false)
      setFormData({
        name: '',
        slug: '',
        domain: '',
        logo_url: '',
        primary_color: '',
        secondary_color: '',
      })
    }
  }

  const handleUpdate = async (id: string) => {
    const result = await updateAcademy(id, {
      name: formData.name,
      slug: formData.slug,
      domain: formData.domain || null,
      logo_url: formData.logo_url || null,
      primary_color: formData.primary_color || null,
      secondary_color: formData.secondary_color || null,
    })

    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      setAcademies(academies.map(a => a.id === id ? result.data! : a))
      setEditingId(null)
      setFormData({
        name: '',
        slug: '',
        domain: '',
        logo_url: '',
        primary_color: '',
        secondary_color: '',
      })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la academia "${name}"? Esta acción no se puede deshacer y eliminará todos los datos asociados.`)) {
      return
    }

    const result = await deleteAcademy(id)
    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      setAcademies(academies.filter(a => a.id !== id))
    }
  }

  const startEdit = (academy: Academy) => {
    setEditingId(academy.id)
    setFormData({
      name: academy.name,
      slug: academy.slug,
      domain: academy.domain || '',
      logo_url: academy.logo_url || '',
      primary_color: academy.primary_color || '',
      secondary_color: academy.secondary_color || '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Academias</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Crear Academia (Wizard)
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={20} />
            Crear Simple
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isCreating ? 'Crear Nueva Academia' : 'Editar Academia'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Suarez Academy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug * (identificador único)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: suarez"
              />
              <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dominio Personalizado
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: suarez.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL del Logo
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Primario
              </label>
              <input
                type="color"
                value={formData.primary_color || '#667eea'}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Secundario
              </label>
              <input
                type="color"
                value={formData.secondary_color || '#764ba2'}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                if (isCreating) {
                  handleCreate()
                } else if (editingId) {
                  handleUpdate(editingId)
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isCreating ? 'Crear' : 'Guardar'}
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setEditingId(null)
                setFormData({
                  name: '',
                  slug: '',
                  domain: '',
                  logo_url: '',
                  primary_color: '',
                  secondary_color: '',
                })
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Academies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {academies.map((academy) => (
          <div key={academy.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{academy.name}</h3>
                  <p className="text-sm text-gray-600">Slug: {academy.slug}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSettingsAcademyId(academy.id)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Configuración"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => startEdit(academy)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit size={18} />
                </button>
                {!academy.settings?.isDefault && (
                  <button
                    onClick={() => handleDelete(academy.id, academy.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {academy.domain && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Dominio:</span>
                  <span className="text-gray-600">{academy.domain}</span>
                  {academy.domain_status === 'pending' && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                      <AlertCircle size={12} />
                      Pendiente
                    </span>
                  )}
                  {academy.domain_status === 'active' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle size={12} />
                      Activo
                    </span>
                  )}
                </div>
              )}
              {academy.domain && academy.domain_status === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Acceso Temporal:</p>
                  {(() => {
                    const baseVercelDomain = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                      ? window.location.hostname.split('.').slice(-3).join('.')
                      : 'sistema-adademia-de-futbol-tura.vercel.app'
                    const tempUrl = `https://${academy.slug}.${baseVercelDomain}`
                    return (
                      <div className="flex items-center gap-1">
                        <code className="flex-1 text-xs font-mono text-blue-900 truncate">{tempUrl}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tempUrl)
                            setCopiedUrl(academy.id)
                            setTimeout(() => setCopiedUrl(null), 2000)
                          }}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Copiar URL"
                        >
                          {copiedUrl === academy.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-blue-600" />
                          )}
                        </button>
                        <a
                          href={tempUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink className="h-3 w-3 text-blue-600" />
                        </a>
                      </div>
                    )
                  })()}
                </div>
              )}
              <p className="text-gray-600">
                <span className="font-semibold">Creada:</span>{' '}
                {new Date(academy.created_at).toLocaleDateString('es-ES')}
              </p>
              {academy.settings?.isDefault && (
                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  Academia por Defecto
                </span>
              )}
              {academy.domain && academy.domain_status === 'pending' && (
                <button
                  onClick={() => setDomainGuideAcademyId(academy.id)}
                  className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Ver Instrucciones de Configuración
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {academies.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">No hay academias registradas</p>
        </div>
      )}

      {/* Academy Creation Wizard */}
      {showWizard && (
        <AcademyCreationWizard
          onClose={() => setShowWizard(false)}
          onSuccess={(academyId) => {
            // Reload academies to show new academy
            window.location.reload()
          }}
        />
      )}

      {/* Academy Settings Form Modal */}
      {settingsAcademyId && (
        <AcademySettingsForm
          academy={academies.find(a => a.id === settingsAcademyId)!}
          onClose={() => setSettingsAcademyId(null)}
          onSuccess={() => {
            // Reload academies to get updated settings
            window.location.reload()
          }}
        />
      )}

      {/* Domain Configuration Guide */}
      {domainGuideAcademyId && (
        <DomainConfigurationGuide
          academy={academies.find(a => a.id === domainGuideAcademyId)!}
          onClose={() => setDomainGuideAcademyId(null)}
        />
      )}
    </div>
  )
}

