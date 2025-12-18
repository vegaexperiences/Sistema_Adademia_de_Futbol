import { PlayerAccountView } from '@/components/payment-portal/PlayerAccountView';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PayPlayerPageProps {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ success?: string }>;
}

export default async function PayPlayerPage({ params, searchParams }: PayPlayerPageProps) {
  const { playerId } = await params;
  const { success } = await searchParams;

  // Verify player exists and belongs to academy
  const supabase = await createClient();
  
  // Single-tenant: no academy check needed

  const { data: player, error } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              ¡Pago procesado exitosamente! El pago será verificado y aplicado a la cuenta.
            </p>
          </div>
        )}
        <PlayerAccountView playerId={playerId} />
      </div>
    </div>
  );
}

