'use client'

import { useState } from 'react'
import { Shield, Plus, Trash2, Key, Eye, EyeOff } from 'lucide-react'
import { createSuperAdmin, deleteSuperAdmin, getSuperAdminsAction, verifySuperAdminKey } from '@/lib/actions/super-admin'

interface SuperAdmin {
  id: string
  email: string
  name: string | null
  created_at: string
}

interface SuperAdminSettingsProps {
  initialAdmins: SuperAdmin[]
  currentUserEmail: string | null
}

export function SuperAdminSettings({ initialAdmins, currentUserEmail }: SuperAdminSettingsProps) {
  const [admins, setAdmins] = useState<SuperAdmin[]>(initialAdmins)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [key, setKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleVerifyKey = async () => {
    if (!key.trim()) {
      setKeyError('Por favor ingresa la clave')
      return
    }

    setIsVerifying(true)
    setKeyError('')

    try {
      const result = await verifySuperAdminKey(key)
      if (result.success) {
        setIsVerified(true)
        setKeyError('')
      } else {
        setKeyError(result.error || 'Clave incorrecta')
        setIsVerified(false)
      }
    } catch (error: any) {
      setKeyError('Error al verificar la clave')
      setIsVerified(false)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isVerified) {
      setAddError('Debes verificar la clave primero')
      return
    }

    if (!newAdminEmail.trim()) {
      setAddError('Por favor ingresa un email')
      return
    }

    setIsAdding(true)
    setAddError('')
    setAddSuccess('')

    try {
      const result = await createSuperAdmin(newAdminEmail, key)
      if (result.success) {
        setAddSuccess('Super admin creado exitosamente')
        setNewAdminEmail('')
        setShowAddForm(false)
        // Refresh admins list
        const updatedAdmins = await getSuperAdminsAction()
        if (updatedAdmins.data) {
          setAdmins(updatedAdmins.data)
        }
      } else {
        setAddError(result.error || 'Error al crear super admin')
      }
    } catch (error: any) {
      setAddError('Error al crear super admin')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteSuperAdmin = async (adminId: string, adminEmail: string) => {
    if (!isVerified) {
      setAddError('Debes verificar la clave primero')
      return
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar a ${adminEmail} como super admin?`)) {
      return
    }

    try {
      const result = await deleteSuperAdmin(adminId, key)
      if (result.success) {
        setAdmins(admins.filter(a => a.id !== adminId))
        setAddSuccess('Super admin eliminado exitosamente')
      } else {
        setAddError(result.error || 'Error al eliminar super admin')
      }
    } catch (error: any) {
      setAddError('Error al eliminar super admin')
    }
  }

  return (
    <div className="space-y-6">
      {/* Key Verification Section */}
      {!isVerified && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Verificación de Clave de Super Admin
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Para gestionar super admins, necesitas verificar la clave de acceso.
          </p>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyKey()}
                placeholder="Ingresa la clave de super admin"
                className="w-full pl-4 pr-12 py-3 rounded-xl border-2 border-red-200 bg-white text-gray-900 font-medium focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {keyError && (
              <p className="text-sm text-red-600 font-medium">{keyError}</p>
            )}
            <button
              onClick={handleVerifyKey}
              disabled={isVerifying}
              className="w-full px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
              }}
            >
              {isVerifying ? 'Verificando...' : 'Verificar Clave'}
            </button>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {addSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{addSuccess}</p>
        </div>
      )}
      {addError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{addError}</p>
        </div>
      )}

      {/* Verified Section */}
      {isVerified && (
        <>
          {/* Add Super Admin Form */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Agregar Super Admin
              </h3>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Plus size={18} />
                  Agregar
                </button>
              )}
            </div>

            {showAddForm && (
              <form onSubmit={handleAddSuperAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email del Usuario
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    El usuario debe existir en Supabase Auth
                  </p>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 bg-white text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    {isAdding ? 'Creando...' : 'Crear Super Admin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewAdminEmail('')
                      setAddError('')
                    }}
                    className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Super Admins List */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Super Admins Actuales ({admins.length})
            </h3>
            {admins.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No hay super admins registrados</p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{admin.email}</p>
                      {admin.name && (
                        <p className="text-sm text-gray-600">{admin.name}</p>
                      )}
                      {admin.email === currentUserEmail && (
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Tú
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Creado: {new Date(admin.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSuperAdmin(admin.id, admin.email)}
                      disabled={admin.email === currentUserEmail}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={admin.email === currentUserEmail ? 'No puedes eliminarte a ti mismo' : 'Eliminar'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

