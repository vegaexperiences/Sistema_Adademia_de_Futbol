import { redirect } from 'next/navigation'
import { checkIsSuperAdmin } from '@/lib/actions/academies'

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
          <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
          <p className="text-sm text-gray-600">Gestión centralizada de todas las academias</p>
        </div>
      </div>
      {children}
    </div>
  )
}

