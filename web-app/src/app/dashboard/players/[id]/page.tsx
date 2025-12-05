import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { User, Calendar, Mail, Phone, FileText, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { getPlayerPayments, calculateMonthlyFee } from '@/lib/actions/payments';
import { PlayerPaymentSection } from '@/components/payments/PlayerPaymentSection';
import PlayerManagement from '@/components/payments/PlayerManagement';
import { PlayerEmailHistory } from '@/components/emails/PlayerEmailHistory';
import { getPlayerCategory, getCategoryColor, calculateAge } from '@/lib/utils/player-category';
import { PagueloFacilSuccessHandler } from '@/components/payments/PagueloFacilSuccessHandler';
import { EditPlayerModal } from '@/components/players/EditPlayerModal';

export default async function PlayerProfilePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Get player data with family info
  const { data: player } = await supabase
    .from('players')
    .select(`
      *,
      families (
        tutor_name,
        tutor_email,
        tutor_phone,
        tutor_cedula,
        tutor_cedula_url
      )
    `)
    .eq('id', id)
    .single();

  if (!player) {
    notFound();
  }

  // Calculate age using utility
  const age = player.birth_date ? calculateAge(player.birth_date) : null;
  
  // Get player category (normalize gender format)
  const normalizedGender = player.gender === 'M' || player.gender === 'Masculino' ? 'Masculino' : 'Femenino';
  const category = getPlayerCategory(player.birth_date, normalizedGender);
  const categoryColor = getCategoryColor(category);

  // Get payments
  const payments = await getPlayerPayments(id);
  
  // Calculate suggested monthly fee
  const suggestedFee = await calculateMonthlyFee(id);

  // Get family ID for email history filtering
  const familyId = player.family_id || null;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PagueloFacilSuccessHandler />
      {/* Back Button */}
      <Link 
        href="/dashboard/players"
        className="inline-flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 transition-colors touch-manipulation min-h-[44px]"
      >
        <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
        <span>Volver a Jugadores</span>
      </Link>

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="p-3 sm:p-4 rounded-xl icon-bg-purple">
              <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                   {player.first_name} {player.last_name}
                   <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-base md:text-lg font-bold ${categoryColor}`}>
                     {category}
                   </span>
                 </h1>
              <div className="flex gap-2 flex-wrap">
                {player.gender && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    player.gender === 'M' || player.gender === 'Masculino'
                      ? 'badge-gradient-male'
                      : 'badge-gradient-female'
                  }`}>
                    {(() => {
                      const isMale = player.gender === 'M' || player.gender === 'Masculino';
                      return isMale ? '👦 Masculino' : '👧 Femenino';
                    })()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <EditPlayerModal player={player} />
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              player.status === 'Active' 
                ? 'badge-gradient-active'
                : player.status === 'Scholarship'
                ? 'badge-gradient-scholarship'
                : 'badge-gradient-pending'
            }`}>
              {player.status === 'Active' ? '✅ Activo' : player.status === 'Scholarship' ? '🎓 Becado' : '⏳ Pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="h-6 w-6" />
          Información Personal
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
            <p className="text-xs font-semibold text-gray-600 mb-1">📅 Fecha de Nacimiento</p>
            <p className="text-lg font-bold text-gray-900">
              {player.birth_date ? new Date(player.birth_date).toLocaleDateString('es-ES') : 'N/A'}
            </p>
            {age && <p className="text-sm text-gray-600 mt-1">{age} años</p>}
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
            <p className="text-xs font-semibold text-gray-600 mb-1">🆔 Cédula</p>
            <p className="text-lg font-bold text-gray-900">{player.cedula || 'Sin cédula'}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
            <p className="text-xs font-semibold text-gray-600 mb-1">📍 Dirección</p>
            <p className="text-lg font-bold text-gray-900">{player.address || 'Sin dirección'}</p>
          </div>
        </div>
      </div>

      {/* Tutor Info */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="h-6 w-6" />
          Información del Tutor
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-l-4 border-amber-500">
            <p className="text-xs font-semibold text-gray-600 mb-1">👤 Nombre</p>
            <p className="text-lg font-bold text-gray-900">
              {player.families?.tutor_name || player.tutor_name || 'Sin información'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold text-gray-600">Email</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {player.families?.tutor_email || player.tutor_email || 'Sin email'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-green-600" />
              <p className="text-xs font-semibold text-gray-600">Teléfono</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {player.families?.tutor_phone || player.tutor_phone || 'Sin teléfono'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
            <p className="text-xs font-semibold text-gray-600 mb-1">🆔 Cédula Tutor</p>
            <p className="text-lg font-bold text-gray-900">
              {player.families?.tutor_cedula || player.tutor_cedula || 'Sin cédula'}
            </p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Documentos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {player.cedula_front_url || player.cedula_back_url || player.families?.tutor_cedula_url ? (
            <>
              {player.cedula_front_url && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                  <p className="text-xs font-semibold text-gray-600 mb-3">📄 Cédula Jugador (Frente)</p>
                  <DocumentPreview url={player.cedula_front_url} title="Cédula Jugador (Frente)" />
                </div>
              )}
              {player.cedula_back_url && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
                  <p className="text-xs font-semibold text-gray-600 mb-3">📄 Cédula Jugador (Reverso)</p>
                  <DocumentPreview url={player.cedula_back_url} title="Cédula Jugador (Reverso)" />
                </div>
              )}
              {player.families?.tutor_cedula_url && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
                  <p className="text-xs font-semibold text-gray-600 mb-3">📄 Cédula Tutor (Frente)</p>
                  <DocumentPreview url={player.families.tutor_cedula_url} title="Cédula Tutor" />
                </div>
              )}
            </>
          ) : (
            <div className="col-span-3 text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-600">No hay documentos adjuntos</p>
            </div>
          )}
        </div>
      </div>

      {/* Player Management (Custom Fee & Status) */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Gestión del Jugador
        </h2>
        <PlayerManagement
          playerId={id}
          currentStatus={player.status}
          currentCustomFee={player.custom_monthly_fee}
          suggestedFee={suggestedFee}
        />
      </div>

      {/* Email History */}
      <PlayerEmailHistory playerId={id} familyId={familyId} />

      {/* Payment System */}
      <PlayerPaymentSection 
        playerId={id} 
        suggestedAmount={suggestedFee} 
        payments={payments}
        playerName={`${player.first_name} ${player.last_name}`}
      />
    </div>
  );
}
