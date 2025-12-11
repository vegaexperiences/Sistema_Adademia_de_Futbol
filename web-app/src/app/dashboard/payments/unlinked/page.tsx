import { createClient } from '@/lib/supabase/server';
import { Link2, DollarSign, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { LinkPaymentButton } from '@/components/payments/LinkPaymentButton';

export default async function UnlinkedPaymentsPage() {
  const supabase = await createClient();
  
  // Get unlinked payments from the view
  const { data: unlinkedPayments, error } = await supabase
    .from('payments_needing_player_link')
    .select('*')
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching unlinked payments:', error);
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'N/A';
    const labels: Record<string, string> = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'ach': 'ACH',
      'yappy': 'Yappy',
      'paguelofacil': 'Paguelo Fácil',
      'card': 'Tarjeta',
      'other': 'Otro'
    };
    return labels[method] || method;
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'enrollment': 'Matrícula',
      'Matrícula': 'Matrícula',
      'monthly': 'Mensualidad',
      'custom': 'Personalizado'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-6">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Link2 className="h-6 w-6 sm:h-8 sm:w-8" />
              Pagos Sin Vincular
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Pagos que necesitan ser vinculados a un jugador
            </p>
          </div>
          <Link
            href="/dashboard/finances"
            className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            ← Volver a Finanzas
          </Link>
        </div>
      </div>

      {/* Info Alert */}
      {(!unlinkedPayments || unlinkedPayments.length === 0) ? (
        <div className="glass-card p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¡Todos los pagos están vinculados!
              </h3>
              <p className="text-gray-600">
                No hay pagos pendientes de vinculación en este momento.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-semibold text-gray-700">
                {unlinkedPayments.length} pago{unlinkedPayments.length !== 1 ? 's' : ''} sin vincular
              </p>
            </div>
          </div>

          {/* Payments List */}
          <div className="space-y-4">
            {unlinkedPayments.map((payment: any) => (
              <div
                key={payment.id}
                className="glass-card p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                  {/* Payment Info */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Monto</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${parseFloat(payment.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Fecha</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(payment.payment_date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Método</p>
                        <p className="text-sm font-bold text-gray-900">
                          {getPaymentMethodLabel(payment.method)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Link2 className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Tipo</p>
                        <p className="text-sm font-bold text-gray-900">
                          {getPaymentTypeLabel(payment.type)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <LinkPaymentButton payment={payment} />
                  </div>
                </div>

                {/* Notes */}
                {payment.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Notas</p>
                    <p className="text-sm text-gray-700 break-words">{payment.notes}</p>
                  </div>
                )}

                {/* Status */}
                <div className="mt-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    payment.status === 'Approved' 
                      ? 'bg-green-100 text-green-800' 
                      : payment.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {payment.status || 'Sin estado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

