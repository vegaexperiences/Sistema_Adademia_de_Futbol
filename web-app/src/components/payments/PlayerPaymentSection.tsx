'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, DollarSign, Plus, X, Calendar, ArrowDownCircle, ArrowUpCircle, AlertCircle, CheckCircle, TrendingUp, TrendingDown, FileText, ExternalLink, Edit } from 'lucide-react';
import { createPayment, autoLinkUnlinkedPaymentsForPlayer } from '@/lib/actions/payments';
import type { MonthlyCharge, PlayerAccountBalance } from '@/lib/actions/monthly-charges';
import PaymentHistory from './PaymentHistory';
import { PagueloFacilPaymentButton } from './PagueloFacilPaymentButton';
import { YappyPaymentButton } from './YappyPaymentButton';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { UpdatePaymentAmountModal } from './UpdatePaymentAmountModal';
import { checkIsAdmin } from '@/lib/actions/permissions';

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  payment_date: string;
  month_year: string | null;
  notes: string | null;
  proof_url?: string | null;
}

interface PlayerPaymentSectionProps {
  playerId: string;
  suggestedAmount: number;
  payments: Payment[];
  playerName?: string;
  charges: MonthlyCharge[];
  accountBalance: PlayerAccountBalance;
}

export function PlayerPaymentSection({ playerId, suggestedAmount, payments, playerName, charges, accountBalance }: PlayerPaymentSectionProps) {
  const router = useRouter();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    amount: suggestedAmount.toString(),
    payment_type: 'monthly' as 'enrollment' | 'monthly' | 'custom',
    payment_method: 'cash' as 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);
  const [viewMode, setViewMode] = useState<'account' | 'history'>('account');
  const [isAdmin, setIsAdmin] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedPaymentAmount, setSelectedPaymentAmount] = useState<number>(0);

  // Check if user is admin on mount
  useEffect(() => {
    checkIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  const handleUpdateAmount = (paymentId: string, currentAmount: number) => {
    setSelectedPaymentId(paymentId);
    setSelectedPaymentAmount(currentAmount);
    setUpdateModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-PA', { year: 'numeric', month: 'long' });
  };

  const getPaymentTypeLabel = (paymentType: string | null | undefined) => {
    const labels: Record<string, string> = {
      'enrollment': 'Matrícula',
      'monthly': 'Mensualidad',
      'custom': 'Personalizado',
      'Matrícula': 'Matrícula',
    };
    return paymentType ? (labels[paymentType] || paymentType) : 'Pago';
  };

  // Auto-link unlinked payments when component mounts or payments change
  useEffect(() => {
    // Only try to auto-link if we have no payments (might indicate unlinked payments exist)
    if (payments.length === 0 && !autoLinking) {
      setAutoLinking(true);
      autoLinkUnlinkedPaymentsForPlayer(playerId)
        .then((result) => {
          if (result.success && result.linked && result.linked > 0) {
            console.log('[PlayerPaymentSection] Auto-linked payments, refreshing...', result);
            router.refresh();
          }
          setAutoLinking(false);
        })
        .catch((error) => {
          console.error('[PlayerPaymentSection] Error auto-linking payments:', error);
          setAutoLinking(false);
        });
    }
  }, [playerId, payments.length, router, autoLinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    // If PagueloFacil is selected, the payment will be handled by PagueloFacilPaymentButton
    // which redirects to Paguelo Fácil's secure page. The callback will handle the payment creation.
    if (formData.payment_method === 'paguelofacil') {
      // Payment will be processed via redirect, no need to do anything here
      return;
    }

    // For other payment methods, proceed directly
    startTransition(async () => {
      try {
        await createPayment({
          player_id: playerId,
          amount: parseFloat(formData.amount),
          type: formData.payment_type,
          method: formData.payment_method,
          payment_date: formData.payment_date,
          month_year: formData.payment_type === 'monthly' ? formData.month_year : undefined,
          notes: formData.notes || undefined
        });

        setSuccess(true);
        setTimeout(() => {
          router.refresh();
          setShowPaymentForm(false);
          setFormData({
            amount: suggestedAmount.toString(),
            payment_type: 'monthly',
            payment_method: 'cash',
            payment_date: new Date().toISOString().split('T')[0],
            month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            notes: ''
          });
          setSuccess(false);
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Error al crear el pago');
      }
    });
  };


  // Combine charges and payments into a single transaction list
  // Filter out payments with amount 0
  const allTransactions = [
    ...charges.map(charge => ({
      id: charge.id,
      type: 'charge' as const,
      amount: charge.amount,
      date: charge.created_at,
      month_year: charge.month_year,
      status: charge.status,
      description: `Cargo mensual ${formatMonthYear(charge.month_year)}`,
    })),
    ...payments
      .filter(payment => parseFloat(payment.amount.toString()) > 0) // Filter out $0 payments
      .map(payment => ({
        id: payment.id,
        type: 'payment' as const,
        amount: payment.amount,
        date: payment.payment_date,
        month_year: payment.month_year,
        status: 'Approved' as const,
        description: payment.notes || getPaymentTypeLabel(payment.payment_type),
        method: payment.payment_method,
        proof_url: payment.proof_url,
        notes: payment.notes,
        payment_type: payment.payment_type, // Keep payment_type for label function
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Cuenta Bancaria del Jugador
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'account' ? 'history' : 'account')}
            className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {viewMode === 'account' ? 'Ver Historial' : 'Ver Cuenta'}
          </button>
          {!showPaymentForm && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Plus size={20} />
              Registrar Pago
            </button>
          )}
        </div>
      </div>

      {viewMode === 'account' && (
        <>
          {/* Account Balance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Charges */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-xl border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Cargos</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(accountBalance.totalCharges)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-600" />
              </div>
            </div>

            {/* Total Payments */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Pagos</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(accountBalance.totalPayments)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-green-600" />
              </div>
            </div>

            {/* Balance */}
            <div className={`p-4 rounded-xl border-l-4 ${
              accountBalance.balance <= 0
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-500'
                : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-500'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Balance</p>
                  <p className={`text-2xl font-bold ${
                    accountBalance.balance <= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(Math.abs(accountBalance.balance))}
                  </p>
                  {accountBalance.balance > 0 && (
                    <p className="text-xs text-red-600 mt-1">Debe</p>
                  )}
                  {accountBalance.balance < 0 && (
                    <p className="text-xs text-green-600 mt-1">Crédito</p>
                  )}
                </div>
                {accountBalance.isUpToDate ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`mb-6 p-4 rounded-xl border-l-4 ${
            accountBalance.isUpToDate
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          }`}>
            <div className="flex items-center gap-3">
              {accountBalance.isUpToDate ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-bold text-green-800">Al Día</p>
                    <p className="text-sm text-green-700">El estudiante está al corriente con sus pagos</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div className="flex-1">
                    <p className="font-bold text-red-800">Moroso</p>
                    <p className="text-sm text-red-700">
                      {accountBalance.overdueMonths.length > 0 && (
                        <>Meses vencidos: {accountBalance.overdueMonths.map(m => formatMonthYear(m)).join(', ')}</>
                      )}
                      {accountBalance.pendingCharges.length > 0 && accountBalance.overdueMonths.length === 0 && (
                        <>Tiene {accountBalance.pendingCharges.length} cargo(s) pendiente(s)</>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Info Message about Charges */}
          {charges.length === 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900 mb-1">No hay cargos generados</p>
                  <p className="text-sm text-blue-700">
                    Los cargos mensuales se generan automáticamente según la configuración de temporada. 
                    Puedes gestionarlos desde <strong>Configuraciones → Cargos Mensuales</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">✅ Cargos generados exitosamente</p>
            </div>
          )}

          {/* Entries and Exits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Entries (Charges) */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
                Entradas (Cargos)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {charges.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No hay cargos registrados</p>
                ) : (
                  charges.map((charge) => (
                    <div
                      key={charge.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        charge.status === 'Paid'
                          ? 'bg-green-50 border-green-500'
                          : charge.status === 'Overdue'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-yellow-50 border-yellow-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{formatMonthYear(charge.month_year)}</p>
                          <p className="text-xs text-gray-600">
                            {charge.status === 'Paid' ? 'Pagado' : charge.status === 'Overdue' ? 'Vencido' : 'Pendiente'}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-red-700">-{formatCurrency(charge.amount)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Exits (Payments) */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
                Salidas (Pagos)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {payments.filter(p => parseFloat(p.amount.toString()) > 0).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No hay pagos registrados</p>
                ) : (
                  payments
                    .filter(payment => parseFloat(payment.amount.toString()) > 0) // Filter out $0 payments
                    .map((payment) => (
                    <div
                      key={payment.id}
                      className="p-3 rounded-lg border-l-4 bg-green-50 border-green-500"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {getPaymentTypeLabel(payment.payment_type)}
                            {payment.month_year && ` - ${formatMonthYear(payment.month_year)}`}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString('es-PA')}
                            {payment.payment_method && ` • ${payment.payment_method}`}
                          </p>
                          {payment.proof_url && (
                            <div className="mt-2">
                              <DocumentPreview
                                url={payment.proof_url}
                                title={`Comprobante - ${getPaymentTypeLabel(payment.payment_type)}`}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-lg font-bold text-green-700 ml-2">+{formatCurrency(payment.amount)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Combined Transaction History */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Historial Completo</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No hay transacciones</p>
              ) : (
                allTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      transaction.type === 'charge'
                        ? transaction.status === 'Paid'
                          ? 'bg-green-50 border-green-500'
                          : transaction.status === 'Overdue'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        {transaction.type === 'charge' ? (
                          <ArrowDownCircle className="h-4 w-4 text-red-600 mt-1" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-green-600 mt-1" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {transaction.type === 'payment' 
                              ? (transaction as any).payment_type 
                                ? getPaymentTypeLabel((transaction as any).payment_type)
                                : transaction.description
                              : transaction.description
                            }
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(transaction.date).toLocaleDateString('es-PA')}
                            {transaction.month_year && ` • ${formatMonthYear(transaction.month_year)}`}
                            {transaction.type === 'payment' && transaction.method && ` • ${transaction.method}`}
                          </p>
                          {transaction.type === 'payment' && transaction.proof_url && (
                            <div className="mt-2">
                              <DocumentPreview
                                url={transaction.proof_url}
                                title={`Comprobante - ${transaction.description}`}
                              />
                            </div>
                          )}
                          {transaction.type === 'payment' && transaction.notes && transaction.notes.includes('http') && (
                            <div className="mt-2 space-y-2">
                              {(() => {
                                const urlMatch = transaction.notes.match(/https?:\/\/[^\s\)]+/);
                                const url = urlMatch ? urlMatch[0] : null;
                                if (url) {
                                  return (
                                    <>
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Abrir comprobante en nueva pestaña
                                      </a>
                                      <div>
                                        <DocumentPreview
                                          url={url}
                                          title={`Comprobante - ${transaction.description}`}
                                        />
                                      </div>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-lg font-bold whitespace-nowrap ${
                          transaction.type === 'charge' ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {transaction.type === 'charge' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </p>
                        {isAdmin && transaction.type === 'payment' && (
                          <button
                            onClick={() => handleUpdateAmount(transaction.id, transaction.amount)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Actualizar monto"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {viewMode === 'history' && (
        <PaymentHistory payments={payments} isAdmin={isAdmin} />
      )}

      {/* Update Payment Amount Modal */}
      {updateModalOpen && selectedPaymentId && (
        <UpdatePaymentAmountModal
          paymentId={selectedPaymentId}
          currentAmount={selectedPaymentAmount}
          onClose={() => {
            setUpdateModalOpen(false);
            setSelectedPaymentId(null);
            setSelectedPaymentAmount(0);
          }}
        />
      )}

      {showPaymentForm && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Registrar Nuevo Pago
            </h3>
            <button
              onClick={() => setShowPaymentForm(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {formData.payment_method === 'paguelofacil' ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-4">
                  <strong>Monto:</strong> ${parseFloat(formData.amount).toFixed(2)}<br />
                  <strong>Tipo:</strong> {formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago Personalizado'}
                </p>
              </div>
              <PagueloFacilPaymentButton
                amount={parseFloat(formData.amount)}
                description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - ${playerName || `Jugador ID: ${playerId}`}`}
                email=""
                orderId={`payment-${playerId}-${Date.now()}`}
                returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/paguelofacil/callback?type=payment&playerId=${playerId}&paymentType=${formData.payment_type}&amount=${formData.amount}&monthYear=${formData.month_year || ''}&notes=${encodeURIComponent(formData.notes || '')}`}
                customParams={{
                  type: 'payment',
                  playerId: playerId,
                  paymentType: formData.payment_type,
                  amount: formData.amount,
                  monthYear: formData.month_year || '',
                  notes: formData.notes || '',
                }}
                onError={(error) => setError('Error en Paguelo Fácil: ' + error)}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver y cambiar método de pago
              </button>
            </div>
          ) : formData.payment_method === 'yappy' ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-4">
                  <strong>Monto:</strong> ${parseFloat(formData.amount).toFixed(2)}<br />
                  <strong>Tipo:</strong> {formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago Personalizado'}
                </p>
              </div>
              <YappyPaymentButton
                amount={parseFloat(formData.amount)}
                description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - ${playerName || `Jugador ID: ${playerId}`}`}
                orderId={`payment-${playerId}-${Date.now()}`}
                returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/yappy/callback?type=payment&playerId=${playerId}&paymentType=${formData.payment_type}&amount=${formData.amount}&monthYear=${formData.month_year || ''}&notes=${encodeURIComponent(formData.notes || '')}`}
                customParams={{
                  type: 'payment',
                  playerId: playerId,
                  paymentType: formData.payment_type,
                  amount: formData.amount,
                  monthYear: formData.month_year || '',
                  notes: formData.notes || '',
                }}
                playerId={playerId}
                paymentType={formData.payment_type}
                monthYear={formData.month_year}
                notes={formData.notes}
                onSuccess={async (transactionId: string) => {
                  setSuccess(true);
                  setTimeout(() => {
                    router.refresh();
                    setShowPaymentForm(false);
                    setFormData({
                      amount: suggestedAmount.toString(),
                      payment_type: 'monthly',
                      payment_method: 'cash',
                      payment_date: new Date().toISOString().split('T')[0],
                      month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
                      notes: ''
                    });
                    setSuccess(false);
                  }, 1500);
                }}
                onError={(error) => setError('Error en Yappy: ' + error)}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver y cambiar método de pago
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💵 Monto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📋 Tipo de Pago
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="monthly">Mensualidad</option>
                  <option value="enrollment">Matrícula</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Month/Year for monthly payments */}
              {formData.payment_type === 'monthly' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    📅 Mes/Año
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.month_year}
                    onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💳 Método de Pago
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="yappy">Yappy</option>
                  <option value="paguelofacil">Paguelo Fácil</option>
                  <option value="card">Tarjeta</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📆 Fecha de Pago
                </label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📝 Notas (Opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  placeholder="Información adicional sobre el pago..."
                />
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Pago registrado exitosamente
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={isPending}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || success}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  {isPending ? 'Guardando...' : 'Guardar Pago'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!showPaymentForm && <PaymentHistory payments={payments} />}
    </div>
  );
}

