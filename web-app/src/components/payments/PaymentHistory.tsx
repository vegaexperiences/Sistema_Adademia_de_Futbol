'use client';

import { useState } from 'react';
import { DollarSign, Calendar, CreditCard, FileText, ExternalLink, Edit } from 'lucide-react';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { UpdatePaymentAmountModal } from './UpdatePaymentAmountModal';

interface Payment {
  id: string;
  amount: number;
  type?: string; // Use 'type' to match database schema
  method?: string | null; // Use 'method' to match database schema
  payment_type?: string; // Legacy field for backward compatibility
  payment_method?: string | null; // Legacy field for backward compatibility
  payment_date: string;
  month_year: string | null;
  notes: string | null;
  proof_url?: string | null;
  players?: {
    first_name: string;
    last_name: string;
  };
}

interface PaymentHistoryProps {
  payments: Payment[];
  showPlayerName?: boolean;
  isAdmin?: boolean;
}

export default function PaymentHistory({ payments, showPlayerName = false, isAdmin = false }: PaymentHistoryProps) {
  const [filter, setFilter] = useState<string>('all');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedPaymentAmount, setSelectedPaymentAmount] = useState<number>(0);

  const handleUpdateAmount = (paymentId: string, currentAmount: number) => {
    setSelectedPaymentId(paymentId);
    setSelectedPaymentAmount(currentAmount);
    setUpdateModalOpen(true);
  };
  
  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    const paymentType = p.type || p.payment_type; // Support both field names
    return paymentType === filter;
  });
  
  const total = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  
  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'enrollment': 'Matrícula',
      'monthly': 'Mensualidad',
      'custom': 'Personalizado'
    };
    return labels[type] || type;
  };
  
  const getPaymentMethodLabel = (method: string | null) => {
    if (method === 'paguelofacil') return '💳 Paguelo Fácil';
    if (!method) return 'N/A';
    const labels: Record<string, string> = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'yappy': 'Yappy',
      'card': 'Tarjeta',
      'other': 'Otro'
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            Historial de Pagos
          </h3>
          <p className="text-sm text-gray-600">
            {filteredPayments.length} {filteredPayments.length === 1 ? 'pago' : 'pagos'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all border ${
              filter === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md'
                : 'bg-white border-gray-200 text-[#6b7280] hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('monthly')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all border ${
              filter === 'monthly'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md'
                : 'bg-white border-gray-200 text-[#6b7280] hover:bg-gray-50'
            }`}
          >
            Mensualidades
          </button>
          <button
            onClick={() => setFilter('enrollment')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all border ${
              filter === 'enrollment'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md'
                : 'bg-white border-gray-200 text-[#6b7280] hover:bg-gray-50'
            }`}
          >
            Matrículas
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-600">Total Pagado</p>
            <p className="text-3xl font-bold text-gray-900">${total.toFixed(2)}</p>
          </div>
          <DollarSign className="h-10 w-10 text-green-600" />
        </div>
      </div>

      {/* Payments list */}
      <div className="space-y-3">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${
                      (payment.type || payment.payment_type) === 'enrollment' 
                        ? 'gradient-orange'
                        : (payment.type || payment.payment_type) === 'monthly'
                        ? 'gradient-blue'
                        : 'gradient-purple'
                    }`}>
                      {getPaymentTypeLabel(payment.type || payment.payment_type || 'custom')}
                    </span>
                    {payment.month_year && (
                      <span className="text-xs font-semibold text-gray-600">
                        📅 {payment.month_year}
                      </span>
                    )}
                  </div>
                  
                  {showPlayerName && payment.players && (
                    <p className="text-sm font-bold text-gray-900 mb-1">
                      {payment.players.first_name} {payment.players.last_name}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700">
                        {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700">
                        {getPaymentMethodLabel(payment.method || payment.payment_method || null)}
                      </span>
                    </div>
                  </div>
                  
                  {payment.notes && (
                    <div className="mt-2 flex items-start gap-1">
                      <FileText className="h-4 w-4 text-gray-600 mt-0.5" />
                      <p className="text-xs text-gray-600 italic">
                        {payment.notes}
                      </p>
                    </div>
                  )}
                  
                  {/* Show proof URL if available or extract from notes */}
                  {(payment.proof_url || (payment.notes && payment.notes.includes('http'))) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold text-gray-700">Comprobante de Pago</span>
                      </div>
                      <div className="space-y-2">
                        {payment.proof_url ? (
                          <>
                            <a
                              href={payment.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir comprobante en nueva pestaña
                            </a>
                            <div>
                              <DocumentPreview
                                url={payment.proof_url}
                                title="Comprobante de Pago"
                              />
                            </div>
                          </>
                        ) : payment.notes && (() => {
                          const urlMatch = payment.notes.match(/https?:\/\/[^\s\)]+/);
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
                                    title="Comprobante de Pago"
                                  />
                                </div>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-right flex items-center gap-3">
                  <p className="text-2xl font-bold text-gray-900">
                    ${parseFloat(payment.amount.toString()).toFixed(2)}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => handleUpdateAmount(payment.id, parseFloat(payment.amount.toString()))}
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
        ) : (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600">
              No hay pagos registrados
            </p>
          </div>
        )}
      </div>

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
    </div>
  );
}
