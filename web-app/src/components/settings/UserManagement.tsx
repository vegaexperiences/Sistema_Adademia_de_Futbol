'use client'

import { useState, useEffect } from 'react'
import { Users, Shield, Plus, X, Eye, CheckCircle, Key, Mail, Lock } from 'lucide-react'
import { 
  getAllUsers, 
  getAllRoles, 
  getUserRoles, 
  assignRoleToUser, 
  removeRoleFromUser,
  getUserPermissions,
  createUser,
  resetUserPassword,
  updateUserPassword,
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:24',message:'Component render',data:{currentUserEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({})
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedAcademy, setSelectedAcademy] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:40',message:'useEffect triggered',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:42',message:'loadData entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    try {
      console.log('[UserManagement] Loading data...')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:47',message:'Before Promise.all',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const [usersResult, rolesResult, academiesResult] = await Promise.all([
        getAllUsers(),
        getAllRoles(),
        getAllAcademies(),
      ])

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:54',message:'After Promise.all',data:{usersError:usersResult.error,usersCount:usersResult.data?.length||0,rolesError:rolesResult.error,rolesCount:rolesResult.data?.length||0,academiesError:academiesResult.error,academiesCount:academiesResult.data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.log('[UserManagement] Results:', {
        users: { error: usersResult.error, count: usersResult.data?.length || 0 },
        roles: { error: rolesResult.error, count: rolesResult.data?.length || 0 },
        academies: { error: academiesResult.error, count: academiesResult.data?.length || 0 },
      })

      if (usersResult.error) {
        console.error('[UserManagement] Error loading users:', usersResult.error)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:60',message:'Users error path',data:{error:usersResult.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        setError(usersResult.error)
        setIsLoading(false)
        return
      }

      if (rolesResult.error) {
        console.error('[UserManagement] Error loading roles:', rolesResult.error)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:67',message:'Roles error path',data:{error:rolesResult.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        setError(rolesResult.error)
        setIsLoading(false)
        return
      }

      // getAllAcademies returns { data } or { error }, not { data, error }
      if (academiesResult.error || !academiesResult.data) {
        const errorMsg = academiesResult.error || 'Error al cargar academias'
        console.error('[UserManagement] Error loading academies:', errorMsg)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:85',message:'Academies error path',data:{error:errorMsg},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:92',message:'Before setUsers/setRoles/setAcademies',data:{usersCount:usersResult.data?.length||0,rolesCount:rolesResult.data?.length||0,academiesCount:academiesResult.data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      setUsers(usersResult.data || [])
      setRoles(rolesResult.data || [])
      setAcademies(academiesResult.data || [])

      // Load roles for each user
      if (usersResult.data && usersResult.data.length > 0) {
        console.log('[UserManagement] Loading roles for', usersResult.data.length, 'users')
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:87',message:'Loading user roles',data:{usersCount:usersResult.data.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        const rolesMap: Record<string, UserRole[]> = {}
        for (let i = 0; i < usersResult.data.length; i++) {
          const user = usersResult.data[i]
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:92',message:'Before getUserRoles',data:{userId:user.id,userIndex:i,totalUsers:usersResult.data.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          try {
            const userRolesResult = await getUserRoles(user.id)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:96',message:'After getUserRoles',data:{userId:user.id,userIndex:i,hasError:!!userRolesResult.error,error:userRolesResult.error,rolesCount:userRolesResult.data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            if (userRolesResult.data) {
              rolesMap[user.id] = userRolesResult.data
            }
          } catch (err: any) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:102',message:'getUserRoles catch',data:{userId:user.id,userIndex:i,error:err.message,errorStack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            console.error('[UserManagement] Error loading roles for user', user.id, ':', err)
            // Continue with next user
          }
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:101',message:'After loading user roles',data:{rolesMapSize:Object.keys(rolesMap).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        setUserRoles(rolesMap)
      }

      // Set default academy if available
      if (academiesResult.data && academiesResult.data.length > 0 && !selectedAcademy) {
        setSelectedAcademy(academiesResult.data[0].id)
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:100',message:'Before finally block',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      console.error('[UserManagement] Unexpected error:', err)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:103',message:'Catch block',data:{error:err.message,errorStack:err.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      setError(err.message || 'Error al cargar datos')
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:107',message:'Finally block - setting isLoading to false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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

  const handleCreateUser = async (email: string, password: string, name?: string) => {
    setError(null)
    setSuccess(null)

    try {
      const result = await createUser(email, password, name)

      if (result.error) {
        setError(result.error)
        return
      }

      setSuccess('Usuario creado exitosamente')
      setShowCreateUserForm(false)
      await loadData() // Reload data to show new user
      // Automatically show role assignment form for the new user
      if (result.data) {
        setSelectedUser(result.data.id)
        setShowAssignForm(true)
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario')
    }
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
          {error.includes('Super admin') && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm font-semibold mb-2">💡 Solución:</p>
              <p className="text-yellow-700 text-sm mb-2">
                Si eres super admin y ves este error, tu usuario no está registrado en la tabla <code className="bg-yellow-100 px-1 rounded">super_admins</code> de la base de datos.
              </p>
              <p className="text-yellow-700 text-sm">
                Ejecuta este SQL en Supabase Dashboard para agregar tu usuario:
              </p>
              <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs overflow-x-auto">
{`INSERT INTO super_admins (user_id, email, name)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', email) as name
FROM auth.users
WHERE email = 'vegaexperiences@gmail.com'
ON CONFLICT (user_id) DO NOTHING;`}
              </pre>
            </div>
          )}
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
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCreateUserForm(true)
                setShowAssignForm(false)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              Crear Usuario
            </button>
            <button
              onClick={() => {
                setShowAssignForm(true)
                setSelectedUser(null)
                setShowCreateUserForm(false)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              Asignar Rol
            </button>
          </div>
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

      {/* Create User Form */}
      {showCreateUserForm && (
        <CreateUserForm
          onCreate={handleCreateUser}
          onCancel={() => {
            setShowCreateUserForm(false)
          }}
        />
      )}

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

function CreateUserForm({
  onCreate,
  onCancel,
}: {
  onCreate: (email: string, password: string, name?: string) => Promise<void>
  onCancel: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email || !email.includes('@')) {
      setError('Email inválido')
      return
    }

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setIsSubmitting(true)
    try {
      await onCreate(email, password, name || undefined)
      // If we get here without error, the user was created successfully
      setSuccess(true)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setName('')
      // Reset success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-l-4 border-green-500">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Plus className="h-5 w-5" />
        Crear Nuevo Usuario
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm font-medium">Usuario creado exitosamente</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-green-200 bg-white text-gray-900 font-medium focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            required
            placeholder="usuario@ejemplo.com"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Nombre (opcional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-green-200 bg-white text-gray-900 font-medium focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            placeholder="Nombre completo"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Contraseña *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-green-200 bg-white text-gray-900 font-medium focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Confirmar Contraseña *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-green-200 bg-white text-gray-900 font-medium focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            required
            minLength={6}
            placeholder="Repite la contraseña"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !email || !password || password !== confirmPassword}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}
          >
            <CheckCircle size={18} />
            {isSubmitting ? 'Creando...' : 'Crear Usuario'}
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

