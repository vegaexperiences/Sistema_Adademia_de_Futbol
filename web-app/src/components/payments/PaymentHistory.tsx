'use client';

import { useState } from 'react';
import { DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  payment_date: string;
  month_year: string | null;
  notes: string | null;
  players?: {
    first_name: string;
    last_name: string;
  };
}

interface PaymentHistoryProps {
  payments: Payment[];
  showPlayerName?: boolean;
}

export default function PaymentHistory({ payments, showPlayerName = false }: PaymentHistoryProps) {
  const [filter, setFilter] = useState<string>('all');
  
  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    return p.payment_type === filter;
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Historial de Pagos
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredPayments.length} {filteredPayments.length === 1 ? 'pago' : 'pagos'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all border ${
              filter === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-[#6b7280] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('monthly')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all border ${
              filter === 'monthly'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-[#6b7280] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Mensualidades
          </button>
          <button
            onClick={() => setFilter('enrollment')}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all border ${
              filter === 'enrollment'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-[#6b7280] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Matrículas
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Pagado</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</p>
          </div>
          <DollarSign className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Payments list */}
      <div className="space-y-3">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-bold" style={{
                      background: payment.payment_type === 'enrollment' 
                        ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                        : payment.payment_type === 'monthly'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}>
                      {getPaymentTypeLabel(payment.payment_type)}
                    </span>
                    {payment.month_year && (
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        📅 {payment.month_year}
                      </span>
                    )}
                  </div>
                  
                  {showPlayerName && payment.players && (
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      {payment.players.first_name} {payment.players.last_name}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </span>
                    </div>
                  </div>
                  
                  {payment.notes && (
                    <div className="mt-2 flex items-start gap-1">
                      <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        {payment.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${parseFloat(payment.amount.toString()).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No hay pagos registrados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
