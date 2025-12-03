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
  payment_method?: string | null;
  notes?: string | null;
  amount?: number | null;
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
    <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
      <div className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Aprobaciones Pendientes</h1>
            <p className="text-sm sm:text-base text-gray-600">Revisa y aprueba solicitudes de matrícula y torneos</p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
              {pendingPlayers.length} Matrículas
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg">
              {pendingTournaments.length} Torneos
            </span>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/dashboard/approvals?view=${tab.id}`}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl font-semibold text-sm sm:text-base transition-all border touch-manipulation ${
                view === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
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
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="p-2 bg-amber-100 rounded-lg text-amber-600">👤</span>
          Solicitudes de Matrícula
        </h2>
        
        {pendingPlayers.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-gray-600">No hay solicitudes de matrícula pendientes.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
          {pendingPlayers.map((player, index) => {
            // Check for potential duplicates by name
            const duplicateNames = pendingPlayers.filter(
              (p) => p.id !== player.id && 
              `${p.first_name} ${p.last_name}`.toLowerCase() === `${player.first_name} ${player.last_name}`.toLowerCase()
            );
            const isDuplicate = duplicateNames.length > 0;
            
            return (
              <div key={player.id} className="glass-card p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 animate-slide-up">
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        {isDuplicate && (
                          <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                            <p className="text-xs font-semibold text-yellow-800">
                              ⚠️ Posible duplicado: Existe otro jugador con el mismo nombre
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              ID: {player.id.substring(0, 8)}... | Fecha: {player.created_at ? new Date(player.created_at).toLocaleDateString('es-ES') : 'N/A'}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {player.first_name} {player.last_name}
                          </h3>
                          {(() => {
                            // Normalize gender format for getPlayerCategory
                            const normalizedGender = player.gender === 'M' || player.gender === 'Masculino' 
                              ? 'Masculino' 
                              : player.gender === 'F' || player.gender === 'Femenino' 
                              ? 'Femenino' 
                              : null;
                            if (!normalizedGender || !player.birth_date) {
                              return <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-200 text-gray-700">Pendiente</span>;
                            }
                            const category = getPlayerCategory(player.birth_date, normalizedGender);
                            const colorClass = getCategoryColor(category);
                            return <span className={`px-3 py-1 rounded-full text-sm font-bold ${colorClass}`}>{category}</span>;
                          })()}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {player.category && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold badge-gradient-scholarship">
                              📚 {player.category}
                            </span>
                          )}
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
                    <span className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap badge-gradient-pending border-2 border-orange-400">
                        ⏳ PENDIENTE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <p className="text-xs font-semibold text-gray-600 mb-1">📅 Fecha de Nacimiento</p>
                        <p className="text-lg font-bold text-gray-900">
                          {player.birth_date ? new Date(player.birth_date).toLocaleDateString('es-ES') : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
                        <p className="text-xs font-semibold text-gray-600 mb-1">🆔 Cédula</p>
                        <p className="text-lg font-bold text-gray-900">{player.cedula || 'Sin cédula'}</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-l-4 border-amber-500 mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2">👨‍👩‍👧‍👦 Información del Tutor</p>
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        {player.families?.tutor_name || player.tutor_name || 'Sin información'}
                      </p>
                      <p className="text-sm text-gray-700">
                      🆔 {player.families?.tutor_cedula || 'Sin cédula'} • 📧 {player.families?.tutor_email || player.tutor_email || 'Sin email'} • 📱{' '}
                      {player.families?.tutor_phone || player.tutor_phone || 'Sin teléfono'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
                      <p className="text-xs font-semibold text-gray-600 mb-3">📄 Documentos</p>
                    <div className="space-y-3">
                        {(() => {
                          try {
                            const frontUrl = player.cedula_front_url || (player.notes ? JSON.parse(player.notes).doc_front : null);
                            const backUrl = player.cedula_back_url || (player.notes ? JSON.parse(player.notes).doc_back : null);
                            const tutorUrl = player.families?.tutor_cedula_url || (player.notes ? JSON.parse(player.notes).tutor_doc : null);

                          const playerPayments = (pendingPayments || []).filter(
                            (payment) => payment.player_id === player.id
                          );

                          const hasDocuments = frontUrl || backUrl || tutorUrl || playerPayments.length > 0;

                            return (
                              <>
                              {(frontUrl || backUrl) && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-2">👤 Documentos del Jugador</p>
                                  <div className="flex gap-2 flex-wrap">
                                {frontUrl && <DocumentPreview url={frontUrl} title="Cédula Jugador (Frente)" />}
                                {backUrl && <DocumentPreview url={backUrl} title="Cédula Jugador (Reverso)" />}
                                  </div>
                                </div>
                              )}

                              {tutorUrl && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-2">👨‍👩‍👧‍👦 Documentos del Tutor</p>
                                  <div className="flex gap-2 flex-wrap">
                                    <DocumentPreview url={tutorUrl} title="Cédula Tutor" />
                                  </div>
                                </div>
                              )}

                              {playerPayments.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-2">💳 Información de Pago</p>
                                  <div className="space-y-3">
                                    {playerPayments.map((payment, idx) => {
                                      const key = payment.id ?? `${player.id}-payment-${idx}`;
                                      const paymentMethod = payment.payment_method || 'cash';
                                      const methodLabels: Record<string, string> = {
                                        cash: 'Efectivo',
                                        transfer: 'Transferencia',
                                        ach: 'ACH',
                                        yappy: 'Yappy Comercial',
                                        paguelofacil: 'Paguelo Fácil',
                                        other: 'Otro',
                                      };
                                      
                                      // Extract transaction ID from notes if available
                                      const notes = payment.notes || '';
                                      let transactionInfo = null;
                                      if (paymentMethod === 'yappy' || paymentMethod === 'paguelofacil') {
                                        // Try to extract transaction ID from notes
                                        const transactionMatch = notes.match(/ID Transacción: ([^\s.]+)/i) || 
                                                               notes.match(/Transacción: ([^\s.]+)/i) ||
                                                               notes.match(/Operación: ([^\s.]+)/i);
                                        if (transactionMatch) {
                                          transactionInfo = transactionMatch[1];
                                        }
                                      }

                                      return (
                                        <div key={key} className="bg-white p-3 rounded-lg border border-gray-200">
                                          <div className="flex items-start justify-between mb-2">
                                            <div>
                                              <p className="text-sm font-semibold text-gray-900">
                                                {payment.type || 'Pago'} {payment.amount ? `- $${payment.amount.toFixed(2)}` : ''}
                                              </p>
                                              <p className="text-xs text-gray-600">
                                                Método: {methodLabels[paymentMethod] || paymentMethod}
                                              </p>
                                            </div>
                                          </div>
                                          
                                          {/* Show proof URL for cash/transfer/ach */}
                                          {(paymentMethod === 'cash' || paymentMethod === 'transfer' || paymentMethod === 'ach') && payment.proof_url && (
                                            <div className="mt-2">
                                              <DocumentPreview
                                                url={payment.proof_url}
                                                title={`Comprobante - ${methodLabels[paymentMethod]}`}
                                              />
                                            </div>
                                          )}
                                          
                                          {/* Show transaction info for Yappy/Paguelo Fácil */}
                                          {(paymentMethod === 'yappy' || paymentMethod === 'paguelofacil') && (
                                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                              <p className="text-xs font-semibold text-blue-700 mb-1">
                                                {paymentMethod === 'yappy' ? 'Yappy Comercial' : 'Paguelo Fácil'}
                                              </p>
                                              {transactionInfo ? (
                                                <p className="text-xs text-blue-600">
                                                  ID Transacción: <span className="font-mono font-bold">{transactionInfo}</span>
                                                </p>
                                              ) : notes ? (
                                                <p className="text-xs text-blue-600 break-words">
                                                  {notes.substring(0, 100)}{notes.length > 100 ? '...' : ''}
                                                </p>
                                              ) : (
                                                <p className="text-xs text-gray-500">
                                                  Información de transacción no disponible
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>
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
            );
          })}
          </div>
        )}
      </div>
  );
}

function TournamentApprovals({ registrations }: { registrations: TournamentRegistration[] }) {
  return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <span className="p-2 bg-blue-100 rounded-lg text-blue-600">🏆</span>
        Solicitudes de Torneo
        </h2>

      {registrations.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-gray-600">No hay solicitudes de torneo pendientes.</p>
          </div>
        ) : (
          <div className="grid gap-6">
          {registrations.map((registration) => (
            <div key={registration.id} className="glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-slide-up">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                      <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">{registration.team_name}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Trophy size={14} />
                        {registration.tournaments?.name || 'Torneo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Inscrito el {new Date(registration.created_at).toLocaleDateString('es-ES')}
                    </p>
                      </div>
                  <span className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap bg-yellow-50 text-yellow-700 border border-yellow-200">
                    ⏳ Pendiente
                  </span>
                          </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-xs font-semibold text-gray-600 mb-1">👤 Entrenador / Contacto</p>
                    <p className="text-lg font-bold text-gray-900">{registration.coach_name}</p>
                    <p className="text-sm text-gray-600">
                      📧 {registration.coach_email} • 📱 {registration.coach_phone}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
                    <p className="text-xs font-semibold text-gray-600 mb-1">📅 Detalles del torneo</p>
                    <p className="text-lg font-bold text-gray-900">
                      {registration.tournaments?.start_date
                        ? new Date(registration.tournaments.start_date).toLocaleDateString('es-ES')
                        : 'Fecha por confirmar'}
                    </p>
                    <p className="text-sm text-gray-600">
                      📍 {registration.tournaments?.location || 'Lugar por confirmar'}
                    </p>
                    <p className="text-sm text-gray-600">🏷️ Categoría: {registration.category}</p>
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
