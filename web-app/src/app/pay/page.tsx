import { PaymentSearch } from '@/components/payment-portal/PaymentSearch';

export const dynamic = 'force-dynamic';

interface PayPageProps {
  searchParams: Promise<{ cedula?: string }>;
}

export default async function PayPage({ searchParams }: PayPageProps) {
  const params = await searchParams;
  const initialCedula = params.cedula || '';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PaymentSearch initialCedula={initialCedula} />
      </div>
    </div>
  );
}

