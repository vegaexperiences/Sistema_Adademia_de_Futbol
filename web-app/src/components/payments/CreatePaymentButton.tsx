'use client';

import { Plus } from 'lucide-react';

interface CreatePaymentButtonProps {
  onClick: () => void;
}

export function CreatePaymentButton({ onClick }: CreatePaymentButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2 btn-success shadow-lg shadow-green-500/30 dark:shadow-green-500/20"
    >
      <Plus size={20} />
      Registrar Pago
    </button>
  );
}
