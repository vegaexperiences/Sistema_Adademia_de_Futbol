'use client';

import { X, Mail, Clock, CheckCircle, Eye, MousePointerClick, XCircle, FileText, User, Tag } from 'lucide-react';
import { EmailHistoryItem } from '@/lib/actions/email-history';

interface EmailDetailModalProps {
  email: EmailHistoryItem;
  onClose: () => void;
}

export function EmailDetailModal({ email, onClose }: EmailDetailModalProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const timelineEvents = [
    { label: 'Creado', date: email.created_at, icon: Clock, color: 'text-gray-600' },
    { label: 'Enviado', date: email.sent_at, icon: Mail, color: 'text-blue-600' },
    { label: 'Entregado', date: email.delivered_at, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Abierto', date: email.opened_at, icon: Eye, color: 'text-blue-600' },
    { label: 'Click en enlace', date: email.clicked_at, icon: MousePointerClick, color: 'text-purple-600' },
    { label: 'Rebotado', date: email.bounced_at, icon: XCircle, color: 'text-red-600' },
  ].filter(event => event.date);

  const getStatusBadge = () => {
    switch (email.status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-medium text-sm">
            Pendiente
          </span>
        );
      case 'sent':
        return (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium text-sm">
            Enviado
          </span>
        );
      case 'failed':
        return (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium text-sm">
            Fallido
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalles del Correo
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {email.id.slice(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <User className="text-blue-600 dark:text-blue-400" size={18} />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Destinatario</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{email.to_email}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="text-purple-600 dark:text-purple-400" size={18} />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Estado</p>
              </div>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
          </div>

          {/* Subject and Template */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="text-gray-400 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Asunto</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{email.subject}</p>
                {email.template_name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Plantilla: <span className="font-medium">{email.template_name.replace(/_/g, ' ')}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          {timelineEvents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="text-blue-600" size={20} />
                Cronología de Eventos
              </h3>
              <div className="space-y-4">
                {timelineEvents.map((event, index) => {
                  const Icon = event.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${event.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{event.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {email.error_message && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <XCircle className="text-red-600 dark:text-red-400 mt-1" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-1">Mensaje de Error</p>
                  <p className="text-sm text-red-800 dark:text-red-200">{email.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          {email.metadata && Object.keys(email.metadata).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Metadata</h3>
              <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(email.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

