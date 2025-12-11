import { getAllAcademies, createAcademy, updateAcademy, deleteAcademy } from '@/lib/actions/academies'
import AcademiesList from '@/components/super-admin/AcademiesList'

export default async function SuperAdminAcademiesPage() {
  const result = await getAllAcademies()
  
  if (result.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {result.error}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AcademiesList academies={result.data || []} />
    </div>
  )
}

