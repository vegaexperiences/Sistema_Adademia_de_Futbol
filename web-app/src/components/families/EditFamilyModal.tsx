'use client';

import { useState, useTransition } from 'react';
import { Edit, User, Mail, Phone } from 'lucide-react';
import { updateFamily } from '@/lib/actions/families';
import { useRouter } from 'next/navigation';

interface EditFamilyModalProps {
  family: {
    id: string;
    tutor_name: string;
    tutor_email?: string;
    tutor_phone?: string;
    tutor_cedula?: string;
    secondary_email?: string | null;
  };
}

export function EditFamilyModal({ family }: EditFamilyModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tutor_name: family.tutor_name || '',
    tutor_email: family.tutor_email || '',
    tutor_phone: family.tutor_phone || '',
    tutor_cedula: family.tutor_cedula || '',
    secondary_email: family.secondary_email || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.tutor_name) {
      setError('El nombre del tutor es requerido');
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateFamily(family.id, {
          tutor_name: formData.tutor_name,
          tutor_email: formData.tutor_email || undefined,
          tutor_phone: formData.tutor_phone || undefined,
          tutor_cedula: formData.tutor_cedula || undefined,
          secondary_email: formData.secondary_email || null,
        });

        if (result.error) {
          setError(result.error);
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.refresh();
            setIsOpen(false);
          }, 1500);
        }
      } catch (err: any) {
        setError(err.message || 'Error al actualizar la familia');
      }
    });
  };

  if (isOpen) {
    return (
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Editar Familia
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Modifica todos los datos del tutor de la familia
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Información del Tutor */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Información del Tutor
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Tutor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tutor_name}
                    onChange={(e) => setFormData({ ...formData, tutor_name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cédula del Tutor
                  </label>
                  <input
                    type="text"
                    value={formData.tutor_cedula}
                    onChange={(e) => setFormData({ ...formData, tutor_cedula: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Principal
                  </label>
                  <input
                    type="email"
                    value={formData.tutor_email}
                    onChange={(e) => setFormData({ ...formData, tutor_email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Secundario
                  </label>
                  <input
                    type="email"
                    value={formData.secondary_email}
                    onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Teléfono del Tutor <span className="text-blue-600 text-xs">(Para Yappy)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.tutor_phone}
                    onChange={(e) => setFormData({ ...formData, tutor_phone: e.target.value })}
                    placeholder="64795352"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Número de 8 dígitos registrado en Yappy para pagos. Este número se usará para todos los jugadores de esta familia.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Familia actualizada exitosamente
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || success}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-primary shadow-lg shadow-blue-500/30"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : success ? (
                  '✓ Guardado'
                ) : (
                  <>
                    <Edit size={18} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2 btn-primary shadow-lg shadow-blue-500/30"
    >
      <Edit size={18} />
      Editar Familia
    </button>
  );
}

