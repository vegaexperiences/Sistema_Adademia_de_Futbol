'use client';

import { PlayerEmail } from '@/lib/actions/player-emails';
import { Mail, CheckCircle, Eye, XCircle, MousePointerClick, Clock, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface EmailHistoryCardProps {
  emails: PlayerEmail[];
}

export function EmailHistoryCard({ emails }: EmailHistoryCardProps) {
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleUpdateStatuses = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/emails/update-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: emails.map(e => e.id)
        })
      });

      if (response.ok) {
        setLastUpdate(new Date());
        // Refresh the page after a short delay to show updated statuses
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert('Error al actualizar estados');
      }
    } catch (error) {
      console.error('Error updating email statuses:', error);
      alert('Error al actualizar estados');
    } finally {
      setUpdating(false);
    }
  };

  if (emails.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="text-blue-600" size={24} />
          Historial de Correos
        </h3>
        <p className="text-gray-500 text-center py-8">
          No se han enviado correos a este jugador aún
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Mail className="text-blue-600" size={24} />
        Historial de Correos ({emails.length})
      </h3>

      <div className="space-y-3">
        {emails.map((email) => (
          <div
            key={email.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-white"
          >
            {/* Subject */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="font-semibold text-gray-900 flex-1">
                {email.subject}
              </h4>
              {email.bounced_at && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium flex items-center gap-1">
                  <XCircle size={12} />
                  Rebotado
                </span>
              )}
            </div>

            {/* Timestamps and Status */}
            <div className="flex flex-wrap gap-3 text-sm">
              {/* Sent */}
              {email.sent_at ? (
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock size={14} />
                  <span>Enviado: {new Date(email.sent_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              ) : email.status === 'sent' ? (
                // Status is 'sent' but sent_at is null - this is a data issue
                <div className="flex items-center gap-1 text-orange-600">
                  <Clock size={14} />
                  <span>Enviado (sin fecha)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={14} />
                  <span>Estado: {email.status}</span>
                </div>
              )}

              {/* Delivered */}
              {email.delivered_at && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={14} />
                  <span>Entregado</span>
                </div>
              )}

              {/* Opened */}
              {email.opened_at && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Eye size={14} />
                  <span>Abierto</span>
                </div>
              )}

              {/* Clicked */}
              {email.clicked_at && (
                <div className="flex items-center gap-1 text-purple-600">
                  <MousePointerClick size={14} />
                  <span>Click en enlace</span>
                </div>
              )}
            </div>

            {/* Status badges */}
            <div className="flex gap-2 mt-3">
              {!email.delivered_at && !email.bounced_at && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  Pendiente entrega
                </span>
              )}
              {email.delivered_at && !email.opened_at && !email.bounced_at && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Sin abrir
                </span>
              )}
              {email.opened_at && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                  <Eye size={12} />
                  Leído
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            ℹ️ Los estados se actualizan automáticamente cuando el destinatario interactúa con el correo.
          </p>
          {lastUpdate && (
            <p className="text-xs text-blue-700">
              Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
            </p>
          )}
        </div>
        
        <button
          onClick={handleUpdateStatuses}
          disabled={updating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw size={16} className={updating ? 'animate-spin' : ''} />
          {updating ? 'Actualizando...' : 'Actualizar Estados de Correos'}
        </button>
      </div>
    </div>
  );
}
