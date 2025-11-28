'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import PaymentHistory from '@/components/payments/PaymentHistory';
import { CreatePaymentButton } from '@/components/payments/CreatePaymentButton';
import { PaymentFormInline } from '@/components/payments/PaymentFormInline';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category?: string | null;
  tutor_email?: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  payment_date: string;
  month_year: string | null;
  notes: string | null;
  player_id?: string;
  player?: {
    first_name: string;
    last_name: string;
  };
}

interface PaymentSectionProps {
  players: Player[];
  payments: Payment[];
  familyName: string;
  tutorEmail?: string | null;
  playerCount: number;
}

export function PaymentSection({ players, payments, familyName, tutorEmail, playerCount }: PaymentSectionProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Gestión de Pagos
        </h2>
        {players.length > 0 && !showPaymentForm && (
          <CreatePaymentButton onClick={() => setShowPaymentForm(true)} />
        )}
      </div>
      
      {playerCount > 1 && (
        <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border-l-4 border-amber-500">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            💡 Descuento Familiar Aplicable
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Esta familia califica para el descuento familiar en la mensualidad del {playerCount > 2 ? 'tercer jugador en adelante' : 'segundo jugador en adelante'}.
          </p>
        </div>
      )}

      {showPaymentForm && (
        <PaymentFormInline
          players={players}
          familyName={familyName}
          tutorEmail={tutorEmail}
          onSuccess={() => {
            setShowPaymentForm(false);
            window.location.reload();
          }}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}
      
      {!showPaymentForm && <PaymentHistory payments={payments} showPlayerName={true} />}
    </div>
  );
}

