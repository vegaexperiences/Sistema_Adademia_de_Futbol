'use client';

import { useState, useTransition } from 'react';
import { Edit, Save, X, User, Mail, Phone } from 'lucide-react';
import { updateFamily } from '@/lib/actions/families';
import { useRouter } from 'next/navigation';

interface EditableFamilyInfoProps {
  family: {
    id: string;
    tutor_name: string;
    tutor_email?: string;
    tutor_phone?: string;
    tutor_cedula?: string;
    secondary_email?: string | null;
  };
}

export function EditableFamilyInfo({ family }: EditableFamilyInfoProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    tutor_name: family.tutor_name || '',
    tutor_email: family.tutor_email || '',
    tutor_phone: family.tutor_phone || '',
    tutor_cedula: family.tutor_cedula || '',
    secondary_email: family.secondary_email || '',
  });

  const handleSave = async () => {
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
          setIsEditing(false);
          setTimeout(() => {
            router.refresh();
            setSuccess(false);
          }, 2000);
        }
      } catch (err: any) {
        setError(err.message || 'Error al actualizar la familia');
      }
    });
  };

  const handleCancel = () => {
    setFormData({
      tutor_name: family.tutor_name || '',
      tutor_email: family.tutor_email || '',
      tutor_phone: family.tutor_phone || '',
      tutor_cedula: family.tutor_cedula || '',
      secondary_email: family.secondary_email || '',
    });
    setIsEditing(false);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="h-6 w-6" />
          Información del Tutor
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2 btn-primary shadow-lg shadow-blue-500/30"
          >
            <Edit size={18} />
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="px-4 py-2 rounded-xl font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <X size={18} />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 flex items-center gap-2 btn-primary shadow-lg shadow-blue-500/30"
            >
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">✅ Datos actualizados exitosamente</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-l-4 border-amber-500">
          <p className="text-xs font-semibold text-gray-600 mb-1">👤 Nombre Completo</p>
          {isEditing ? (
            <input
              type="text"
              value={formData.tutor_name}
              onChange={(e) => setFormData({ ...formData, tutor_name: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
            />
          ) : (
            <p className="text-lg font-bold text-gray-900">{family.tutor_name}</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
          <p className="text-xs font-semibold text-gray-600 mb-1">🆔 Cédula</p>
          {isEditing ? (
            <input
              type="text"
              value={formData.tutor_cedula}
              onChange={(e) => setFormData({ ...formData, tutor_cedula: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
            />
          ) : (
            <p className="text-lg font-bold text-gray-900">{family.tutor_cedula || 'Sin cédula'}</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold text-gray-600">Email Principal</p>
          </div>
          {isEditing ? (
            <input
              type="email"
              value={formData.tutor_email}
              onChange={(e) => setFormData({ ...formData, tutor_email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
            />
          ) : (
            <p className="text-lg font-bold text-gray-900">{family.tutor_email || 'Sin email'}</p>
          )}
        </div>

        {family.secondary_email && (
          <div className="bg-gradient-to-br from-cyan-50 to-sky-50 p-4 rounded-xl border-l-4 border-cyan-500">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-cyan-600" />
              <p className="text-xs font-semibold text-gray-600">Email Secundario</p>
            </div>
            {isEditing ? (
              <input
                type="email"
                value={formData.secondary_email}
                onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-gray-900">{family.secondary_email}</p>
            )}
          </div>
        )}

        <div className={`bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500 ${!family.secondary_email ? 'md:col-span-2' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <Phone className="h-4 w-4 text-green-600" />
            <p className="text-xs font-semibold text-gray-600">
              Teléfono <span className="text-blue-600">(Para Yappy)</span>
            </p>
          </div>
          {isEditing ? (
            <div>
              <input
                type="tel"
                value={formData.tutor_phone}
                onChange={(e) => setFormData({ ...formData, tutor_phone: e.target.value })}
                placeholder="64795352"
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
              />
              <p className="mt-1 text-xs text-gray-600">Número de 8 dígitos registrado en Yappy. Se usará para todos los jugadores de esta familia.</p>
            </div>
          ) : (
            <p className="text-lg font-bold text-gray-900">{family.tutor_phone || 'Sin teléfono'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

