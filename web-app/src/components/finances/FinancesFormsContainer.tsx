'use client';

import { useState } from 'react';
import { TrendingUp, CreditCard } from 'lucide-react';
import { ExternalIncomeForm } from './ExternalIncomeForm';
import { AdvancePaymentForm } from './AdvancePaymentForm';

interface FinancesFormsContainerProps {
  renderButtons?: boolean;
  renderForms?: boolean;
}

export function FinancesFormsContainer({ renderButtons = true, renderForms = true }: FinancesFormsContainerProps = {}) {
  const [externalIncomeOpen, setExternalIncomeOpen] = useState(false);
  const [advancePaymentOpen, setAdvancePaymentOpen] = useState(false);

  return (
    <>
      {renderButtons && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => {
              setExternalIncomeOpen(!externalIncomeOpen);
              setAdvancePaymentOpen(false);
            }}
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
            onClick={() => {
              setAdvancePaymentOpen(!advancePaymentOpen);
              setExternalIncomeOpen(false);
            }}
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
      )}

      {renderForms && (
        <>
          {externalIncomeOpen && (
            <div className="w-full">
              <ExternalIncomeForm
                onClose={() => setExternalIncomeOpen(false)}
                onSuccess={() => setExternalIncomeOpen(false)}
              />
            </div>
          )}

          {advancePaymentOpen && (
            <div className="w-full">
              <AdvancePaymentForm
                onClose={() => setAdvancePaymentOpen(false)}
                onSuccess={() => setAdvancePaymentOpen(false)}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
