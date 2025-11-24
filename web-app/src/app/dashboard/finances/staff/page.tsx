import { getStaff } from '@/lib/actions/staff';
import { Users, Plus, DollarSign } from 'lucide-react';
import Link from 'next/link';
import StaffList from '@/components/finances/StaffList';

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/dashboard/finances" className="text-blue-600 hover:underline text-sm mb-2 block">
              ← Volver a Finanzas
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              👥 Gestión de Personal
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Administra empleados, entrenadores y nómina
            </p>
          </div>
          <Link
            href="/dashboard/finances/staff/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            Agregar Personal
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Personal Activo</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {staff.filter(s => s.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nómina Mensual</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${staff
                  .filter(s => s.is_active && s.payment_frequency === 'monthly')
                  .reduce((sum, s) => sum + parseFloat(s.salary.toString()), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Personal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {staff.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <StaffList staff={staff} />
    </div>
  );
}
