'use client';

import { Staff } from '@/lib/actions/staff';
import { Users, Mail, Phone, DollarSign } from 'lucide-react';
import StaffPaymentModal from './StaffPaymentModal';

interface StaffListProps {
  staff: Staff[];
}

export default function StaffList({ staff }: StaffListProps) {
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      coach: 'Entrenador',
      admin: 'Administrativo',
      maintenance: 'Mantenimiento',
      other: 'Otro'
    };
    return roles[role] || role;
  };

  const getFrequencyLabel = (freq: string) => {
    const frequencies: Record<string, string> = {
      weekly: 'Semanal',
      biweekly: 'Quincenal',
      monthly: 'Mensual'
    };
    return frequencies[freq] || freq;
  };

  if (staff.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-500 dark:text-gray-400">No hay personal registrado aún</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Lista de Personal
      </h2>

      <div className="space-y-3">
        {staff.map((member) => (
          <div
            key={member.id}
            className={`border rounded-lg p-4 transition-all ${
              member.is_active
                ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {member.first_name} {member.last_name}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                    {getRoleLabel(member.role)}
                  </span>
                  {!member.is_active && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                      Inactivo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <DollarSign size={16} />
                    <span>${parseFloat(member.salary.toString()).toFixed(2)} / {getFrequencyLabel(member.payment_frequency)}</span>
                  </div>

                  {member.email && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Mail size={16} />
                      <span>{member.email}</span>
                    </div>
                  )}

                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone size={16} />
                      <span>{member.phone}</span>
                    </div>
                  )}

                  <div className="text-gray-600 dark:text-gray-400">
                    Desde: {new Date(member.hire_date).toLocaleDateString('es-ES')}
                  </div>
                </div>

                {member.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {member.notes}
                  </p>
                )}
              </div>

              {member.is_active && (
                <StaffPaymentModal staff={member} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
