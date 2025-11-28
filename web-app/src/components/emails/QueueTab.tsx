import { Clock, CheckCircle, XCircle, Zap } from 'lucide-react';
import { ProcessQueueButton } from './ProcessQueueButton';
import { getQueueStatus } from '@/lib/actions/email-queue';

export async function QueueTab() {
  const queueStatus = await getQueueStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Zap className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Estado de la Cola
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Monitorea y gestiona la cola de correos pendientes
            </p>
          </div>
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
      <ProcessQueueButton 
        pending={queueStatus.pending} 
        remainingToday={queueStatus.remainingToday} 
      />

      {/* Info Card */}
      <div className="glass-card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">ℹ️ Información Importante</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Límite diario: <strong>300 correos</strong></li>
          <li>• La cola se procesa automáticamente respetando ese tope diario</li>
          <li>• Si hay más de 300 correos, se distribuyen en los días siguientes</li>
          <li>• Puedes procesar la cola manualmente con el botón superior</li>
        </ul>
      </div>
    </div>
  );
}

