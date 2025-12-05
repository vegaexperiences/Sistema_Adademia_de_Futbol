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
  const [domainUrl, setDomainUrl] = useState<string>('');
  const [validationToken, setValidationToken] = useState<string>('');
  const [orderToken, setOrderToken] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  // Step 1: Get merchant ID and validate merchant (according to Yappy manual)
  useEffect(() => {
    const initializeYappy = async () => {
      try {
        // First, get config
        const configResponse = await fetch('/api/payments/yappy/config');
        const configData = await configResponse.json();
        console.log('[Yappy] Config response:', { 
          success: configData.success, 
          hasMerchantId: !!configData.merchantId, 
          environment: configData.environment, 
          domainUrl: configData.domainUrl 
        });
        
        if (!configData.success || !configData.merchantId) {
          throw new Error(configData.error || 'Error al obtener configuración de Yappy');
        }

        setMerchantId(configData.merchantId);
        if (configData.domainUrl) {
          setDomainUrl(configData.domainUrl);
        }

        // Step 2: Validate merchant to get token and epochTime
        console.log('[Yappy] Validating merchant...');
        const validateResponse = await fetch('/api/payments/yappy/validate', {
          method: 'POST',
        });
        const validateData = await validateResponse.json();
        
        if (!validateData.success || !validateData.token || !validateData.epochTime) {
          throw new Error(validateData.error || 'Error al validar credenciales de Yappy');
        }

        console.log('[Yappy] Merchant validated:', {
          hasToken: !!validateData.token,
          hasEpochTime: !!validateData.epochTime,
        });

        setValidationToken(validateData.token);

        // Step 3: Create order using token and epochTime
        console.log('[Yappy] Creating order...');
        const baseReturnUrl = returnUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/yappy/callback`;
        const returnUrlWithParams = new URL(baseReturnUrl);
        returnUrlWithParams.searchParams.set('type', customParams?.type || (playerId ? 'payment' : 'enrollment'));
        if (playerId) returnUrlWithParams.searchParams.set('playerId', playerId);
        if (paymentType) returnUrlWithParams.searchParams.set('paymentType', paymentType);
        returnUrlWithParams.searchParams.set('amount', amount.toString());
        if (monthYear) returnUrlWithParams.searchParams.set('monthYear', monthYear);
        if (notes) returnUrlWithParams.searchParams.set('notes', notes);

        const orderResponse = await fetch('/api/payments/yappy/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            description: description.substring(0, 200),
            orderId: orderId.substring(0, 15), // Max 15 characters
            returnUrl: returnUrlWithParams.toString(),
            token: validateData.token,
            paymentDate: validateData.epochTime,
            metadata: customParams,
            playerId: playerId || undefined, // Pass playerId to get tutor phone
            tutorPhone: customParams?.tutorPhone || undefined, // Pass tutorPhone directly for enrollment
          }),
        });

        const orderData = await orderResponse.json();
        
        if (!orderData.success || !orderData.orderData) {
          throw new Error(orderData.error || 'Error al crear orden de pago');
        }

        console.log('[Yappy] Order created:', {
          orderId: orderData.orderData.orderId,
          transactionId: orderData.orderData.transactionId,
          hasToken: !!orderData.orderData.token,
          hasDocumentName: !!orderData.orderData.documentName,
        });

        setOrderToken(orderData.orderData.token || '');
        setDocumentName(orderData.orderData.documentName || '');
        // Don't set isLoading to false here - let the script loading handle it
      } catch (err: any) {
        console.error('[Yappy] Error initializing:', err);
        setError(err.message || 'Error al inicializar Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al inicializar Yappy');
      }
    };

    initializeYappy();
  }, [amount, description, orderId, returnUrl, customParams, playerId, paymentType, monthYear, notes, onError]);

  // Load Yappy web component script (only after validation and order creation)
  useEffect(() => {
    if (!merchantId || !validationToken || !orderToken || scriptLoaded.current) return;

    const loadScript = () => {
      try {
        // Check if script is already loaded
        if (document.querySelector('script[src*="btn-yappy"]')) {
          scriptLoaded.current = true;
          // Don't set isLoading to false here - wait for button to render
          return;
        }

        // Load the Yappy web component script as ES module
        // Get CDN URL from config
        fetch('/api/payments/yappy/config')
          .then(res => res.json())
          .then(configData => {
            const cdnUrl = configData.cdnUrl || 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
            const script = document.createElement('script');
            script.src = cdnUrl;
            script.type = 'module';
            script.async = true;
            script.onload = () => {
              scriptLoaded.current = true;
              // Don't set isLoading to false here - wait for button to render
              console.log('[Yappy] Script loaded, waiting for button render...');
            };
            script.onerror = () => {
              setError('Error al cargar el componente de Yappy');
              setIsLoading(false);
              onError?.('Error al cargar el componente de Yappy');
            };

            document.head.appendChild(script);
          })
          .catch(err => {
            console.error('[Yappy] Error getting CDN URL:', err);
            // Fallback to default CDN
            const script = document.createElement('script');
            script.src = 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
            script.type = 'module';
            script.async = true;
            script.onload = () => {
              scriptLoaded.current = true;
              // Don't set isLoading to false here - wait for button to render
              console.log('[Yappy] Script loaded (fallback), waiting for button render...');
            };
            script.onerror = () => {
              setError('Error al cargar el componente de Yappy');
              setIsLoading(false);
              onError?.('Error al cargar el componente de Yappy');
            };
            document.head.appendChild(script);
          });
      } catch (err: any) {
        console.error('[Yappy] Error loading script:', err);
        setError(err.message || 'Error al inicializar Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al inicializar Yappy');
      }
    };

    loadScript();
  }, [merchantId, validationToken, orderToken, onError]);

  // Render the Yappy button component when script is loaded and order is created
  useEffect(() => {
    console.log('[Yappy] Render effect triggered:', {
      hasMerchantId: !!merchantId,
      hasValidationToken: !!validationToken,
      hasOrderToken: !!orderToken,
      hasContainer: !!containerRef.current,
      scriptLoaded: scriptLoaded.current,
    });

    if (!merchantId || !validationToken || !orderToken || !containerRef.current || !scriptLoaded.current) {
      console.log('[Yappy] Render conditions not met, waiting...');
      return;
    }

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

        console.log('[Yappy] Custom element found, proceeding to render button');

        console.log('[Yappy] Custom element found, proceeding to render button');

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
        
        // Set attributes based on Yappy manual
        // The web component needs the token and documentName from the order creation
        yappyButton.setAttribute('merchant-id', merchantId);
        yappyButton.setAttribute('amount', amount.toFixed(2));
        yappyButton.setAttribute('description', description.substring(0, 200)); // Max 200 chars
        yappyButton.setAttribute('order-id', orderId.substring(0, 15)); // Max 15 characters
        yappyButton.setAttribute('return-url', returnUrlWithParams.toString());
        
        // Add token and documentName from order creation (required by Yappy manual)
        if (orderToken) {
          yappyButton.setAttribute('token', orderToken);
        }
        if (documentName) {
          yappyButton.setAttribute('document-name', documentName);
        }
        
        // Add domain-url if available (domain without https://)
        if (domainUrl) {
          yappyButton.setAttribute('domain-url', domainUrl);
        }
        
        console.log('[Yappy] Button attributes:', {
          merchantId,
          amount: amount.toFixed(2),
          description: description.substring(0, 200),
          orderId: orderId.substring(0, 15),
          returnUrl: returnUrlWithParams.toString(),
          domainUrl: domainUrl || 'not set',
          hasToken: !!orderToken,
          hasDocumentName: !!documentName,
          currentDomain: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
        });

        // Listen to all possible events from Yappy component
        const eventTypes = ['yappy-success', 'yappy-error', 'yappy-unavailable', 'yappy-loading', 'yappy-ready', 'error', 'unavailable', 'yappy-init', 'yappy-ready', 'yappy-failed'];
        
        eventTypes.forEach(eventType => {
          yappyButton.addEventListener(eventType, (event: any) => {
            console.log(`[Yappy] Event received: ${eventType}`, event.detail || event);
            if (eventType === 'yappy-unavailable' || eventType === 'yappy-failed' || eventType === 'error') {
              const errorDetail = event.detail || {};
              console.error(`[Yappy] ${eventType} details:`, errorDetail);
            }
          });
        });

        // Also listen for any custom events that might be emitted
        yappyButton.addEventListener('*', (event: any) => {
          console.log('[Yappy] Any event:', event.type, event);
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
          
          // Set loading to false only after button is rendered
          setIsLoading(false);
          console.log('[Yappy] Button element added to DOM');
          
          // Check after a delay if the button shows an error
          setTimeout(() => {
            const buttonElement = yappyButton as any;
            const textContent = buttonElement.textContent || buttonElement.innerText || '';
            const innerHTML = buttonElement.innerHTML || '';
            
            // Check for unavailable label element
            const unavailableLabel = buttonElement.querySelector?.('.unavailable-label');
            const hasUnavailableClass = buttonElement.classList?.contains('unavailable') || 
                                       innerHTML.includes('unavailable-label') ||
                                       innerHTML.includes('unavailable');
            
            console.log('[Yappy] Button content after render:', { 
              textContent, 
              innerHTML: innerHTML.substring(0, 500), // Limit log size
              hasUnavailableLabel: !!unavailableLabel,
              hasUnavailableClass,
              allAttributes: Array.from(buttonElement.attributes || []).map((attr: any) => ({
                name: attr.name,
                value: attr.value
              }))
            });
            
            if (textContent.includes('no está disponible') || 
                textContent.includes('no disponible') ||
                innerHTML.includes('no está disponible') ||
                textContent.includes('not available') ||
                unavailableLabel ||
                hasUnavailableClass) {
              console.warn('[Yappy] Error detected in button content:', { 
                textContent, 
                hasUnavailableLabel: !!unavailableLabel,
                hasUnavailableClass,
                merchantId,
                domainUrl,
                currentDomain: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
              });
              const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
              if (!error) {
                const errorMsg = `Yappy no está disponible. El dominio "${currentDomain}" podría no estar autorizado en tu panel de Yappy. Verifica en Yappy Comercial que: 1) El dominio esté exactamente como "${currentDomain}" (sin https://), 2) El merchant ID "${merchantId.substring(0, 8)}..." esté activo, 3) La clave secreta esté generada y configurada.`;
                setError(errorMsg);
                onError?.(errorMsg);
              }
            } else {
              console.log('[Yappy] Button appears to be ready and available');
            }
          }, 3000); // Increased delay to give Yappy more time to validate
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
  }, [merchantId, domainUrl, validationToken, orderToken, documentName, amount, description, orderId, returnUrl, customParams, playerId, paymentType, monthYear, notes, onSuccess, onError]);

  return (
    <div className={`space-y-2 ${className}`}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-6 sm:py-8">
          <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
          <p className="text-xs sm:text-sm text-gray-600">Cargando botón de pago Yappy...</p>
        </div>
      )}

      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs sm:text-sm text-red-800 font-medium mb-2">{error}</p>
          {error.includes('no está disponible') && typeof window !== 'undefined' && (
            <div className="text-xs text-red-700 space-y-1">
              <p>💡 <strong>Posibles causas:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (
                  <li>Estás en desarrollo local. Yappy requiere que el dominio esté autorizado. En producción, verifica que el dominio esté autorizado en tu panel de Yappy.</li>
                ) : (
                  <li>El dominio <code className="bg-red-100 px-1 rounded">{window.location.hostname}</code> no está autorizado en tu panel de Yappy</li>
                )}
                <li>El merchant ID no está activo o configurado correctamente</li>
                <li>Problema temporal con el servicio de Yappy</li>
              </ul>
              {window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                <p className="mt-2">Verifica en tu panel de Yappy que el dominio esté autorizado para este merchant ID.</p>
              )}
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
        <p className="text-xs text-gray-500 text-center px-2">
          🔒 Pago seguro procesado por Yappy Comercial
        </p>
      )}
    </div>
  );
}

