'use client';

import { useState } from 'react';
import { updateCustomMonthlyFee, updatePlayerStatus } from '@/lib/actions/payments';
import { Edit, Save, X, Award } from 'lucide-react';

interface PlayerManagementProps {
  playerId: string;
  currentStatus: string;
  currentCustomFee: number | null;
  suggestedFee: number;
  onUpdate?: () => void;
}

export default function PlayerManagement({ 
  playerId, 
  currentStatus, 
  currentCustomFee, 
  suggestedFee,
  onUpdate 
}: PlayerManagementProps) {
  const [editingFee, setEditingFee] = useState(false);
  const [customFee, setCustomFee] = useState(currentCustomFee?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleSaveCustomFee = async () => {
    setLoading(true);
    try {
      const fee = customFee === '' ? null : parseFloat(customFee);
      await updateCustomMonthlyFee(playerId, fee);
      setEditingFee(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('Error al actualizar la mensualidad');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${currentStatus === 'Active' ? 'Becado' : 'Normal'}?`)) {
      return;
    }

    setLoading(true);
    try {
      const newStatus = currentStatus === 'Active' ? 'Scholarship' : 'Active';
      await updatePlayerStatus(playerId, newStatus);
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Custom Monthly Fee */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-500">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              💰 Mensualidad Personalizada
            </h3>
            <p className="text-sm text-gray-600">
              Mensualidad sugerida: ${suggestedFee.toFixed(2)}
            </p>
          </div>
          {!editingFee && (
            <button
              onClick={() => setEditingFee(true)}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Edit size={20} className="text-purple-600" />
            </button>
          )}
        </div>

        {editingFee ? (
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                placeholder="Dejar vacío para usar precio sugerido"
                className="w-full pl-8 pr-4 py-2 rounded-lg border-2 border-purple-200 bg-white text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingFee(false);
                  setCustomFee(currentCustomFee?.toString() || '');
                }}
                className="flex-1 px-4 py-2 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomFee}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Save size={18} />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-gray-900">
              {currentCustomFee !== null ? `$${currentCustomFee.toFixed(2)}` : 'Usando precio sugerido'}
            </p>
          </div>
        )}
      </div>

      {/* Status Toggle */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              🎓 Estado del Jugador
            </h3>
            <p className="text-sm text-gray-600">
              {currentStatus === 'Scholarship' 
                ? 'El jugador está becado (mensualidad $0)' 
                : 'El jugador paga mensualidad normal'}
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={loading}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 flex items-center gap-2 ${
              currentStatus === 'Scholarship' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
            }`}
          >
            <Award size={20} />
            {currentStatus === 'Scholarship' ? 'Cambiar a Normal' : 'Cambiar a Becado'}
          </button>
        </div>
      </div>
    </div>
  );
}
