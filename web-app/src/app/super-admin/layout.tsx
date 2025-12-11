import { redirect } from 'next/navigation'
import Link from 'next/link'
import { checkIsSuperAdmin } from '@/lib/actions/academies'
import { Building2, Users, Settings } from 'lucide-react'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is super admin
  const isAdmin = await checkIsSuperAdmin()
  
  if (!isAdmin) {
    redirect('/dashboard')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
              <p className="text-sm text-gray-600">Gestión centralizada de todas las academias</p>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <nav className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
            <Link
              href="/super-admin/academies"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Building2 size={18} />
              Academias
            </Link>
            <Link
              href="/superadmin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Users size={18} />
              Super Admins
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings size={18} />
              Configuración
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  )
}

