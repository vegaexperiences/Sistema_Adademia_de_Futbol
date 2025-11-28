'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    YappyButton?: any;
  }
}

interface YappyPaymentButtonProps {
  amount: number;
  description: string;
  orderId: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
  returnUrl?: string;
  customParams?: Record<string, string>;
  playerId?: string;
  paymentType?: 'enrollment' | 'monthly' | 'custom';
  monthYear?: string;
  notes?: string;
}

/**
 * Yappy Payment Button Component
 * Loads the Yappy web component and handles payment processing
 * According to Yappy documentation, the web component handles everything directly
 */
export function YappyPaymentButton({
  amount,
  description,
  orderId,
  onSuccess,
  onError,
  className = '',
  returnUrl,
  customParams,
  playerId,
  paymentType,
  monthYear,
  notes,
}: YappyPaymentButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  // Get merchant ID from API
  useEffect(() => {
    const getMerchantId = async () => {
      try {
        const response = await fetch('/api/payments/yappy/config');
        const data = await response.json();
        console.log('[Yappy] Config response:', { success: data.success, hasMerchantId: !!data.merchantId, environment: data.environment });
        if (data.success && data.merchantId) {
          setMerchantId(data.merchantId);
        } else {
          const errorMsg = data.error || 'Error al obtener configuración de Yappy';
          console.error('[Yappy] Config error:', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (err: any) {
        console.error('[Yappy] Error getting config:', err);
        setError(err.message || 'Error al obtener configuración de Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al obtener configuración de Yappy');
      }
    };

    getMerchantId();
  }, [onError]);

  // Load Yappy web component script
  useEffect(() => {
    if (!merchantId || scriptLoaded.current) return;

    const loadScript = () => {
      try {
        // Check if script is already loaded
        if (document.querySelector('script[src*="btn-yappy"]')) {
          scriptLoaded.current = true;
          setIsLoading(false);
          return;
        }

        // Load the Yappy web component script as ES module
        const script = document.createElement('script');
        script.src = 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
        script.type = 'module';
        script.async = true;
        script.onload = () => {
          scriptLoaded.current = true;
          setIsLoading(false);
        };
        script.onerror = () => {
          setError('Error al cargar el componente de Yappy');
          setIsLoading(false);
          onError?.('Error al cargar el componente de Yappy');
        };

        document.head.appendChild(script);
      } catch (err: any) {
        console.error('[Yappy] Error loading script:', err);
        setError(err.message || 'Error al inicializar Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al inicializar Yappy');
      }
    };

    loadScript();
  }, [merchantId, onError]);

  // Render the Yappy button component when script is loaded
  useEffect(() => {
    if (!isLoading && merchantId && containerRef.current && scriptLoaded.current) {
      // Wait a bit for the custom element to be defined
      let retryCount = 0;
      const maxRetries = 50; // 5 seconds max wait
      
      const renderButton = () => {
        try {
          // Check if custom element is defined
          if (!customElements.get('btn-yappy')) {
            retryCount++;
            if (retryCount >= maxRetries) {
              console.error('[Yappy] Custom element not defined after max retries');
              setError('El componente de Yappy no se pudo cargar. Por favor, recarga la página o intenta más tarde.');
              setIsLoading(false);
              onError?.('El componente de Yappy no se pudo cargar');
              return;
            }
            console.log(`[Yappy] Waiting for custom element to be defined... (${retryCount}/${maxRetries})`);
            setTimeout(renderButton, 100);
            return;
          }

          // Clear container first
          if (!containerRef.current) return;
          containerRef.current.innerHTML = '';

          // Build return URL with custom parameters
          const baseReturnUrl = returnUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/yappy/callback`;
          const returnUrlWithParams = new URL(baseReturnUrl);
          returnUrlWithParams.searchParams.set('type', customParams?.type || (playerId ? 'payment' : 'enrollment'));
          if (playerId) returnUrlWithParams.searchParams.set('playerId', playerId);
          if (paymentType) returnUrlWithParams.searchParams.set('paymentType', paymentType);
          returnUrlWithParams.searchParams.set('amount', amount.toString());
          if (monthYear) returnUrlWithParams.searchParams.set('monthYear', monthYear);
          if (notes) returnUrlWithParams.searchParams.set('notes', notes);

          console.log('[Yappy] Current domain:', window.location.hostname);
          console.log('[Yappy] Return URL:', returnUrlWithParams.toString());

          // Create the btn-yappy element
          const yappyButton = document.createElement('btn-yappy');
          
          // Set attributes based on Yappy documentation
          yappyButton.setAttribute('merchant-id', merchantId);
          yappyButton.setAttribute('amount', amount.toFixed(2));
          yappyButton.setAttribute('description', description.substring(0, 200)); // Max 200 chars
          yappyButton.setAttribute('order-id', orderId);
          yappyButton.setAttribute('return-url', returnUrlWithParams.toString());
          
          console.log('[Yappy] Button attributes:', {
            merchantId,
            amount: amount.toFixed(2),
            description: description.substring(0, 200),
            orderId,
            returnUrl: returnUrlWithParams.toString(),
          });

          // Listen to all possible events from Yappy component
          const eventTypes = ['yappy-success', 'yappy-error', 'yappy-unavailable', 'yappy-loading', 'yappy-ready', 'error', 'unavailable'];
          
          eventTypes.forEach(eventType => {
            yappyButton.addEventListener(eventType, (event: any) => {
              console.log(`[Yappy] Event received: ${eventType}`, event.detail || event);
            });
          });

          // Handle success event
          yappyButton.addEventListener('yappy-success', (event: any) => {
            console.log('[Yappy] Payment success:', event.detail);
            const transactionId = event.detail?.transactionId || event.detail?.orderId || orderId;
            onSuccess?.(transactionId);
          });

          // Handle error event
          yappyButton.addEventListener('yappy-error', (event: any) => {
            console.error('[Yappy] Payment error:', event.detail);
            const errorMsg = event.detail?.message || event.detail?.error || 'Error al procesar el pago con Yappy';
            setError(errorMsg);
            onError?.(errorMsg);
          });

          // Listen for any messages from the Yappy component
          yappyButton.addEventListener('yappy-unavailable', (event: any) => {
            console.error('[Yappy] Service unavailable:', event.detail);
            const errorMsg = event.detail?.message || 'Yappy no está disponible en este momento. Por favor, intenta más tarde o usa otro método de pago.';
            setError(errorMsg);
            onError?.(errorMsg);
          });

          // Monitor the button element for changes (in case Yappy shows error message in DOM)
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const buttonElement = yappyButton as any;
                const textContent = buttonElement.textContent || buttonElement.innerText || '';
                
                // Check if Yappy is showing an error message in the DOM
                if (textContent.includes('no está disponible') || 
                    textContent.includes('no disponible') ||
                    textContent.includes('intenta más tarde') ||
                    textContent.includes('try again later') ||
                    textContent.includes('not available')) {
                  console.warn('[Yappy] Error message detected in DOM:', textContent);
                  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
                  if (!error) {
                    const errorMsg = `Yappy no está disponible. El dominio "${currentDomain}" podría no estar autorizado en tu panel de Yappy. Verifica la configuración del dominio en Yappy Comercial.`;
                    setError(errorMsg);
                    onError?.(errorMsg);
                  }
                }
              }
            });
          });

          // Start observing the button element
          observer.observe(yappyButton, {
            childList: true,
            subtree: true,
            characterData: true,
          });

          if (containerRef.current) {
            containerRef.current.appendChild(yappyButton);
            
            // Check after a delay if the button shows an error
            setTimeout(() => {
              const buttonElement = yappyButton as any;
              const textContent = buttonElement.textContent || buttonElement.innerText || '';
              const innerHTML = buttonElement.innerHTML || '';
              
              console.log('[Yappy] Button content after render:', { textContent, innerHTML });
              
              if (textContent.includes('no está disponible') || 
                  textContent.includes('no disponible') ||
                  innerHTML.includes('no está disponible') ||
                  textContent.includes('not available')) {
                console.warn('[Yappy] Error detected in button content:', { textContent, innerHTML });
                const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
                if (!error) {
                  const errorMsg = `Yappy no está disponible. El dominio "${currentDomain}" podría no estar autorizado en tu panel de Yappy. Verifica la configuración del dominio en Yappy Comercial.`;
                  setError(errorMsg);
                  onError?.(errorMsg);
                }
              }
            }, 2000);
          }
        } catch (err: any) {
          console.error('[Yappy] Error rendering button:', err);
          setError('Error al renderizar el botón de Yappy');
          onError?.('Error al renderizar el botón de Yappy');
        }
      };

      // Wait a bit for the module to fully load
      setTimeout(renderButton, 200);
    }
  }, [isLoading, merchantId, amount, description, orderId, returnUrl, customParams, playerId, paymentType, monthYear, notes, onSuccess, onError]);

  return (
    <div className={`space-y-2 ${className}`}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-8">
          <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Cargando botón de pago Yappy...</p>
        </div>
      )}

      {error && (
        <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 font-medium mb-2">{error}</p>
          {error.includes('no está disponible') && (
            <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
              <p>💡 <strong>Posibles causas:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>El dominio <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded">{typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</code> no está autorizado en tu panel de Yappy</li>
                <li>El merchant ID no está activo o configurado correctamente</li>
                <li>Problema temporal con el servicio de Yappy</li>
              </ul>
              <p className="mt-2">Verifica en tu panel de Yappy que el dominio esté autorizado para este merchant ID.</p>
            </div>
          )}
        </div>
      )}

      {/* Container for Yappy web component */}
      <div 
        ref={containerRef}
        className={isLoading ? 'hidden' : 'min-h-[48px] touch-manipulation'}
      />

      {!isLoading && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
          🔒 Pago seguro procesado por Yappy Comercial
        </p>
      )}
    </div>
  );
}

