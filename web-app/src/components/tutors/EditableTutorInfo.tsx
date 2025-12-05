'use client';

import { useState, useTransition } from 'react';
import { Edit, Save, X, User, Mail, Phone } from 'lucide-react';
import { updateFamily } from '@/lib/actions/families';
import { updatePlayer } from '@/lib/actions/players';
import { useRouter } from 'next/navigation';

interface EditableTutorInfoProps {
  tutor: {
    id?: string; // Family ID if type is 'Family'
    name: string;
    email?: string;
    phone?: string;
    cedula?: string;
    secondary_email?: string | null;
    type: 'Family' | 'Individual';
    playerIds?: string[]; // For individual tutors, list of player IDs
  };
}

export function EditableTutorInfo({ tutor }: EditableTutorInfoProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: tutor.name || '',
    email: tutor.email || '',
    phone: tutor.phone || '',
    cedula: tutor.cedula || '',
    secondary_email: tutor.secondary_email || '',
  });

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!formData.name) {
      setError('El nombre del tutor es requerido');
      return;
    }

    startTransition(async () => {
      try {
        if (tutor.type === 'Family' && tutor.id) {
          // Update family
          const result = await updateFamily(tutor.id, {
            tutor_name: formData.name,
            tutor_email: formData.email || undefined,
            tutor_phone: formData.phone || undefined,
            tutor_cedula: formData.cedula || undefined,
            secondary_email: formData.secondary_email || null,
          });

          if (result.error) {
            setError(result.error);
            return;
          }
        } else if (tutor.type === 'Individual' && tutor.playerIds) {
          // Update all players with this tutor info
          const updatePromises = tutor.playerIds.map(playerId =>
            updatePlayer(playerId, {
              tutor_name: formData.name,
              tutor_email: formData.email || undefined,
              tutor_phone: formData.phone || undefined,
              tutor_cedula: formData.cedula || undefined,
            })
          );

          const results = await Promise.all(updatePromises);
          const errorResult = results.find(r => r.error);
          
          if (errorResult?.error) {
            setError(errorResult.error);
            return;
          }
        } else {
          setError('No se pudo identificar el tipo de tutor');
          return;
        }

        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => {
          router.refresh();
          setSuccess(false);
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Error al actualizar el tutor');
      }
    });
  };

  const handleCancel = () => {
    setFormData({
      name: tutor.name || '',
      email: tutor.email || '',
      phone: tutor.phone || '',
      cedula: tutor.cedula || '',
      secondary_email: tutor.secondary_email || '',
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
          Información de Contacto
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold text-gray-600">Email Principal</p>
          </div>
          {isEditing ? (
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
            />
          ) : (
            <p className="text-lg font-bold text-gray-900">{tutor.email || 'Sin email'}</p>
          )}
        </div>

        {tutor.secondary_email && (
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
              <p className="text-lg font-bold text-gray-900">{tutor.secondary_email}</p>
            )}
          </div>
        )}

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
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
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="64795352"
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
              />
              <p className="mt-1 text-xs text-gray-600">
                Número de 8 dígitos registrado en Yappy.
                {tutor.type === 'Family' && ' Se usará para todos los jugadores de esta familia.'}
                {tutor.type === 'Individual' && tutor.playerIds && ` Se usará para ${tutor.playerIds.length} jugador${tutor.playerIds.length > 1 ? 'es' : ''}.`}
              </p>
            </div>
          ) : (
            <p className="text-lg font-bold text-gray-900">{tutor.phone || 'Sin teléfono'}</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
          <p className="text-xs font-semibold text-gray-600 mb-1">🆔 Cédula</p>
          {isEditing ? (
            <input
              type="text"
              value={formData.cedula}
              onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold"
            />
          ) : (
            <p className="text-lg font-bold text-gray-900">{tutor.cedula || 'Sin cédula'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

