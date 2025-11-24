import { getEmailTemplates } from '@/lib/actions/email-templates';
import { getQueueStatus, processEmailQueue } from '@/lib/actions/email-queue';
import { Mail, Send, Clock, CheckCircle, XCircle, Zap } from 'lucide-react';
import Link from 'next/link';

export default async function EmailsPage() {
  const templates = await getEmailTemplates();
  const queueStatus = await getQueueStatus();

  async function runQueue() {
    'use server';
    await processEmailQueue();
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Sistema de Correos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona plantillas, cola de envío y comunicaciones masivas
            </p>
          </div>
          <Mail size={40} className="text-blue-600" />
        </div>
      </div>

      {/* Queue Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStatus.pending}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enviados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStatus.sent}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fallidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStatus.failed}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Zap className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hoy / Límite</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {queueStatus.todaySent} / {queueStatus.dailyLimit}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Process Queue Button */}
      {queueStatus.pending > 0 && queueStatus.remainingToday > 0 && (
        <form action={runQueue}>
          <button
            type="submit"
            className="w-full glass-card p-4 hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg font-bold text-blue-600 dark:text-blue-400"
          >
            <Send size={24} />
            Procesar Cola de Correos ({Math.min(queueStatus.pending, queueStatus.remainingToday)} correos)
          </button>
        </form>
      )}

      {/* Templates List */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">📧</span>
          Plantillas de Correo
        </h2>

        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-white dark:bg-gray-800"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">
                    {template.name.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.subject}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {template.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Activa
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/settings/emails/edit/${template.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">ℹ️ Información Importante</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Límite diario: <strong>98 correos</strong></li>
          <li>• Los correos en cola se enviarán automáticamente respetando el límite</li>
          <li>• Si hay más de 98 correos, se distribuirán en varios días</li>
          <li>• Puedes procesar la cola manualmente con el botón superior</li>
        </ul>
      </div>
    </div>
  );
}
