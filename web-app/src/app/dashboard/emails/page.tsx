import { getEmailHistory } from '@/lib/actions/email-history';
import { EmailHistoryManager } from '@/components/emails/EmailHistoryManager';
import { QueueTab } from '@/components/emails/QueueTab';
import { TemplatesTab } from '@/components/emails/TemplatesTab';
import { BroadcastTab } from '@/components/emails/BroadcastTab';
import { Mail } from 'lucide-react';
import { EmailsTabs } from '@/components/emails/EmailsTabs';

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Mail className="text-blue-600" size={32} />
              Sistema de Correos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona plantillas, cola de envío, historial y comunicaciones masivas
            </p>
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

