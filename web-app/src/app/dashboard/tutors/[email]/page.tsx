import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { User, Mail, Phone, Users, DollarSign, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getPlayersPayments } from '@/lib/actions/payments';
import PaymentHistory from '@/components/payments/PaymentHistory';

export default async function TutorProfilePage({ 
  params 
}: { 
  params: Promise<{ email: string }> 
}) {
  const { email } = await params;
  const supabase = await createClient();
  const decodedEmail = decodeURIComponent(email);
  
  // Get all players for this tutor
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('tutor_email', decodedEmail);

  if (!players || players.length === 0) {
    notFound();
  }

  // Get tutor info from first player
  const tutorInfo = {
    name: players[0].tutor_name,
    email: players[0].tutor_email,
    phone: players[0].tutor_phone,
    cedula: players[0].tutor_cedula
  };

  const playerCount = players.length;
  const activeCount = players.filter(p => p.status === 'Active').length;
  const scholarshipCount = players.filter(p => p.status === 'Scholarship').length;
  
  // Get all payments for these players
  const playerIds = players.map(p => p.id);
  const payments = await getPlayersPayments(playerIds);
  
  // Calculate total paid
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link 
        href="/dashboard/tutors"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        Volver a Tutores
      </Link>

      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {tutorInfo.name || 'Sin nombre'}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Tutor de {playerCount} {playerCount === 1 ? 'jugador' : 'jugadores'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}>
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Jugadores</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{playerCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}>
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Becados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{scholarshipCount}</p>
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
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Pagado</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <User className="h-6 w-6" />
          Información de Contacto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Email</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{tutorInfo.email || 'Sin email'}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Teléfono</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{tutorInfo.phone || 'Sin teléfono'}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500 md:col-span-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🆔 Cédula</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{tutorInfo.cedula || 'Sin cédula'}</p>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Jugadores a Cargo
        </h2>
        <div className="grid gap-4">
          {players.map((player) => (
            <Link
              key={player.id}
              href={`/dashboard/players/${player.id}`}
              className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {player.first_name} {player.last_name}
                  </p>
                  <div className="flex gap-2">
                    {player.category && (
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        📚 {player.category}
                      </span>
                    )}
                    {player.gender && (
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {player.gender === 'M' ? '👦' : '👧'} {player.gender === 'M' ? 'Masculino' : 'Femenino'}
                      </span>
                    )}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
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
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Historial de Pagos Consolidado
        </h2>
        
        {playerCount > 1 && (
          <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border-l-4 border-amber-500">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              💡 Descuento Familiar Aplicable
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Este tutor tiene {playerCount} jugadores y califica para el descuento familiar en la mensualidad.
            </p>
          </div>
        )}
        
        <PaymentHistory payments={payments} showPlayerName={true} />
      </div>
    </div>
  );
}
