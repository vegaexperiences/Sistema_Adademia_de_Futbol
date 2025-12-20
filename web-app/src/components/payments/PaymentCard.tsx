'use client';

import { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { UpdatePaymentAmountModal } from './UpdatePaymentAmountModal';
import { checkIsAdmin } from '@/lib/actions/permissions';

interface PaymentCardProps {
  payment: {
    id: string;
    amount: number;
    payment_date: string;
    method?: string | null;
    payment_method?: string | null;
    type?: string;
    payment_type?: string;
    month_year?: string | null;
    proof_url?: string | null;
    notes?: string | null;
  };
  title: string;
  bgColor: string;
  borderColor: string;
  amountBgColor: string;
  amountTextColor: string;
}

export function PaymentCard({
  payment,
  title,
  bgColor,
  borderColor,
  amountBgColor,
  amountTextColor,
}: PaymentCardProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  useEffect(() => {
    checkIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  const paymentDate = new Date(payment.payment_date).toLocaleDateString('es-ES');
  const paymentMethod = payment.method || payment.payment_method || 'N/A';

  return (
    <>
      <div className={`bg-gradient-to-br ${bgColor} p-4 rounded-xl border-l-4 ${borderColor} relative`}>
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700">{title}</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${amountTextColor} ${amountBgColor} px-2 py-1 rounded`}>
              ${parseFloat(payment.amount.toString()).toFixed(2)}
            </span>
            {isAdmin && (
              <button
                onClick={() => setUpdateModalOpen(true)}
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Actualizar monto"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-600 mb-3 space-y-1">
          <p>📅 {paymentDate}</p>
          {payment.month_year && <p>📆 {payment.month_year}</p>}
          <p>💳 {paymentMethod}</p>
        </div>
        {payment.notes && (
          <div className="mt-2 mb-3">
            <p className="text-xs text-gray-600 italic">{payment.notes}</p>
          </div>
        )}
        {payment.proof_url && (
          <DocumentPreview
            url={payment.proof_url}
            title={`Comprobante ${title} - ${paymentDate}`}
          />
        )}
      </div>

      {/* Update Payment Amount Modal */}
      {updateModalOpen && (
        <UpdatePaymentAmountModal
          paymentId={payment.id}
          currentAmount={parseFloat(payment.amount.toString())}
          onClose={() => setUpdateModalOpen(false)}
        />
      )}
    </>
  );
}




