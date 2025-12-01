import { getEmailHistory } from '@/lib/actions/email-history';
import { EmailHistoryManager } from '@/components/emails/EmailHistoryManager';
import { QueueTab } from '@/components/emails/QueueTab';
import { TemplatesTab } from '@/components/emails/TemplatesTab';
import { BroadcastTab } from '@/components/emails/BroadcastTab';
import { Mail, AlertCircle } from 'lucide-react';
import { EmailsTabs } from '@/components/emails/EmailsTabs';
import { getQueueStatus } from '@/lib/actions/email-queue';

type SearchParams = {
  tab?: string;
};

export default async function EmailsPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<SearchParams>).then === 'function'
      ? await searchParams
      : (searchParams as SearchParams | undefined);

  const activeTab = resolvedSearchParams?.tab || 'historial';

  // Fetch initial data for history tab
  const initialHistoryData =
    activeTab === 'historial'
      ? await getEmailHistory({}, { page: 1, limit: 50 })
      : { emails: [], total: 0, page: 1, totalPages: 0 };

  // Get queue status for daily limit statistics
  const queueStatus = await getQueueStatus();

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
              <Mail className="text-blue-600 sm:w-8 sm:h-8" size={24} />
              Sistema de Correos
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Gestiona plantillas, cola de envío, historial y comunicaciones masivas
            </p>
          </div>
        </div>
        
        {/* Daily Limit Statistics */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📊 Correos Enviados Hoy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {queueStatus.todaySent}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                de {queueStatus.dailyLimit} permitidos
              </p>
            </div>
            
            <div className={`p-4 rounded-xl border-l-4 ${
              queueStatus.remainingToday > 50
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-500'
                : queueStatus.remainingToday > 0
                ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-500'
                : 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-500'
            }`}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📮 Restantes Hoy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {queueStatus.remainingToday}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {queueStatus.remainingToday === 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle size={12} />
                    Límite alcanzado
                  </span>
                )}
                {queueStatus.remainingToday > 0 && queueStatus.remainingToday <= 50 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Casi al límite
                  </span>
                )}
                {queueStatus.remainingToday > 50 && (
                  <span className="text-green-600 dark:text-green-400">
                    Disponible
                  </span>
                )}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">⏳ En Cola</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {queueStatus.pending}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {queueStatus.pending > 0 && queueStatus.remainingToday === 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Se enviarán mañana
                  </span>
                )}
                {queueStatus.pending === 0 && (
                  <span className="text-gray-500 dark:text-gray-400">
                    Sin correos pendientes
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <EmailsTabs activeTab={activeTab} />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'historial' && (
          <EmailHistoryManager
            initialEmails={initialHistoryData.emails}
            initialTotal={initialHistoryData.total}
            initialPage={initialHistoryData.page}
            initialTotalPages={initialHistoryData.totalPages}
          />
        )}
        {activeTab === 'cola' && <QueueTab />}
        {activeTab === 'plantillas' && <TemplatesTab />}
        {activeTab === 'broadcast' && <BroadcastTab />}
      </div>
    </div>
  );
}

