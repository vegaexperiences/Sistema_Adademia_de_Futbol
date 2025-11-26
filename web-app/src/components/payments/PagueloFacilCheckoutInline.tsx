'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, CreditCard, ArrowLeft } from 'lucide-react';

declare global {
  interface Window {
    pfWallet?: any;
  }
}

interface PagueloFacilCheckoutInlineProps {
  amount: number;
  description: string;
  email: string;
  orderId: string;
  apiKey: string;
  cclw: string;
  sandbox: boolean;
  onSuccess: (transactionId: string, response: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export function PagueloFacilCheckoutInline({
  amount,
  description,
  email,
  orderId,
  apiKey,
  cclw,
  sandbox,
  onSuccess,
  onError,
  onBack
}: PagueloFacilCheckoutInlineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    const loadScript = () => {
      if (scriptLoaded.current) return;

      const script = document.createElement('script');
      const scriptUrl = sandbox
        ? 'https://sandbox.paguelofacil.com/HostedFields/vendor/scripts/WALLET/PFScript.js'
        : 'https://secure.paguelofacil.com/HostedFields/vendor/scripts/WALLET/PFScript.js';
      
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => {
        scriptLoaded.current = true;
        initializePayment();
      };
      script.onerror = () => {
        setError('Error al cargar el SDK de Paguelo Fácil');
        setLoading(false);
      };

      document.head.appendChild(script);
    };

    const initializePayment = () => {
      if (!window.pfWallet || !containerRef.current) {
        setError('SDK de Paguelo Fácil no disponible');
        setLoading(false);
        return;
      }

      try {
        // Clean and validate tokens (remove any non-ASCII characters that might have been copied incorrectly)
        const cleanApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
        const cleanCclw = cclw.replace(/[^\x20-\x7E]/g, '').trim();

        if (!cleanApiKey || !cleanCclw) {
          throw new Error('Token de acceso o CCLW inválido. Por favor verifica las variables de entorno.');
        }

        window.pfWallet = window.pfWallet || {};
        window.pfWallet.useAsSandbox(sandbox);

        window.pfWallet.openService({
          apiKey: cleanApiKey,
          cclw: cleanCclw
        }).then((merchantSetup: any) => {
          // Create payment form
          const paymentData = {
            amount: amount,
            description: description,
            email: email,
            orderId: orderId,
            // Additional configuration
            onSuccess: (response: any) => {
              console.log('PagueloFacil payment success:', response);
              onSuccess(response.transactionId || response.id, response);
            },
            onError: (err: any) => {
              console.error('PagueloFacil payment error:', err);
              setError(err.message || 'Error al procesar el pago');
              onError(err.message || 'Error al procesar el pago');
            }
          };

          // Render the payment form in the container
          window.pfWallet.renderForm(containerRef.current, paymentData);
          setLoading(false);
        }).catch((err: any) => {
          console.error('Error opening PagueloFacil service:', err);
          setError(err.message || 'Error al inicializar Paguelo Fácil');
          setLoading(false);
          onError(err.message || 'Error al inicializar Paguelo Fácil');
        });
      } catch (err: any) {
        console.error('Error initializing PagueloFacil:', err);
        setError(err.message || 'Error al inicializar el formulario de pago');
        setLoading(false);
        onError(err.message || 'Error al inicializar el formulario de pago');
      }
    };

    loadScript();

    return () => {
      // Cleanup if needed
    };
  }, [amount, description, email, orderId, apiKey, cclw, sandbox, onSuccess, onError]);

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-cyan-600" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Pagar con Paguelo Fácil
          </h3>
        </div>
      </div>

      {/* Amount Display */}
      <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monto a pagar:</span>
          <span className="font-bold text-2xl text-gray-900 dark:text-white">${amount.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
          🔒 Pago seguro procesado por Paguelo Fácil
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-cyan-600 animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando formulario de pago...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Payment Form Container */}
      <div 
        id="paguelofacil-container" 
        ref={containerRef}
        className={`${loading || error ? 'hidden' : ''}`}
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}

