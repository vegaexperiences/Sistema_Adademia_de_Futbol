'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CreatePaymentModal } from './CreatePaymentModal';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category?: string | null;
}

interface CreatePaymentButtonProps {
  players: Player[];
  familyName: string;
}

export function CreatePaymentButton({ players, familyName }: CreatePaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
        }}
      >
        <Plus size={20} />
        Registrar Pago
      </button>
      
      {isOpen && (
        <CreatePaymentModal
          players={players}
          familyName={familyName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

