'use client';

import { useState } from 'react';
import { TrendingUp, CreditCard } from 'lucide-react';
import { ExternalIncomeForm } from './ExternalIncomeForm';
import { AdvancePaymentForm } from './AdvancePaymentForm';

interface FinancesActionButtonsProps {
  onFormsChange?: (hasOpenForms: boolean) => void;
}

export function FinancesActionButtons({ onFormsChange }: FinancesActionButtonsProps) {
  const [externalIncomeOpen, setExternalIncomeOpen] = useState(false);
  const [advancePaymentOpen, setAdvancePaymentOpen] = useState(false);

  const handleExternalIncomeToggle = (open: boolean) => {
    setExternalIncomeOpen(open);
    setAdvancePaymentOpen(false);
    onFormsChange?.(open);
  };

  const handleAdvancePaymentToggle = (open: boolean) => {
    setAdvancePaymentOpen(open);
    setExternalIncomeOpen(false);
    onFormsChange?.(open);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
      <button
        onClick={() => handleExternalIncomeToggle(!externalIncomeOpen)}
        className={`px-4 py-2.5 min-h-[44px] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-sm sm:text-base whitespace-nowrap ${
          externalIncomeOpen 
            ? 'bg-emerald-700 active:bg-emerald-800' 
            : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
        }`}
      >
        <TrendingUp size={18} className="sm:w-5 sm:h-5" />
        <span>Nuevo Ingreso</span>
      </button>
      <button
        onClick={() => handleAdvancePaymentToggle(!advancePaymentOpen)}
        className={`px-4 py-2.5 min-h-[44px] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-sm sm:text-base whitespace-nowrap ${
          advancePaymentOpen 
            ? 'bg-green-700 active:bg-green-800' 
            : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
        }`}
      >
        <CreditCard size={18} className="sm:w-5 sm:h-5" />
        <span>Pago Adelantado</span>
      </button>
    </div>
  );
}

// Export state getters for use in parent component
export function useFinancesFormsState() {
  const [externalIncomeOpen, setExternalIncomeOpen] = useState(false);
  const [advancePaymentOpen, setAdvancePaymentOpen] = useState(false);

  return {
    externalIncomeOpen,
    advancePaymentOpen,
    setExternalIncomeOpen,
    setAdvancePaymentOpen,
  };
}
