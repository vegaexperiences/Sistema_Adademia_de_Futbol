import { getPendingPlayers } from '@/lib/actions/approvals';
import { getPendingTournamentRegistrations } from '@/lib/actions/tournaments';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CheckCircle, Trophy } from 'lucide-react';
import { getPlayerCategory, getCategoryColor } from '@/lib/utils/player-category';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { PlayerApprovalButtons, TournamentApprovalButtons } from '@/components/approvals/ApprovalButtons';

type PendingPlayer = Awaited<ReturnType<typeof getPendingPlayers>>[number];
type TournamentRegistration = Awaited<ReturnType<typeof getPendingTournamentRegistrations>>[number];
type PendingPayment = {
  id?: string | null;
  player_id: string | null;
  proof_url?: string | null;
  type?: string | null;
};

type SearchParams = {
  view?: string;
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams | undefined>;
}) {
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<SearchParams | undefined>).then === 'function'
      ? await searchParams
      : (searchParams as SearchParams | undefined);
  const pendingPlayers = await getPendingPlayers();
  const pendingTournaments = await getPendingTournamentRegistrations();
  const supabase = await createClient();
  const { data: pendingPaymentsData } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'Pending Approval')
    .order('created_at', { ascending: false });
  const pendingPayments: PendingPayment[] = Array.isArray(pendingPaymentsData)
    ? (pendingPaymentsData as PendingPayment[])
    : [];

  const view = resolvedSearchParams?.view === 'tournaments' ? 'tournaments' : 'players';
  const tabs = [
    { id: 'players', label: 'Solicitudes de Matrícula', count: pendingPlayers.length },
    { id: 'tournaments', label: 'Torneos', count: pendingTournaments.length },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Aprobaciones Pendientes</h1>
            <p className="text-gray-600 dark:text-gray-400">Revisa y aprueba solicitudes de matrícula y torneos</p>
          </div>
          <div className="flex gap-3">
            <span className="px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
              {pendingPlayers.length} Matrículas
            </span>
            <span className="px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg">
              {pendingTournaments.length} Torneos
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/dashboard/approvals?view=${tab.id}`}
              className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
                view === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border-transparent'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </Link>
          ))}
        </div>
      </div>

      {view === 'players' ? (
        <PlayerApprovals pendingPlayers={pendingPlayers} pendingPayments={pendingPayments} />
      ) : (
        <TournamentApprovals registrations={pendingTournaments} />
      )}
    </div>
  );
}

function PlayerApprovals({
  pendingPlayers,
  pendingPayments,
}: {
  pendingPlayers: PendingPlayer[];
  pendingPayments: PendingPayment[];
}) {
  return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">👤</span>
          Solicitudes de Matrícula
        </h2>
        
        {pendingPlayers.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No hay solicitudes de matrícula pendientes.</p>
          </div>
        ) : (
          <div className="grid gap-6">
          {pendingPlayers.map((player) => (
              <div key={player.id} className="glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-slide-up">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {player.first_name} {player.last_name}
                          </h3>
                          {(() => {
                            const category = getPlayerCategory(player.birth_date, player.gender);
                            const colorClass = getCategoryColor(category);
                          return <span className={`px-3 py-1 rounded-full text-sm font-bold ${colorClass}`}>{category}</span>;
                          })()}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {player.category && (
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                              color: '#1e3a8a',
                            }}
                          >
                              📚 {player.category}
                            </span>
                          )}
                          {player.gender && (
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                              background:
                                player.gender === 'M'
                                ? 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)'
                                : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                              color: player.gender === 'M' ? '#5b21b6' : '#be185d',
                            }}
                          >
                              {player.gender === 'M' ? '👦' : '👧'} {player.gender === 'M' ? 'Masculino' : 'Femenino'}
                            </span>
                          )}
                        </div>
                      </div>
                    <span
                      className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)',
                        color: '#92400e',
                        border: '2px solid #fbbf24',
                      }}
                    >
                        ⏳ PENDIENTE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📅 Fecha de Nacimiento</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {player.birth_date ? new Date(player.birth_date).toLocaleDateString('es-ES') : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🆔 Cédula</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{player.cedula || 'Sin cédula'}</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border-l-4 border-amber-500 mb-4">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">👨‍👩‍👧‍👦 Información del Tutor</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {player.families?.tutor_name || player.tutor_name || 'Sin información'}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                      🆔 {player.families?.tutor_cedula || 'Sin cédula'} • 📧 {player.families?.tutor_email || player.tutor_email || 'Sin email'} • 📱{' '}
                      {player.families?.tutor_phone || player.tutor_phone || 'Sin teléfono'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">📄 Documentos</p>
                    <div className="space-y-3">
                        {(() => {
                          try {
                            const frontUrl = player.cedula_front_url || (player.notes ? JSON.parse(player.notes).doc_front : null);
                            const backUrl = player.cedula_back_url || (player.notes ? JSON.parse(player.notes).doc_back : null);
                            const tutorUrl = player.families?.tutor_cedula_url || (player.notes ? JSON.parse(player.notes).tutor_doc : null);

                          const playerPayments = (pendingPayments || []).filter(
                            (payment) => payment.player_id === player.id && payment.proof_url
                          );

                          const hasDocuments = frontUrl || backUrl || tutorUrl || playerPayments.length > 0;

                            return (
                              <>
                              {(frontUrl || backUrl) && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">👤 Documentos del Jugador</p>
                                  <div className="flex gap-2 flex-wrap">
                                {frontUrl && <DocumentPreview url={frontUrl} title="Cédula Jugador (Frente)" />}
                                {backUrl && <DocumentPreview url={backUrl} title="Cédula Jugador (Reverso)" />}
                                  </div>
                                </div>
                              )}

                              {tutorUrl && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">👨‍👩‍👧‍👦 Documentos del Tutor</p>
                                  <div className="flex gap-2 flex-wrap">
                                    <DocumentPreview url={tutorUrl} title="Cédula Tutor" />
                                  </div>
                                </div>
                              )}

                              {playerPayments.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">💳 Comprobantes de Pago</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {playerPayments.map((payment, idx) => {
                                      if (!payment.proof_url) return null;
                                      const key = payment.id ?? `${player.id}-payment-${idx}`;
                                      return (
                                        <DocumentPreview
                                          key={key}
                                          url={payment.proof_url}
                                          title={`Comprobante de Pago - ${payment.type ?? 'Pago'} (${idx + 1})`}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {!hasDocuments && <span className="text-gray-500 text-sm">Sin documentos adjuntos</span>}
                              </>
                            );
                        } catch {
                            return <span className="text-red-500 text-sm">Error al cargar documentos</span>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                <PlayerApprovalButtons playerId={player.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

function TournamentApprovals({ registrations }: { registrations: TournamentRegistration[] }) {
  return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">🏆</span>
        Solicitudes de Torneo
        </h2>

      {registrations.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No hay solicitudes de torneo pendientes.</p>
          </div>
        ) : (
          <div className="grid gap-6">
          {registrations.map((registration) => (
            <div key={registration.id} className="glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-slide-up">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                      <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{registration.team_name}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
                        <Trophy size={14} />
                        {registration.tournaments?.name || 'Torneo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Inscrito el {new Date(registration.created_at).toLocaleDateString('es-ES')}
                    </p>
                      </div>
                  <span className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
                    ⏳ Pendiente
                  </span>
                          </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">👤 Entrenador / Contacto</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{registration.coach_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📧 {registration.coach_email} • 📱 {registration.coach_phone}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📅 Detalles del torneo</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {registration.tournaments?.start_date
                        ? new Date(registration.tournaments.start_date).toLocaleDateString('es-ES')
                        : 'Fecha por confirmar'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📍 {registration.tournaments?.location || 'Lugar por confirmar'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">🏷️ Categoría: {registration.category}</p>
                  </div>
                </div>

                <TournamentApprovalButtons registrationId={registration.id} />
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
