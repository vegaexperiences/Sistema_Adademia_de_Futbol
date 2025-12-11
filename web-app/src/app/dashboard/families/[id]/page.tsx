import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Users, Mail, Phone, User, DollarSign, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { getPlayersPayments } from '@/lib/actions/payments';
import { getPlayerCategory } from '@/lib/utils/player-category';
import { AddSecondaryEmailButton } from '@/components/tutors/AddSecondaryEmailButton';
import { PaymentSection } from './PaymentSection';
import { EditableFamilyInfo } from '@/components/families/EditableFamilyInfo';

export default async function FamilyProfilePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createClient();
  const academyId = await getCurrentAcademyId();
  
  // Get family data with players
  let query = supabase
    .from('families')
    .select('*, players(*)')
    .eq('id', id);
  
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  
  const { data: family } = await query.single();
  
  // Ensure secondary_email is included in family data
  const familyWithSecondaryEmail = family ? {
    ...family,
    secondary_email: (family as any).secondary_email || null
  } : null;

  if (!family || !familyWithSecondaryEmail) {
    notFound();
  }

  // Filter to only show approved players (Active or Scholarship)
  // Also calculate/ensure category is set for each player
  const approvedPlayers = (family.players?.filter((p: any) => 
    p.status === 'Active' || p.status === 'Scholarship'
  ) || []).map((p: any) => {
    // If category is missing or is 'Pendiente', calculate it from birth date
    if (!p.category || p.category === 'Pendiente') {
      if (p.birth_date && p.gender) {
        // Normalize gender format
        const genderForCategory = p.gender === 'M' || p.gender === 'Masculino' ? 'Masculino' : 'Femenino';
        p.category = getPlayerCategory(p.birth_date, genderForCategory);
      } else {
        p.category = null;
      }
    }
    return p;
  });

  const playerCount = approvedPlayers.length;
  const activeCount = approvedPlayers.filter((p: any) => p.status === 'Active').length;
  const scholarshipCount = approvedPlayers.filter((p: any) => p.status === 'Scholarship').length;
  
  // Get all payments for approved family players only
  const playerIds = approvedPlayers.map((p: any) => p.id);
  const payments = await getPlayersPayments(playerIds);
  
  // Calculate total paid
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link 
        href="/dashboard/families"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} />
        Volver a Familias
      </Link>

      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl icon-bg-orange">
              <Users className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Familia {family.tutor_name}
              </h1>
              <p className="text-lg text-gray-600">
                {playerCount} {playerCount === 1 ? 'jugador' : 'jugadores'} registrados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl icon-bg-purple">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Total Jugadores</p>
              <p className="text-2xl font-bold text-gray-900">{playerCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl icon-bg-green">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}>
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Becados</p>
              <p className="text-2xl font-bold text-gray-900">{scholarshipCount}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Total Pagado</p>
              <p className="text-2xl font-bold text-gray-900">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tutor Info */}
      <div className="space-y-4">
        <EditableFamilyInfo family={familyWithSecondaryEmail} />
        <div className="flex justify-end">
          <AddSecondaryEmailButton 
            familyId={family.id} 
            currentSecondaryEmail={familyWithSecondaryEmail.secondary_email}
          />
        </div>
      </div>

      {/* Players List */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Jugadores de la Familia
        </h2>
        <div className="grid gap-4">
          {approvedPlayers && approvedPlayers.length > 0 ? (
            approvedPlayers.map((player: any) => (
              <Link
                key={player.id}
                href={`/dashboard/players/${player.id}`}
                className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-lg font-bold text-gray-900">
                        {player.first_name} {player.last_name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {player.category && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          color: '#1e3a8a'
                        }}>
                          📚 {player.category}
                        </span>
                      )}
                      {player.gender && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                          background: player.gender === 'M' || player.gender === 'Masculino'
                            ? 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)'
                            : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                          color: player.gender === 'M' || player.gender === 'Masculino' ? '#5b21b6' : '#be185d'
                        }}>
                          {(() => {
                            const isMale = player.gender === 'M' || player.gender === 'Masculino';
                            return isMale ? '👦 Masculino' : '👧 Femenino';
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-4" style={{
                    background: player.status === 'Active' 
                      ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                      : player.status === 'Scholarship'
                      ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                      : 'linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)',
                    color: player.status === 'Active' 
                      ? '#065f46'
                      : player.status === 'Scholarship'
                      ? '#1e3a8a'
                      : '#92400e'
                  }}>
                    {player.status === 'Active' ? '✅ Activo' : player.status === 'Scholarship' ? '🎓 Becado' : '⏳ Pendiente'}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-center text-gray-600 py-8">
              No hay jugadores en esta familia
            </p>
          )}
        </div>
      </div>

      {/* Payment History */}
      <PaymentSection
        players={approvedPlayers}
        payments={payments}
        familyName={family.tutor_name || 'Familia'}
        tutorEmail={family.tutor_email || null}
        playerCount={playerCount}
      />
    </div>
  );
}
