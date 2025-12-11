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
  const [isLoading, setIsLoading] = useState(false); // Start as false - no loading until user clicks
  const [isInitializing, setIsInitializing] = useState(false); // Track if we're initializing
  const [merchantId, setMerchantId] = useState<string>('');
  const [domainUrl, setDomainUrl] = useState<string>('');
  const [validationToken, setValidationToken] = useState<string>('');
  const [orderToken, setOrderToken] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false); // Track if order has been created
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false); // Keep ref for checking if script element exists
  const buttonRenderedRef = useRef(false); // Track if button has been rendered to avoid re-renders
  const observerRef = useRef<MutationObserver | null>(null); // Store observer reference for cleanup

  // Handle click to initialize Yappy and create order
  const handleInitializeYappy = async () => {
    if (isInitializing || orderCreated) return; // Prevent multiple clicks
    
    setIsInitializing(true);
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get config
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

      // For enrollment, store enrollment data in sessionStorage before redirecting
      if (customParams?.type === 'enrollment' && typeof window !== 'undefined') {
        // The enrollment data should already be stored in sessionStorage by PaymentStep
        // but we ensure it's available here
        console.log('[Yappy] Enrollment payment - data should be in sessionStorage');
      }

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
      setOrderCreated(true);
      setIsInitializing(false);
      // Don't set isLoading to false here - let the script loading handle it
    } catch (err: any) {
      console.error('[Yappy] Error initializing:', err);
      setError(err.message || 'Error al inicializar Yappy');
      setIsLoading(false);
      setIsInitializing(false);
      onError?.(err.message || 'Error al inicializar Yappy');
    }
  };

  // Load Yappy web component script (only after validation and order creation)
  useEffect(() => {
    if (!merchantId || !validationToken || !orderToken || scriptLoaded) return;

    const loadScript = () => {
      try {
        // Check if script is already loaded
        if (document.querySelector('script[src*="btn-yappy"]')) {
          scriptLoadedRef.current = true;
          setScriptLoaded(true);
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
              scriptLoadedRef.current = true;
              setScriptLoaded(true);
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
              scriptLoadedRef.current = true;
              setScriptLoaded(true);
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
  }, [merchantId, validationToken, orderToken, scriptLoaded, onError]);

  // Render the Yappy button component when script is loaded and order is created
  useEffect(() => {
    console.log('[Yappy] Render effect triggered:', {
      hasMerchantId: !!merchantId,
      hasValidationToken: !!validationToken,
      hasOrderToken: !!orderToken,
      hasContainer: !!containerRef.current,
      scriptLoaded: scriptLoaded,
      buttonAlreadyRendered: buttonRenderedRef.current,
    });

    // If button is already rendered, don't render again
    if (buttonRenderedRef.current) {
      console.log('[Yappy] Button already rendered, skipping re-render');
      return;
    }

    if (!merchantId || !validationToken || !orderToken || !containerRef.current || !scriptLoaded) {
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
        // Use a flag to track if we've seen the initial "no disponible" message (which is normal during init)
        let hasSeenInitialUnavailable = false;
        let unavailableMessageTimeout: NodeJS.Timeout | null = null;
        let buttonInitTime = Date.now(); // Track when button was initialized
        const INITIALIZATION_GRACE_PERIOD = 5000; // 5 seconds grace period for initialization (increased)

        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
              const buttonElement = yappyButton as any;
              const textContent = buttonElement.textContent || buttonElement.innerText || '';
              const timeSinceInit = Date.now() - buttonInitTime;
              
              // Check if Yappy is showing an error message in the DOM
              const hasUnavailableMessage = textContent.includes('no está disponible') || 
                  textContent.includes('no disponible') ||
                  textContent.includes('intenta más tarde') ||
                  textContent.includes('try again later') ||
                  textContent.includes('not available');
              
              if (hasUnavailableMessage) {
                // If we're still in the grace period, ignore the message
                if (timeSinceInit < INITIALIZATION_GRACE_PERIOD) {
                  console.log('[Yappy] "No disponible" message detected during initialization (normal), ignoring...', {
                    timeSinceInit,
                    gracePeriod: INITIALIZATION_GRACE_PERIOD,
                  });
                  return; // Don't process this message during initialization
                }

                // Clear any existing timeout
                if (unavailableMessageTimeout) {
                  clearTimeout(unavailableMessageTimeout);
                }

                // If this is the first time we see the message after grace period, mark it and wait
                if (!hasSeenInitialUnavailable) {
                  hasSeenInitialUnavailable = true;
                  console.log('[Yappy] "No disponible" message detected after initialization, checking if persistent...');
                  
                  // Set a timeout to check if the message persists
                  unavailableMessageTimeout = setTimeout(() => {
                    const currentTextContent = buttonElement.textContent || buttonElement.innerText || '';
                    const stillUnavailable = currentTextContent.includes('no está disponible') || 
                        currentTextContent.includes('no disponible') ||
                        currentTextContent.includes('intenta más tarde') ||
                        currentTextContent.includes('try again later') ||
                        currentTextContent.includes('not available');
                    
                    if (stillUnavailable && !error) {
                      console.warn('[Yappy] Error message persisted after initialization:', currentTextContent);
                      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
                      const errorMsg = `Yappy no está disponible. El dominio "${currentDomain}" podría no estar autorizado en tu panel de Yappy. Verifica la configuración del dominio en Yappy Comercial.`;
                      setError(errorMsg);
                      onError?.(errorMsg);
                    } else {
                      console.log('[Yappy] Button recovered from unavailable state');
                    }
                  }, 2000); // Wait 2 more seconds to confirm it's persistent
                } else {
                  // If we've already seen the initial message and it appears again after grace period, it's a real error
                  if (timeSinceInit > INITIALIZATION_GRACE_PERIOD && !error) {
                    console.warn('[Yappy] Error message detected in DOM after initialization:', textContent);
                    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
                    const errorMsg = `Yappy no está disponible. El dominio "${currentDomain}" podría no estar autorizado en tu panel de Yappy. Verifica la configuración del dominio en Yappy Comercial.`;
                    setError(errorMsg);
                    onError?.(errorMsg);
                  }
                }
              } else {
                // If the message is gone, clear the timeout and reset the flag
                if (unavailableMessageTimeout) {
                  clearTimeout(unavailableMessageTimeout);
                  unavailableMessageTimeout = null;
                }
                if (hasSeenInitialUnavailable && error) {
                  // Button recovered, clear error
                  console.log('[Yappy] Button recovered, clearing error');
                  setError(null);
                }
              }
            }
          });
        });

        // Store observer reference for cleanup
        observerRef.current = observer;

        // Start observing the button element
        observer.observe(yappyButton, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        if (containerRef.current) {
          containerRef.current.appendChild(yappyButton);
          
          // Mark button as rendered to prevent re-renders
          buttonRenderedRef.current = true;
          
          // Track initialization time for error detection
          const buttonInitTime = Date.now();
          if (typeof window !== 'undefined') {
            (window as any).__yappyInitTime = buttonInitTime;
          }
          
          // Set loading to false only after button is rendered
          setIsLoading(false);
          console.log('[Yappy] Button element added to DOM');
          
          // Check after grace period if the button shows a persistent error
          // Only show error if message persists after initialization grace period
          setTimeout(() => {
            const buttonElement = yappyButton as any;
            const textContent = buttonElement.textContent || buttonElement.innerText || '';
            const innerHTML = buttonElement.innerHTML || '';
            const timeSinceInit = Date.now() - buttonInitTime;
            
            // Only check for errors if we're past the grace period
            if (timeSinceInit < INITIALIZATION_GRACE_PERIOD) {
              console.log('[Yappy] Skipping error check - still in initialization grace period', {
                timeSinceInit,
                gracePeriod: INITIALIZATION_GRACE_PERIOD,
              });
              return;
            }
            
            // Check for unavailable label element
            const unavailableLabel = buttonElement.querySelector?.('.unavailable-label');
            const hasUnavailableClass = buttonElement.classList?.contains('unavailable') || 
                                       innerHTML.includes('unavailable-label') ||
                                       innerHTML.includes('unavailable');
            
            const hasUnavailableMessage = textContent.includes('no está disponible') || 
                textContent.includes('no disponible') ||
                innerHTML.includes('no está disponible') ||
                textContent.includes('not available');
            
            console.log('[Yappy] Button content check (after grace period):', { 
              textContent: textContent.substring(0, 100),
              hasUnavailableMessage,
              hasUnavailableLabel: !!unavailableLabel,
              hasUnavailableClass,
              timeSinceInit,
            });
            
            // Only show error if message persists after grace period AND we haven't already set an error
            if ((hasUnavailableMessage || unavailableLabel || hasUnavailableClass) && !error) {
              console.warn('[Yappy] Persistent error detected in button content after grace period:', { 
                textContent, 
                hasUnavailableLabel: !!unavailableLabel,
                hasUnavailableClass,
                merchantId,
                domainUrl,
                currentDomain: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
              });
              const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
              const errorMsg = `Yappy no está disponible. El dominio "${currentDomain}" podría no estar autorizado en tu panel de Yappy. Verifica en Yappy Comercial que: 1) El dominio esté exactamente como "${currentDomain}" (sin https://), 2) El merchant ID "${merchantId.substring(0, 8)}..." esté activo, 3) La clave secreta esté generada y configurada.`;
              setError(errorMsg);
              onError?.(errorMsg);
            } else if (!hasUnavailableMessage && !unavailableLabel && !hasUnavailableClass) {
              console.log('[Yappy] Button appears to be ready and available');
            }
          }, INITIALIZATION_GRACE_PERIOD + 1000); // Check after grace period + 1 second buffer
        }
      } catch (err: any) {
        console.error('[Yappy] Error rendering button:', err);
        setError('Error al renderizar el botón de Yappy');
        onError?.('Error al renderizar el botón de Yappy');
      }
    };

    // Wait a bit for the module to fully load
    setTimeout(renderButton, 200);

    // Cleanup function to disconnect observer when component unmounts or dependencies change
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [merchantId, domainUrl, validationToken, orderToken, documentName, scriptLoaded, amount, description, orderId, returnUrl, customParams, playerId, paymentType, monthYear, notes, onSuccess, onError]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Show initial button if order hasn't been created yet */}
      {!orderCreated && !isLoading && !error && (
        <button
          onClick={handleInitializeYappy}
          disabled={isInitializing}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
        >
          {isInitializing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Enviando matrícula e inicializando Yappy...</span>
            </>
          ) : (
            <>
              <span>💳 Enviar Matrícula y Pagar con Yappy</span>
            </>
          )}
        </button>
      )}

      {isLoading && orderCreated && (
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
          {!orderCreated && (
            <button
              onClick={handleInitializeYappy}
              disabled={isInitializing}
              className="mt-3 w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Container for Yappy web component - only show when order is created */}
      {orderCreated && (
        <div 
          ref={containerRef}
          className={isLoading ? 'hidden' : 'min-h-[48px] touch-manipulation'}
        />
      )}

      {orderCreated && !isLoading && !error && (
        <p className="text-xs text-gray-500 text-center px-2">
          🔒 Pago seguro procesado por Yappy Comercial
        </p>
      )}
    </div>
  );
}

