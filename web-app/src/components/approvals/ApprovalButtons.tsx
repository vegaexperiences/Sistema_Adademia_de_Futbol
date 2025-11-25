'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, GraduationCap, Loader2 } from 'lucide-react';
import { approvePlayer, rejectPlayer } from '@/lib/actions/approvals';
import { approveTournamentRegistration, rejectTournamentRegistration } from '@/lib/actions/tournaments';
import { useState } from 'react';

interface PlayerApprovalButtonsProps {
  playerId: string;
}

export function PlayerApprovalButtons({ playerId }: PlayerApprovalButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAction = async (action: () => Promise<{ success?: boolean; error?: string }>, type: string) => {
    setStatus('idle');
    setMessage('');
    
    startTransition(async () => {
      try {
        const result = await action();
        console.log('Action result:', result);
        if (result?.error) {
          setStatus('error');
          setMessage(result.error);
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
          }, 5000);
        } else if (result?.success || !result?.error) {
          setStatus('success');
          setMessage(type === 'active' ? 'Jugador aprobado como Normal' : type === 'scholarship' ? 'Jugador aprobado como Becado' : 'Jugador rechazado');
          setTimeout(() => {
            router.refresh();
          }, 1500);
        } else {
          setStatus('error');
          setMessage('Error desconocido al procesar la solicitud');
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
          }, 5000);
        }
      } catch (error: any) {
        console.error('Error in handleAction:', error);
        setStatus('error');
        setMessage(error?.message || error?.toString() || 'Error al procesar la solicitud');
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      }
    });
  };

  return (
    <div className="flex flex-col justify-center gap-3 lg:min-w-[200px]">
      {status !== 'idle' && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          status === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message}
        </div>
      )}
      
      <button
        onClick={() => handleAction(() => approvePlayer(playerId, 'Active'), 'active')}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Procesando...
          </>
        ) : (
          <>
            <CheckCircle size={20} />
            Aprobar Normal
          </>
        )}
      </button>

      <button
        onClick={() => handleAction(() => approvePlayer(playerId, 'Scholarship'), 'scholarship')}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Procesando...
          </>
        ) : (
          <>
            <GraduationCap size={20} />
            Aprobar Becado
          </>
        )}
      </button>

      <button
        onClick={() => handleAction(() => rejectPlayer(playerId), 'reject')}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          background: 'white',
          color: '#ef4444',
          border: '2px solid #ef4444',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Procesando...
          </>
        ) : (
          <>
            <XCircle size={20} />
            Rechazar
          </>
        )}
      </button>
    </div>
  );
}

interface TournamentApprovalButtonsProps {
  registrationId: string;
}

export function TournamentApprovalButtons({ registrationId }: TournamentApprovalButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAction = async (action: () => Promise<{ success?: boolean; error?: string }>, type: string) => {
    setStatus('idle');
    setMessage('');
    
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) {
          setStatus('error');
          setMessage(result.error);
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
          }, 3000);
        } else {
          setStatus('success');
          setMessage(type === 'approve' ? 'Registro de torneo aprobado' : 'Registro de torneo rechazado');
          setTimeout(() => {
            router.refresh();
          }, 1500);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Error al procesar la solicitud');
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 3000);
      }
    });
  };

  return (
    <div className="space-y-3">
      {status !== 'idle' && (
        <div className={`w-full p-3 rounded-lg text-sm font-medium ${
          status === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={() => handleAction(() => approveTournamentRegistration(registrationId), 'approve')}
          disabled={isPending}
          className="flex-1 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Aprobar
            </>
          )}
        </button>
        
        <button
          onClick={() => handleAction(() => rejectTournamentRegistration(registrationId), 'reject')}
          disabled={isPending}
          className="flex-1 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ background: 'white', color: '#ef4444', border: '2px solid #ef4444', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)' }}
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Procesando...
            </>
          ) : (
            <>
              <XCircle size={20} />
              Rechazar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

