import { PlayerEmail } from '@/lib/actions/player-emails';
import { Mail, CheckCircle, Eye, XCircle, MousePointerClick, Clock } from 'lucide-react';

interface EmailHistoryCardProps {
  emails: PlayerEmail[];
}

export function EmailHistoryCard({ emails }: EmailHistoryCardProps) {
  if (emails.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Mail className="text-blue-600" size={24} />
          Historial de Correos
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No se han enviado correos a este jugador aún
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Mail className="text-blue-600" size={24} />
        Historial de Correos ({emails.length})
      </h3>

      <div className="space-y-3">
        {emails.map((email) => (
          <div
            key={email.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all bg-white dark:bg-gray-800"
          >
            {/* Subject */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white flex-1">
                {email.subject}
              </h4>
              {email.bounced_at && (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium flex items-center gap-1">
                  <XCircle size={12} />
                  Rebotado
                </span>
              )}
            </div>

            {/* Timestamps and Status */}
            <div className="flex flex-wrap gap-3 text-sm">
              {/* Sent */}
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Clock size={14} />
                <span>Enviado: {new Date(email.sent_at).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>

              {/* Delivered */}
              {email.delivered_at && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} />
                  <span>Entregado</span>
                </div>
              )}

              {/* Opened */}
              {email.opened_at && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Eye size={14} />
                  <span>Abierto</span>
                </div>
              )}

              {/* Clicked */}
              {email.clicked_at && (
                <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <MousePointerClick size={14} />
                  <span>Click en enlace</span>
                </div>
              )}
            </div>

            {/* Status badges */}
            <div className="flex gap-2 mt-3">
              {!email.delivered_at && !email.bounced_at && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                  Pendiente entrega
                </span>
              )}
              {email.delivered_at && !email.opened_at && !email.bounced_at && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                  Sin abrir
                </span>
              )}
              {email.opened_at && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
                  <Eye size={12} />
                  Leído
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ℹ️ Los estados se actualizan automáticamente cuando el destinatario interactúa con el correo.
        </p>
      </div>
    </div>
  );
}
