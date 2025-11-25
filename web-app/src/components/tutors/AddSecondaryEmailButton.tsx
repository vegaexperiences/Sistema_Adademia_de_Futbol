'use client';

import { useState, useTransition } from 'react';
import { Plus, Mail } from 'lucide-react';
import { updateSecondaryEmail } from '@/lib/actions/tutors';
import { useRouter } from 'next/navigation';

interface AddSecondaryEmailButtonProps {
  familyId: string;
  currentSecondaryEmail?: string | null;
}

export function AddSecondaryEmailButton({ familyId, currentSecondaryEmail }: AddSecondaryEmailButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(currentSecondaryEmail || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un email válido');
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateSecondaryEmail(familyId, email || null);
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
        setError(err.message || 'Error al actualizar el email secundario');
      }
    });
  };

  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              {currentSecondaryEmail ? 'Editar Email Secundario' : 'Agregar Email Secundario'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Secundario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Este email recibirá las comunicaciones junto con el email principal.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Email secundario {currentSecondaryEmail ? 'actualizado' : 'agregado'} exitosamente
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || success}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                }}
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
                    <Mail size={18} />
                    {currentSecondaryEmail ? 'Actualizar' : 'Agregar'}
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
      className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2"
      style={{
        background: currentSecondaryEmail 
          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        boxShadow: currentSecondaryEmail 
          ? '0 4px 15px rgba(59, 130, 246, 0.3)'
          : '0 4px 15px rgba(16, 185, 129, 0.3)'
      }}
    >
      <Plus size={18} />
      {currentSecondaryEmail ? 'Editar Email Secundario' : 'Agregar Email Secundario'}
    </button>
  );
}

