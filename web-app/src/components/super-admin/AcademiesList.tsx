'use client'

import { useState } from 'react'
import { createAcademy, updateAcademy, deleteAcademy, type Academy } from '@/lib/actions/academies'
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'

interface AcademiesListProps {
  academies: Academy[]
}

export default function AcademiesList({ academies: initialAcademies }: AcademiesListProps) {
  const [academies, setAcademies] = useState(initialAcademies)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nueva Academia
        </button>
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
                <p className="text-gray-600">
                  <span className="font-semibold">Dominio:</span> {academy.domain}
                </p>
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
    </div>
  )
}

