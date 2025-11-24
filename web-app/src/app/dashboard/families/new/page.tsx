'use client';

import { createFamily } from '@/lib/actions/families';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NewFamilyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    const result = await createFamily(formData);
    setLoading(false);

    if (result?.success) {
      router.push('/dashboard/families');
    } else {
      alert('Error al crear familia');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrar Nueva Familia</h1>
      
      <form action={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de la Familia</label>
            <input name="name" required placeholder="Ej. Familia Pérez" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
          </div>
          
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Datos del Tutor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input name="tutorName" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cédula</label>
                <input name="tutorCedula" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="tutorEmail" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="tel" name="tutorPhone" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="animate-spin h-4 w-4" />}
            Guardar Familia
          </button>
        </div>
      </form>
    </div>
  );
}
