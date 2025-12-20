'use client';

import { useState, createContext, useContext } from 'react';
import { TrendingUp, CreditCard } from 'lucide-react';
import { ExternalIncomeForm } from './ExternalIncomeForm';
import { AdvancePaymentForm } from './AdvancePaymentForm';

interface FinancesFormsContextType {
  externalIncomeOpen: boolean;
  advancePaymentOpen: boolean;
  setExternalIncomeOpen: (open: boolean) => void;
  setAdvancePaymentOpen: (open: boolean) => void;
}

const FinancesFormsContext = createContext<FinancesFormsContextType | null>(null);

export function FinancesFormsProvider({ children }: { children: React.ReactNode }) {
  const [externalIncomeOpen, setExternalIncomeOpen] = useState(false);
  const [advancePaymentOpen, setAdvancePaymentOpen] = useState(false);

  return (
    <FinancesFormsContext.Provider
      value={{
        externalIncomeOpen,
        advancePaymentOpen,
        setExternalIncomeOpen,
        setAdvancePaymentOpen,
      }}
    >
      {children}
    </FinancesFormsContext.Provider>
  );
}

export function FinancesActionButtons() {
  const context = useContext(FinancesFormsContext);
  if (!context) return null;

  const { externalIncomeOpen, advancePaymentOpen, setExternalIncomeOpen, setAdvancePaymentOpen } = context;

  return (
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
  );
}

export function FinancesInlineForms() {
  const context = useContext(FinancesFormsContext);
  if (!context) return null;

  const { externalIncomeOpen, advancePaymentOpen, setExternalIncomeOpen, setAdvancePaymentOpen } = context;

  return (
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
  );
}



