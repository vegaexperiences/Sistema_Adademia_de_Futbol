'use client';

import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Pause, Play, X, RefreshCw } from 'lucide-react';
// Helper function to format dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};
import type { RecurringPaymentSubscription } from '@/lib/actions/recurring-payments';

interface RecurringPaymentsManagerProps {
  playerId?: string;
  familyId?: string;
  onSubscriptionUpdate?: () => void;
}

export function RecurringPaymentsManager({
  playerId,
  familyId,
  onSubscriptionUpdate,
}: RecurringPaymentsManagerProps) {
  const [subscriptions, setSubscriptions] = useState<RecurringPaymentSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, [playerId, familyId]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (playerId) params.append('playerId', playerId);
      if (familyId) params.append('familyId', familyId);
      params.append('status', 'active');

      const response = await fetch(`/api/payments/paguelofacil/recurring?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setSubscriptions(result.subscriptions || []);
      } else {
        setError(result.error || 'Error al cargar suscripciones');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (subscriptionId: string) => {
    try {
      setProcessing(subscriptionId);
      const response = await fetch('/api/payments/paguelofacil/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, status: 'paused' }),
      });

      const result = await response.json();
      if (result.success) {
        await loadSubscriptions();
        onSubscriptionUpdate?.();
      } else {
        alert(result.error || 'Error al pausar suscripción');
      }
    } catch (err: any) {
      alert(err.message || 'Error al pausar suscripción');
    } finally {
      setProcessing(null);
    }
  };

  const handleResume = async (subscriptionId: string) => {
    try {
      setProcessing(subscriptionId);
      const response = await fetch('/api/payments/paguelofacil/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, status: 'active' }),
      });

      const result = await response.json();
      if (result.success) {
        await loadSubscriptions();
        onSubscriptionUpdate?.();
      } else {
        alert(result.error || 'Error al reanudar suscripción');
      }
    } catch (err: any) {
      alert(err.message || 'Error al reanudar suscripción');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta suscripción recurrente?')) {
      return;
    }

    try {
      setProcessing(subscriptionId);
      const response = await fetch(`/api/payments/paguelofacil/recurring?subscriptionId=${subscriptionId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        await loadSubscriptions();
        onSubscriptionUpdate?.();
      } else {
        alert(result.error || 'Error al cancelar suscripción');
      }
    } catch (err: any) {
      alert(err.message || 'Error al cancelar suscripción');
    } finally {
      setProcessing(null);
    }
  };

  const getFrequencyLabel = (subscription: RecurringPaymentSubscription) => {
    if (subscription.frequency === 'monthly') {
      return 'Mensual';
    }
    if (subscription.frequency === 'custom' && subscription.customFrequencyDays) {
      return `Cada ${subscription.customFrequencyDays} días`;
    }
    return subscription.frequency;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>No hay suscripciones recurrentes activas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <div
          key={subscription.id}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  ${subscription.amount.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getFrequencyLabel(subscription)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  Próximo pago:{' '}
                  {formatDate(subscription.nextPaymentDate)}
                </span>
              </div>
              {subscription.endDate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Finaliza: {formatDate(subscription.endDate)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {subscription.status === 'active' ? (
                <button
                  onClick={() => handlePause(subscription.id)}
                  disabled={processing === subscription.id}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Pausar"
                >
                  <Pause className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              ) : (
                <button
                  onClick={() => handleResume(subscription.id)}
                  disabled={processing === subscription.id}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Reanudar"
                >
                  <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              )}
              <button
                onClick={() => handleCancel(subscription.id)}
                disabled={processing === subscription.id}
                className="p-2 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                title="Cancelar"
              >
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

