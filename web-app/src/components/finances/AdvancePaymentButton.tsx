'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { AdvancePaymentForm } from './AdvancePaymentForm';

export function AdvancePaymentButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-sm sm:text-base"
      >
        <CreditCard size={18} className="sm:w-5 sm:h-5" />
        <span>Pago Adelantado</span>
      </button>
      {isOpen && (
        <AdvancePaymentForm
          onClose={() => setIsOpen(false)}
          onSuccess={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

