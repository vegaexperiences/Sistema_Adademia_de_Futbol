import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { User, Calendar, Mail, Phone, FileText, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { getPlayerPayments, calculateMonthlyFee } from '@/lib/actions/payments';
import { PlayerPaymentSection } from '@/components/payments/PlayerPaymentSection';
import PlayerManagement from '@/components/payments/PlayerManagement';
import { EmailHistoryCard } from '@/components/players/EmailHistoryCard';
import { getPlayerEmailHistory } from '@/lib/actions/player-emails';
import { getPlayerCategory, getCategoryColor, calculateAge } from '@/lib/utils/player-category';

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
  
  // Get player category
  const category = getPlayerCategory(player.birth_date, player.gender);
  const categoryColor = getCategoryColor(category);

  // Get payments
  const payments = await getPlayerPayments(id);
  
  // Calculate suggested monthly fee
  const suggestedFee = await calculateMonthlyFee(id);

  // Get email history
  const emailHistory = await getPlayerEmailHistory(id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link 
        href="/dashboard/players"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        Volver a Jugadores
      </Link>

      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}>
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                   {player.first_name} {player.last_name}
                   <span className={`px-4 py-2 rounded-full text-lg font-bold ${categoryColor}`}>
                     {category}
                   </span>
                 </h1>
              <div className="flex gap-2 flex-wrap">
                {player.gender && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                    background: player.gender === 'M' 
                      ? 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)'
                      : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                    color: player.gender === 'M' ? '#5b21b6' : '#be185d'
                  }}>
                    {player.gender === 'M' ? '👦' : '👧'} {player.gender === 'M' ? 'Masculino' : 'Femenino'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="px-4 py-2 rounded-full text-sm font-bold" style={{
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
      </div>

      {/* Personal Info */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <User className="h-6 w-6" />
          Información Personal
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📅 Fecha de Nacimiento</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {player.birth_date ? new Date(player.birth_date).toLocaleDateString('es-ES') : 'N/A'}
            </p>
            {age && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{age} años</p>}
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🆔 Cédula</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{player.cedula || 'Sin cédula'}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📍 Dirección</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{player.address || 'Sin dirección'}</p>
          </div>
        </div>
      </div>

      {/* Tutor Info */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <User className="h-6 w-6" />
          Información del Tutor
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border-l-4 border-amber-500">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">👤 Nombre</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {player.families?.tutor_name || player.tutor_name || 'Sin información'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Email</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {player.families?.tutor_email || player.tutor_email || 'Sin email'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Teléfono</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {player.families?.tutor_phone || player.tutor_phone || 'Sin teléfono'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🆔 Cédula Tutor</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {player.families?.tutor_cedula || player.tutor_cedula || 'Sin cédula'}
            </p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Documentos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {player.cedula_front_url || player.cedula_back_url || player.families?.tutor_cedula_url ? (
            <>
              {player.cedula_front_url && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">📄 Cédula Jugador (Frente)</p>
                  <DocumentPreview url={player.cedula_front_url} title="Cédula Jugador (Frente)" />
                </div>
              )}
              {player.cedula_back_url && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">📄 Cédula Jugador (Reverso)</p>
                  <DocumentPreview url={player.cedula_back_url} title="Cédula Jugador (Reverso)" />
                </div>
              )}
              {player.families?.tutor_cedula_url && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">📄 Cédula Tutor (Frente)</p>
                  <DocumentPreview url={player.families.tutor_cedula_url} title="Cédula Tutor" />
                </div>
              )}
            </>
          ) : (
            <div className="col-span-3 text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No hay documentos adjuntos</p>
            </div>
          )}
        </div>
      </div>

      {/* Player Management (Custom Fee & Status) */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
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
      <EmailHistoryCard emails={emailHistory} />

      {/* Payment System */}
      <PlayerPaymentSection 
        playerId={id} 
        suggestedAmount={suggestedFee} 
        payments={payments}
      />
    </div>
  );
}
