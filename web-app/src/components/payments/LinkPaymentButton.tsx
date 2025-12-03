'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader2 } from 'lucide-react';
import { LinkPaymentModal } from './LinkPaymentModal';

interface Payment {
  id: string;
  amount: number;
  type: string;
  method: string | null;
  payment_date: string;
  notes: string | null;
  status: string | null;
}

interface LinkPaymentButtonProps {
  payment: Payment;
}

export function LinkPaymentButton({ payment }: LinkPaymentButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
      >
        <Link2 className="h-4 w-4" />
        Vincular Pago
      </button>
      
      {showModal && (
        <LinkPaymentModal
          payment={payment}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

