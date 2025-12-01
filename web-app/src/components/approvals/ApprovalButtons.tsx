'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, GraduationCap, Loader2, DollarSign } from 'lucide-react';
import { approvePlayer, rejectPlayer } from '@/lib/actions/approvals';
import { approveTournamentRegistration, rejectTournamentRegistration } from '@/lib/actions/tournaments';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

interface PlayerApprovalButtonsProps {
  playerId: string;
}

export function PlayerApprovalButtons({ playerId }: PlayerApprovalButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalType, setApprovalType] = useState<'Active' | 'Scholarship' | null>(null);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [useDefaultPrice, setUseDefaultPrice] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'yappy' | 'paguelofacil' | 'ach' | 'other'>('cash');
  const [paymentProof, setPaymentProof] = useState<string>('');
  const [defaultPrice, setDefaultPrice] = useState<number>(80);
  const router = useRouter();

  // Fetch default enrollment price
  useEffect(() => {
    async function fetchDefaultPrice() {
      const supabase = createClient();
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'price_enrollment')
        .single();
      
      if (data?.value) {
        setDefaultPrice(parseFloat(data.value) || 80);
        setCustomPrice(data.value);
      }
    }
    fetchDefaultPrice();
  }, []);

  const handleApprovalClick = (type: 'Active' | 'Scholarship') => {
    if (type === 'Active') {
      // Show modal for Active approval to capture price and payment method
      setApprovalType('Active');
      setShowApprovalModal(true);
    } else {
      // Scholarship doesn't need payment info, approve directly
      setApprovalType('Scholarship');
      handleApprove(type);
    }
  };

  const handleApprove = (type: 'Active' | 'Scholarship') => {
    setStatus('idle');
    setMessage('');
    
    startTransition(async () => {
      try {
        const options = type === 'Active' ? {
          customEnrollmentPrice: useDefaultPrice ? undefined : parseFloat(customPrice),
          paymentMethod: paymentMethod,
          paymentProof: paymentProof || undefined,
        } : undefined;

        const result = await approvePlayer(playerId, type, options);
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
          setMessage(type === 'Active' ? 'Jugador aprobado como Normal' : 'Jugador aprobado como Becado');
          setShowApprovalModal(false);
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
        console.error('Error in handleApprove:', error);
        setStatus('error');
        setMessage(error?.message || error?.toString() || 'Error al procesar la solicitud');
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      }
    });
  };

  const handleReject = () => {
    setStatus('idle');
    setMessage('');
    
    startTransition(async () => {
      try {
        const result = await rejectPlayer(playerId);
        if (result?.error) {
          setStatus('error');
          setMessage(result.error);
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
          }, 5000);
        } else if (result?.success || !result?.error) {
          setStatus('success');
          setMessage('Jugador rechazado');
          setTimeout(() => {
            router.refresh();
          }, 1500);
        }
      } catch (error: any) {
        console.error('Error in handleReject:', error);
        setStatus('error');
        setMessage(error?.message || error?.toString() || 'Error al procesar la solicitud');
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      }
    });
  };

  const getPaymentProofLabel = () => {
    if (paymentMethod === 'cash' || paymentMethod === 'ach') {
      return 'URL del Comprobante';
    } else if (paymentMethod === 'transfer') {
      return 'URL del Comprobante de Transferencia';
    } else if (paymentMethod === 'yappy') {
      return 'ID de Transacción Yappy';
    } else if (paymentMethod === 'paguelofacil') {
      return 'ID de Transacción Paguelo Fácil';
    }
    return 'Información del Pago';
  };

  return (
    <>
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
          onClick={() => handleApprovalClick('Active')}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 touch-manipulation btn-success shadow-lg shadow-green-500/30 dark:shadow-green-500/20"
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
          onClick={() => handleApprovalClick('Scholarship')}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 touch-manipulation btn-primary shadow-lg shadow-purple-500/30 dark:shadow-purple-500/20"
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
          onClick={handleReject}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 touch-manipulation btn-danger shadow-lg shadow-red-500/20 dark:shadow-red-500/10"
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

      {/* Approval Modal for Active players */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Aprobar Jugador - Información de Pago
            </DialogTitle>
            <DialogDescription>
              Ingresa el precio de matrícula y el método de pago utilizado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Price Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Precio de Matrícula
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="useDefaultPrice"
                  checked={useDefaultPrice}
                  onChange={(e) => {
                    setUseDefaultPrice(e.target.checked);
                    if (e.target.checked) {
                      setCustomPrice(defaultPrice.toString());
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="useDefaultPrice" className="text-sm text-gray-600 dark:text-gray-400">
                  Usar precio por defecto (${defaultPrice.toFixed(2)})
                </label>
              </div>
              {!useDefaultPrice && (
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder={`Precio custom (default: $${defaultPrice.toFixed(2)})`}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[48px] text-base"
                />
              )}
            </div>

            {/* Payment Method Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Método de Pago <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as any);
                  setPaymentProof(''); // Clear proof when method changes
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[48px] text-base"
                required
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="ach">ACH</option>
                <option value="yappy">Yappy Comercial</option>
                <option value="paguelofacil">Paguelo Fácil</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Payment Proof Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getPaymentProofLabel()} {paymentMethod !== 'other' && <span className="text-gray-500">(opcional)</span>}
              </label>
              <input
                type="text"
                value={paymentProof}
                onChange={(e) => setPaymentProof(e.target.value)}
                placeholder={
                  paymentMethod === 'cash' || paymentMethod === 'ach' || paymentMethod === 'transfer'
                    ? 'URL del comprobante'
                    : paymentMethod === 'yappy'
                    ? 'ID de transacción Yappy'
                    : paymentMethod === 'paguelofacil'
                    ? 'ID de transacción Paguelo Fácil'
                    : 'Información del pago'
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[48px] text-base"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowApprovalModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (approvalType === 'Active') {
                  const price = useDefaultPrice ? undefined : parseFloat(customPrice);
                  if (!price && !useDefaultPrice) {
                    setStatus('error');
                    setMessage('Por favor ingresa un precio válido');
                    return;
                  }
                  if (price && (isNaN(price) || price <= 0)) {
                    setStatus('error');
                    setMessage('El precio debe ser mayor a $0.01');
                    return;
                  }
                }
                handleApprove(approvalType!);
              }}
              disabled={isPending || !paymentMethod}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isPending ? 'Procesando...' : 'Confirmar Aprobación'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
          className="flex-1 w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 touch-manipulation btn-success shadow-lg shadow-green-500/30 dark:shadow-green-500/20"
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
          className="flex-1 w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base transition-all duration-300 active:scale-95 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 touch-manipulation btn-danger shadow-lg shadow-red-500/20 dark:shadow-red-500/10"
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

