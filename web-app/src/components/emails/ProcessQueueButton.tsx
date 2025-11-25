'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { processEmailQueue } from '@/lib/actions/email-queue';
import { useState } from 'react';

interface ProcessQueueButtonProps {
  pending: number;
  remainingToday: number;
}

export function ProcessQueueButton({ pending, remainingToday }: ProcessQueueButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleProcess = () => {
    setStatus('idle');
    setMessage('');
    
    startTransition(async () => {
      try {
        const result = await processEmailQueue();
        
        if (result?.error) {
          setStatus('error');
          setMessage(result.error);
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
          }, 5000);
        } else if (result?.success) {
          setStatus('success');
          const sentMsg = result.sent > 0 ? `${result.sent} correo(s) enviado(s)` : '';
          const failedMsg = result.failed > 0 ? `${result.failed} correo(s) fallido(s)` : '';
          setMessage([sentMsg, failedMsg].filter(Boolean).join('. ') || 'Cola procesada');
          
          setTimeout(() => {
            router.refresh();
            setStatus('idle');
            setMessage('');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Error desconocido al procesar la cola');
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
          }, 5000);
        }
      } catch (error: any) {
        console.error('Error processing queue:', error);
        setStatus('error');
        setMessage(error?.message || 'Error al procesar la cola de correos');
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      }
    });
  };

  if (pending === 0 || remainingToday === 0) {
    return null;
  }

  const emailsToProcess = Math.min(pending, remainingToday);

  return (
    <div className="space-y-3">
      {status !== 'idle' && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          status === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {status === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span>{message}</span>
          </div>
        </div>
      )}
      
      <button
        onClick={handleProcess}
        disabled={isPending}
        className="w-full glass-card p-4 hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg font-bold text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={24} />
            Procesando...
          </>
        ) : (
          <>
            <Send size={24} />
            Procesar Cola de Correos ({emailsToProcess} correos)
          </>
        )}
      </button>
    </div>
  );
}

