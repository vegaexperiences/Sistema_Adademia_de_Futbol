'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * Component that handles Paguelo Fácil success/failure callbacks
 * Detects URL parameters and refreshes the page to show updated payment data
 * Shows a confirmation message with payment details
 */
export function PagueloFacilSuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'failed' | 'error' | null>(null);
  const [messageData, setMessageData] = useState<{
    amount?: string;
    operationId?: string;
    reason?: string;
  }>({});

  useEffect(() => {
    const status = searchParams.get('paguelofacil');
    const oper = searchParams.get('oper');
    const monto = searchParams.get('monto');
    const razon = searchParams.get('razon');
    
    if (status === 'success' || status === 'failed' || status === 'error') {
      setMessageType(status as 'success' | 'failed' | 'error');
      setMessageData({
        amount: monto || undefined,
        operationId: oper || undefined,
        reason: razon ? decodeURIComponent(razon) : undefined,
      });
      setShowMessage(true);
      
      // Remove the query parameters from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('paguelofacil');
      url.searchParams.delete('oper');
      url.searchParams.delete('monto');
      url.searchParams.delete('razon');
      
      // Replace URL without query params
      window.history.replaceState({}, '', url.toString());
      
      // Refresh the page data
      router.refresh();
      
      // Hide message after 5 seconds
      setTimeout(() => {
        setShowMessage(false);
      }, 5000);
    }
  }, [searchParams, router]);

  if (!showMessage || !messageType) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      {messageType === 'success' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 dark:text-green-100 mb-1">
                ✅ Pago Confirmado
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Su pago ha sido recibido exitosamente. Se ha enviado un correo de confirmación al tutor.
              </p>
              {messageData.amount && (
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Monto: ${messageData.amount} USD
                </p>
              )}
              {messageData.operationId && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Operación: {messageData.operationId}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowMessage(false)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {messageType === 'failed' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">
                ❌ Pago Rechazado
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                {messageData.reason || 'El pago no pudo ser procesado. Por favor, intente nuevamente.'}
              </p>
            </div>
            <button
              onClick={() => setShowMessage(false)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {messageType === 'error' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-1">
                ⚠️ Error en el Proceso
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Hubo un error al procesar el pago. Por favor, contacte con soporte.
              </p>
            </div>
            <button
              onClick={() => setShowMessage(false)}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

