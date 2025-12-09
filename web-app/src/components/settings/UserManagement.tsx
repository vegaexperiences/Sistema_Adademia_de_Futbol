'use client'

import { useState, useEffect } from 'react'
import { Users, Shield, Plus, X, Eye, CheckCircle } from 'lucide-react'
import { 
  getAllUsers, 
  getAllRoles, 
  getUserRoles, 
  assignRoleToUser, 
  removeRoleFromUser,
  getUserPermissions,
  type User,
  type Role,
  type UserRole,
  type Permission
} from '@/lib/actions/users'
import { getAllAcademies, type Academy } from '@/lib/actions/academies'

interface UserManagementProps {
  currentUserEmail: string | null
}

export function UserManagement({ currentUserEmail }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({})
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedAcademy, setSelectedAcademy] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [usersResult, rolesResult, academiesResult] = await Promise.all([
        getAllUsers(),
        getAllRoles(),
        getAllAcademies(),
      ])

      if (usersResult.error) {
        setError(usersResult.error)
        setIsLoading(false)
        return
      }

      if (rolesResult.error) {
        setError(rolesResult.error)
        setIsLoading(false)
        return
      }

      if (academiesResult.error) {
        setError(academiesResult.error)
        setIsLoading(false)
        return
      }

      setUsers(usersResult.data || [])
      setRoles(rolesResult.data || [])
      setAcademies(academiesResult.data || [])

      // Load roles for each user
      if (usersResult.data) {
        const rolesMap: Record<string, UserRole[]> = {}
        for (const user of usersResult.data) {
          const userRolesResult = await getUserRoles(user.id)
          if (userRolesResult.data) {
            rolesMap[user.id] = userRolesResult.data
          }
        }
        setUserRoles(rolesMap)
      }

      // Set default academy if available
      if (academiesResult.data && academiesResult.data.length > 0 && !selectedAcademy) {
        setSelectedAcademy(academiesResult.data[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignRole = async (userId: string, roleId: string, academyId: string) => {
    setError(null)
    setSuccess(null)

    const result = await assignRoleToUser(userId, roleId, academyId)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Rol asignado exitosamente')
      setShowAssignForm(false)
      setSelectedUser(null)
      await loadData() // Reload data
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string, academyId: string) => {
    if (!confirm('¿Estás seguro de que deseas remover este rol?')) {
      return
    }

    setError(null)
    setSuccess(null)

    const result = await removeRoleFromUser(userId, roleId, academyId)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Rol removido exitosamente')
      await loadData() // Reload data
    }
  }

  const handleShowPermissions = async (userId: string) => {
    const currentShow = showPermissions[userId] || false
    setShowPermissions({ ...showPermissions, [userId]: !currentShow })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Academy Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Filtrar por Academia
        </label>
        <select
          value={selectedAcademy || ''}
          onChange={(e) => setSelectedAcademy(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todas las academias</option>
          {academies.map((academy) => (
            <option key={academy.id} value={academy.id}>
              {academy.name}
            </option>
          ))}
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios ({users.length})
          </h3>
          <button
            onClick={() => {
              setShowAssignForm(true)
              setSelectedUser(null)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            Asignar Rol
          </button>
        </div>

        {users.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No hay usuarios registrados</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const userRolesList = userRoles[user.id] || []
              const filteredRoles = selectedAcademy
                ? userRolesList.filter(r => r.academy_id === selectedAcademy)
                : userRolesList

              return (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-gray-900">{user.email}</h4>
                        {user.email === currentUserEmail && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            Tú
                          </span>
                        )}
                      </div>
                      {user.name && user.name !== user.email && (
                        <p className="text-sm text-gray-600 mb-2">{user.name}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Registrado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </p>

                      {/* User Roles */}
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-semibold text-gray-700">Roles:</span>
                        </div>
                        {filteredRoles.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">Sin roles asignados</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {filteredRoles.map((userRole) => (
                              <div
                                key={userRole.id}
                                className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                              >
                                <span>{userRole.display_name}</span>
                                {userRole.academy_name && (
                                  <span className="text-xs text-purple-600">
                                    ({userRole.academy_name})
                                  </span>
                                )}
                                {user.email !== currentUserEmail && (
                                  <button
                                    onClick={() => handleRemoveRole(user.id, userRole.id, userRole.academy_id)}
                                    className="text-purple-600 hover:text-purple-800"
                                    title="Remover rol"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Permissions Button */}
                      <button
                        onClick={() => handleShowPermissions(user.id)}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Eye size={16} />
                        {showPermissions[user.id] ? 'Ocultar' : 'Ver'} Permisos
                      </button>

                      {/* Permissions List */}
                      {showPermissions[user.id] && (
                        <UserPermissionsList userId={user.id} academyId={selectedAcademy || undefined} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign Role Form */}
      {showAssignForm && (
        <AssignRoleForm
          users={users}
          roles={roles}
          academies={academies}
          onAssign={handleAssignRole}
          onCancel={() => {
            setShowAssignForm(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}

function UserPermissionsList({ userId, academyId }: { userId: string; academyId?: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPermissions()
  }, [userId, academyId])

  const loadPermissions = async () => {
    setIsLoading(true)
    const result = await getUserPermissions(userId, academyId)
    if (result.data) {
      setPermissions(result.data)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500 mt-2">Cargando permisos...</div>
  }

  if (permissions.length === 0) {
    return <div className="text-sm text-gray-500 mt-2 italic">Sin permisos asignados</div>
  }

  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = []
    }
    acc[perm.module].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
      <p className="text-xs font-semibold text-gray-700 mb-2">Permisos Efectivos:</p>
      <div className="space-y-2">
        {Object.entries(permissionsByModule).map(([module, perms]) => (
          <div key={module}>
            <p className="text-xs font-bold text-gray-600 mb-1 capitalize">{module}:</p>
            <div className="flex flex-wrap gap-1">
              {perms.map((perm) => (
                <span
                  key={perm.id}
                  className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full"
                >
                  {perm.display_name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AssignRoleForm({
  users,
  roles,
  academies,
  onAssign,
  onCancel,
}: {
  users: User[]
  roles: Role[]
  academies: Academy[]
  onAssign: (userId: string, roleId: string, academyId: string) => Promise<void>
  onCancel: () => void
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedAcademyId, setSelectedAcademyId] = useState(academies[0]?.id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUserId || !selectedRoleId || !selectedAcademyId) {
      return
    }

    setIsSubmitting(true)
    await onAssign(selectedUserId, selectedRoleId, selectedAcademyId)
    setIsSubmitting(false)
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-l-4 border-blue-500">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Plus className="h-5 w-5" />
        Asignar Rol a Usuario
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Usuario
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 bg-white text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            required
          >
            <option value="">Selecciona un usuario</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email} {user.name && user.name !== user.email ? `(${user.name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Academia
          </label>
          <select
            value={selectedAcademyId}
            onChange={(e) => setSelectedAcademyId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 bg-white text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            required
          >
            {academies.map((academy) => (
              <option key={academy.id} value={academy.id}>
                {academy.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Rol
          </label>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 bg-white text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            required
          >
            <option value="">Selecciona un rol</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.display_name} {role.description && `- ${role.description}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !selectedUserId || !selectedRoleId || !selectedAcademyId}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}
          >
            <CheckCircle size={18} />
            {isSubmitting ? 'Asignando...' : 'Asignar Rol'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

