'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * Component that handles Yappy success/failure callbacks
 * Detects URL parameters and refreshes the page to show updated payment data
 * Shows a confirmation message with payment details
 */
export function YappySuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'failed' | 'error' | null>(null);
  const [messageData, setMessageData] = useState<{
    amount?: string;
    orderId?: string;
  }>({});

  useEffect(() => {
    const status = searchParams.get('yappy');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    const hasValidParams = status === 'success' || status === 'failed' || status === 'error';
    const hasOtherParams = !!orderId || !!amount;

    if (hasValidParams && hasOtherParams) {
      // Create a unique key based on orderId to prevent duplicate displays
      const shownKey = `yappy_shown_${orderId || 'unknown'}`;
      const alreadyShown = sessionStorage.getItem(shownKey);
      
      // Only show if we haven't shown it before AND we have a valid order ID
      if (!alreadyShown && orderId) {
        // Mark as shown immediately to prevent duplicate displays
        sessionStorage.setItem(shownKey, 'true');
        
        setMessageType(status as 'success' | 'failed' | 'error');
        setMessageData({
          amount: amount || undefined,
          orderId: orderId || undefined,
        });
        setShowMessage(true);
        
        // Remove the query parameters from URL immediately
        const url = new URL(window.location.href);
        url.searchParams.delete('yappy');
        url.searchParams.delete('orderId');
        url.searchParams.delete('amount');
        
        // Replace URL without query params
        window.history.replaceState({}, '', url.toString());
        
        // Refresh the page data
        router.refresh();
        
        // Hide message after 5 seconds
        setTimeout(() => {
          setShowMessage(false);
        }, 5000);
      } else {
        // Already shown or no order ID - just clean up URL params silently
        const url = new URL(window.location.href);
        url.searchParams.delete('yappy');
        url.searchParams.delete('orderId');
        url.searchParams.delete('amount');
        window.history.replaceState({}, '', url.toString());
      }
    } else if (hasValidParams && !hasOtherParams) {
      // If we only have status but no other params, it's likely a stale parameter
      // Clean it up silently without showing a message
      const url = new URL(window.location.href);
      url.searchParams.delete('yappy');
      url.searchParams.delete('orderId');
      url.searchParams.delete('amount');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, router]);

  if (!showMessage || !messageType) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in">
        {messageType === 'success' && (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              ¡Pago Exitoso!
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Tu pago con Yappy Comercial ha sido procesado correctamente.
            </p>
            {messageData.amount && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Monto:</span>
                  <span className="text-lg font-bold text-green-700">
                    ${parseFloat(messageData.amount).toFixed(2)}
                  </span>
                </div>
                {messageData.orderId && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-700">Orden:</span>
                    <span className="text-sm text-gray-600 font-mono">
                      {messageData.orderId.substring(0, 20)}...
                    </span>
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 text-center mb-4">
              El pago se ha registrado en tu cuenta. Puedes cerrar esta ventana.
            </p>
            <button
              onClick={() => setShowMessage(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Cerrar
            </button>
          </>
        )}

        {messageType === 'failed' && (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Pago Fallido
            </h2>
            <p className="text-gray-600 text-center mb-6">
              No se pudo procesar tu pago con Yappy Comercial.
            </p>
            <p className="text-sm text-gray-500 text-center mb-4">
              Por favor, intenta nuevamente o usa otro método de pago.
            </p>
            <button
              onClick={() => setShowMessage(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-xl hover:from-red-700 hover:to-rose-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Cerrar
            </button>
          </>
        )}

        {messageType === 'error' && (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Error en el Pago
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Ocurrió un error al procesar tu pago con Yappy Comercial.
            </p>
            <p className="text-sm text-gray-500 text-center mb-4">
              Por favor, verifica tu conexión e intenta nuevamente.
            </p>
            <button
              onClick={() => setShowMessage(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-bold rounded-xl hover:from-yellow-700 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

