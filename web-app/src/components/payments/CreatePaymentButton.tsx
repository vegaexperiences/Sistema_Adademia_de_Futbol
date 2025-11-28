'use client';

import { Plus } from 'lucide-react';

interface CreatePaymentButtonProps {
  onClick: () => void;
}

export function CreatePaymentButton({ onClick }: CreatePaymentButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2"
      style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
      }}
    >
      <Plus size={20} />
      Registrar Pago
    </button>
  );
}
