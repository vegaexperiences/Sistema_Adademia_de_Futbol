'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category?: string | null;
  family_id?: string | null;
  tutor_email?: string | null;
}

interface CreatePaymentButtonProps {
  players: Player[];
  familyName: string;
  familyId: string;
  tutorEmail?: string | null;
}

export function CreatePaymentButton({ players, familyName, familyId, tutorEmail }: CreatePaymentButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // Store family data in sessionStorage to pass to the payment page
    sessionStorage.setItem('paymentFamilyData', JSON.stringify({
      familyId,
      familyName,
      tutorEmail,
      players: players.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        status: p.status,
        category: p.category,
        tutor_email: p.tutor_email
      }))
    }));
    router.push(`/dashboard/families/${familyId}/new-payment`);
  };

  return (
    <button
      onClick={handleClick}
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
