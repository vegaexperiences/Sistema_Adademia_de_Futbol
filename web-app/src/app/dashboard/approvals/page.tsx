import { getPendingPlayers, approvePlayer, rejectPlayer, getPendingPayments, approvePayment, rejectPayment } from '@/lib/actions/approvals';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, GraduationCap } from 'lucide-react'; // GraduationCap is still used for "Aprobar Becado"
import { getPlayerCategory, getCategoryColor } from '@/lib/utils/player-category';
import { DocumentPreview } from '@/components/ui/DocumentPreview';

export default async function ApprovalsPage() {
  const pendingPlayers = await getPendingPlayers();
  const pendingPayments = await getPendingPayments();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Glass Effect */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Aprobaciones Pendientes</h1>
            <p className="text-gray-600 dark:text-gray-400">Revisa y aprueba solicitudes y pagos pendientes</p>
          </div>
          <div className="flex gap-3">
            <span className="px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
              {pendingPlayers.length} Jugadores
            </span>
            <span className="px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
              {pendingPayments.length} Pagos
            </span>
          </div>
        </div>
      </div>

      {/* Pending Players Section */}
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
            {pendingPlayers.map((player: any) => (
              <div key={player.id} className="glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-slide-up">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Player Info Section */}
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
                            return (
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${colorClass}`}>
                                {category}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex gap-2 flex-wrap">
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
                      <span className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap" style={{
                        background: 'linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)',
                        color: '#92400e',
                        border: '2px solid #fbbf24'
                      }}>
                        ⏳ PENDIENTE
                      </span>
                    </div>

                    {/* Details Grid */}
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

                    {/* Tutor Info */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border-l-4 border-amber-500 mb-4">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">👨‍👩‍👧‍👦 Información del Tutor</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {player.families?.tutor_name || player.tutor_name || 'Sin información'}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        📧 {player.families?.tutor_email || player.tutor_email || 'Sin email'} • 
                        📱 {player.families?.tutor_phone || player.tutor_phone || 'Sin teléfono'}
                      </p>
                    </div>

                    {/* Documents */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">📄 Documentos</p>
                      <div className="space-y-3">
                        {(() => {
                          try {
                            // Check new columns first, then fallback to notes for backward compatibility
                            const frontUrl = player.cedula_front_url || (player.notes ? JSON.parse(player.notes).doc_front : null);
                            const backUrl = player.cedula_back_url || (player.notes ? JSON.parse(player.notes).doc_back : null);
                            const tutorUrl = player.families?.tutor_cedula_url || (player.notes ? JSON.parse(player.notes).tutor_doc : null);

                            // Get payment proofs for this player
                            const playerPayments = pendingPayments.filter((p: any) => 
                              p.player_id === player.id && p.proof_url
                            );

                            const hasDocuments = frontUrl || backUrl || tutorUrl || playerPayments.length > 0;

                            return (
                              <>
                                {/* Player Documents */}
                                {(frontUrl || backUrl) && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">👤 Documentos del Jugador</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {frontUrl && <DocumentPreview url={frontUrl} title="Cédula Jugador (Frente)" />}
                                      {backUrl && <DocumentPreview url={backUrl} title="Cédula Jugador (Reverso)" />}
                                    </div>
                                  </div>
                                )}

                                {/* Tutor Documents */}
                                {tutorUrl && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">👨‍👩‍👧‍👦 Documentos del Tutor</p>
                                    <div className="flex gap-2 flex-wrap">
                                      <DocumentPreview url={tutorUrl} title="Cédula Tutor" />
                                    </div>
                                  </div>
                                )}

                                {/* Payment Proofs */}
                                {playerPayments.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">💳 Comprobantes de Pago</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {playerPayments.map((payment: any, idx: number) => (
                                        <DocumentPreview 
                                          key={payment.id} 
                                          url={payment.proof_url} 
                                          title={`Comprobante de Pago - ${payment.type} (${idx + 1})`} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!hasDocuments && (
                                  <span className="text-gray-500 text-sm">Sin documentos adjuntos</span>
                                )}
                              </>
                            );
                          } catch (e) {
                            return <span className="text-red-500 text-sm">Error al cargar documentos</span>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col justify-center gap-3 lg:min-w-[200px]">
                    <form action={async () => {
                      'use server';
                      await approvePlayer(player.id, 'Active');
                    }}>
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl" style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                      }}>
                        <CheckCircle size={20} />
                        Aprobar Normal
                      </button>
                    </form>

                    <form action={async () => {
                      'use server';
                      await approvePlayer(player.id, 'Scholarship');
                    }}>
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl" style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                      }}>
                        <GraduationCap size={20} />
                        Aprobar Becado
                      </button>
                    </form>

                    <form action={async () => {
                      'use server';
                      await rejectPlayer(player.id);
                    }}>
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl" style={{
                        background: 'white',
                        color: '#ef4444',
                        border: '2px solid #ef4444',
                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
                      }}>
                        <XCircle size={20} />
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Payments Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">💳</span>
          Pagos Pendientes
        </h2>

        {pendingPayments.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No hay pagos pendientes de aprobación.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {pendingPayments.map((payment: any) => (
              <div key={payment.id} className="glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-slide-up">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {payment.type} - ${payment.amount}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {new Date(payment.created_at).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        {payment.method}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 mb-1">NOTAS</p>
                        <p className="text-gray-900 dark:text-white font-medium">{payment.notes || 'Sin notas'}</p>
                      </div>
                      {payment.proof_url && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">COMPROBANTE</p>
                            <p className="text-gray-900 dark:text-white font-medium truncate max-w-[150px]">{payment.proof_url}</p>
                          </div>
                          <DocumentPreview url={payment.proof_url} title="Comprobante de Pago" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3 lg:min-w-[180px]">
                    <form action={async () => {
                      'use server';
                      await approvePayment(payment.id);
                    }}>
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105 bg-green-600 hover:bg-green-700 shadow-md">
                        <CheckCircle size={18} />
                        Aprobar Pago
                      </button>
                    </form>

                    <form action={async () => {
                      'use server';
                      await rejectPayment(payment.id);
                    }}>
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-red-600 transition-all hover:scale-105 bg-white border border-red-200 hover:bg-red-50 shadow-sm">
                        <XCircle size={18} />
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
