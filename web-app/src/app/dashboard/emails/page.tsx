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
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2 sm:gap-3">
              <Mail className="text-blue-600 sm:w-8 sm:h-8" size={24} />
              Sistema de Correos
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Gestiona plantillas, cola de envío, historial y comunicaciones masivas
            </p>
          </div>
        </div>
        
        {/* Daily Limit Statistics */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
              <p className="text-xs font-semibold text-gray-600 mb-1">📊 Correos Enviados Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {queueStatus.todaySent}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                de {queueStatus.dailyLimit} permitidos
              </p>
            </div>
            
            <div className={`p-4 rounded-xl border-l-4 ${
              queueStatus.remainingToday > 50
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-500'
                : queueStatus.remainingToday > 0
                ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-500'
                : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-500'
            }`}>
              <p className="text-xs font-semibold text-gray-600 mb-1">📮 Restantes Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {queueStatus.remainingToday}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {queueStatus.remainingToday === 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle size={12} />
                    Límite alcanzado
                  </span>
                )}
                {queueStatus.remainingToday > 0 && queueStatus.remainingToday <= 50 && (
                  <span className="text-yellow-600">
                    Casi al límite
                  </span>
                )}
                {queueStatus.remainingToday > 50 && (
                  <span className="text-green-600">
                    Disponible
                  </span>
                )}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
              <p className="text-xs font-semibold text-gray-600 mb-1">⏳ En Cola</p>
              <p className="text-2xl font-bold text-gray-900">
                {queueStatus.pending}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {queueStatus.pending > 0 && queueStatus.remainingToday === 0 && (
                  <span className="text-yellow-600">
                    Se enviarán mañana
                  </span>
                )}
                {queueStatus.pending === 0 && (
                  <span className="text-gray-500">
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

