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
  const [isLoading, setIsLoading] = useState(true); // Start as true to show loading while script loads
  const [isInitializing, setIsInitializing] = useState(false); // Track if we're initializing
  const [merchantId, setMerchantId] = useState<string>('');
  const [domainUrl, setDomainUrl] = useState<string>('');
  const [validationToken, setValidationToken] = useState<string>('');
  const [orderToken, setOrderToken] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false); // Track if order has been created
  const [buttonReady, setButtonReady] = useState(false); // Track if button is ready to be clicked
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false); // Keep ref for checking if script element exists
  const buttonRenderedRef = useRef(false); // Track if button has been rendered to avoid re-renders
  const observerRef = useRef<MutationObserver | null>(null); // Store observer reference for cleanup
  const clickInterceptorRef = useRef<((e: Event) => void) | null>(null); // Store click interceptor

  // Load script and config immediately (without creating order)
  useEffect(() => {
    const loadScriptAndConfig = async () => {
      try {
        // Step 1: Get config
        const configResponse = await fetch('/api/payments/yappy/config');
        const configData = await configResponse.json();
        
        if (!configData.success || !configData.merchantId) {
          throw new Error(configData.error || 'Error al obtener configuración de Yappy');
        }

        setMerchantId(configData.merchantId);
        if (configData.domainUrl) {
          setDomainUrl(configData.domainUrl);
        }

        // Step 2: Load Yappy script
        if (document.querySelector('script[src*="btn-yappy"]')) {
          scriptLoadedRef.current = true;
          setScriptLoaded(true);
          setIsLoading(false);
          setButtonReady(true);
          return;
        }

        const cdnUrl = configData.cdnUrl || 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
        const script = document.createElement('script');
        script.src = cdnUrl;
        script.type = 'module';
        script.async = true;
        script.onload = () => {
          scriptLoadedRef.current = true;
          setScriptLoaded(true);
          setIsLoading(false);
          setButtonReady(true);
          console.log('[Yappy] Script loaded, button ready');
        };
        script.onerror = () => {
          setError('Error al cargar el componente de Yappy');
          setIsLoading(false);
          onError?.('Error al cargar el componente de Yappy');
        };
        document.head.appendChild(script);
      } catch (err: any) {
        console.error('[Yappy] Error loading script/config:', err);
        setError(err.message || 'Error al inicializar Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al inicializar Yappy');
      }
    };

    loadScriptAndConfig();
  }, [onError]);

  // Handle click to create order (called when user clicks the Yappy button)
  const handleCreateOrder = async () => {
    if (isInitializing || orderCreated) return; // Prevent multiple clicks
    
    setIsInitializing(true);
    setError(null);

    try {
      // Step 1: Validate merchant to get token and epochTime
      console.log('[Yappy] Validating merchant...');
      const validateResponse = await fetch('/api/payments/yappy/validate', {
        method: 'POST',
      });
      const validateData = await validateResponse.json();
      
      if (!validateData.success || !validateData.token || !validateData.epochTime) {
        throw new Error(validateData.error || 'Error al validar credenciales de Yappy');
      }

      setValidationToken(validateData.token);

      // Step 2: Create order using token and epochTime
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
          playerId: playerId || undefined,
          tutorPhone: customParams?.tutorPhone || undefined,
        }),
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success || !orderData.orderData) {
        throw new Error(orderData.error || 'Error al crear orden de pago');
      }

      setOrderToken(orderData.orderData.token || '');
      setDocumentName(orderData.orderData.documentName || '');
      setOrderCreated(true);
      setIsInitializing(false);
      
      // Update button attributes with real order data
      if (containerRef.current) {
        const yappyButton = containerRef.current.querySelector('btn-yappy') as any;
        if (yappyButton) {
          yappyButton.setAttribute('token', orderData.orderData.token || '');
          if (orderData.orderData.documentName) {
            yappyButton.setAttribute('document-name', orderData.orderData.documentName);
          }
          console.log('[Yappy] Button updated with order data');
          
          // After updating, trigger click on the button to proceed with payment
          // Wait a bit for the button to process the new attributes
          setTimeout(() => {
            try {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
              });
              yappyButton.dispatchEvent(clickEvent);
              console.log('[Yappy] Click event dispatched after order creation');
            } catch (err) {
              console.warn('[Yappy] Could not dispatch click event, user will need to click again:', err);
            }
          }, 300);
        }
      }
    } catch (err: any) {
      console.error('[Yappy] Error creating order:', err);
      setError(err.message || 'Error al crear orden de pago');
      setIsInitializing(false);
      onError?.(err.message || 'Error al crear orden de pago');
    }
  };

  // Render Yappy button when script is loaded (before order is created)
  useEffect(() => {
    if (!merchantId || !scriptLoaded || buttonRenderedRef.current) return;

    const renderButton = () => {
      try {
        // Check if custom element is defined
        if (!customElements.get('btn-yappy')) {
          setTimeout(renderButton, 100);
          return;
        }

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

        // Create the btn-yappy element (without token/orderToken initially)
        const yappyButton = document.createElement('btn-yappy');
        
        // Set basic attributes (order will be created on click)
        yappyButton.setAttribute('merchant-id', merchantId);
        yappyButton.setAttribute('amount', amount.toFixed(2));
        yappyButton.setAttribute('description', description.substring(0, 200));
        yappyButton.setAttribute('order-id', orderId.substring(0, 15));
        yappyButton.setAttribute('return-url', returnUrlWithParams.toString());
        
        if (domainUrl) {
          yappyButton.setAttribute('domain-url', domainUrl);
        }

        // Intercept clicks on the button to create order first
        const clickInterceptor = async (e: Event) => {
          if (orderCreated) {
            // Order already created, allow normal click
            return;
          }

          if (isInitializing) {
            // Already initializing, prevent click
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return;
          }

          // Prevent the click from reaching Yappy
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // Create order first
          await handleCreateOrder();
          
          // After order is created, trigger a new click event on the button
          // This will allow Yappy to process the payment
          setTimeout(() => {
            if (orderCreated && containerRef.current) {
              const updatedButton = containerRef.current.querySelector('btn-yappy') as any;
              if (updatedButton) {
                // Create a synthetic click event
                const clickEvent = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                });
                updatedButton.dispatchEvent(clickEvent);
              }
            }
          }, 100);
        };

        // Add click interceptor to button container and button itself
        if (containerRef.current) {
          containerRef.current.addEventListener('click', clickInterceptor, true);
        }
        yappyButton.addEventListener('click', clickInterceptor, true); // Use capture phase
        clickInterceptorRef.current = clickInterceptor;

        // Listen for success/error events
        yappyButton.addEventListener('yappy-success', (event: any) => {
          console.log('[Yappy] Payment success:', event.detail);
          const transactionId = event.detail?.transactionId || event.detail?.orderId || orderId;
          onSuccess?.(transactionId);
        });

        yappyButton.addEventListener('yappy-error', (event: any) => {
          console.error('[Yappy] Payment error:', event.detail);
          const errorMsg = event.detail?.message || event.detail?.error || 'Error al procesar el pago con Yappy';
          setError(errorMsg);
          onError?.(errorMsg);
        });

        if (containerRef.current) {
          containerRef.current.appendChild(yappyButton);
          buttonRenderedRef.current = true;
          setIsLoading(false);
          console.log('[Yappy] Button rendered (order will be created on click)');
        }
      } catch (err: any) {
        console.error('[Yappy] Error rendering button:', err);
        setError('Error al renderizar el botón de Yappy');
        setIsLoading(false);
        onError?.(err.message || 'Error al renderizar el botón de Yappy');
      }
    };

    setTimeout(renderButton, 200);
  }, [merchantId, scriptLoaded, amount, description, orderId, returnUrl, domainUrl, customParams, playerId, paymentType, monthYear, notes, onSuccess, onError]);

  // Update button with order data when order is created
  useEffect(() => {
    if (!orderCreated || !orderToken || !containerRef.current) return;

    const yappyButton = containerRef.current.querySelector('btn-yappy') as any;
    if (yappyButton) {
      yappyButton.setAttribute('token', orderToken);
      if (documentName) {
        yappyButton.setAttribute('document-name', documentName);
      }
      
      // Remove click interceptor and allow normal button behavior
      if (clickInterceptorRef.current) {
        yappyButton.removeEventListener('click', clickInterceptorRef.current, true);
        if (containerRef.current) {
          containerRef.current.removeEventListener('click', clickInterceptorRef.current, true);
        }
        clickInterceptorRef.current = null;
      }
      
      console.log('[Yappy] Button updated with order data, ready for payment');
    }
  }, [orderCreated, orderToken, documentName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (clickInterceptorRef.current && containerRef.current) {
        const yappyButton = containerRef.current.querySelector('btn-yappy');
        if (yappyButton) {
          yappyButton.removeEventListener('click', clickInterceptorRef.current, true);
        }
      }
    };
  }, []);

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

      {/* Container for Yappy web component - always show when script is loaded */}
      {!isLoading && !error && (
        <div className="relative min-h-[48px] touch-manipulation">
          {!orderCreated && isInitializing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <Loader2 className="animate-spin text-blue-600" size={20} />
              <span className="ml-2 text-sm text-gray-700">Creando orden...</span>
            </div>
          )}
          <div 
            ref={containerRef}
            onClick={async (e) => {
              // Only intercept if order not created and not initializing
              if (!orderCreated && !isInitializing) {
                const target = e.target as HTMLElement;
                // Check if click is on the Yappy button or its children
                if (target.closest('btn-yappy')) {
                  e.preventDefault();
                  e.stopPropagation();
                  await handleCreateOrder();
                }
              }
            }}
          />
        </div>
      )}

      {!isLoading && !error && buttonReady && (
        <p className="text-xs text-gray-500 text-center px-2">
          🔒 Pago seguro procesado por Yappy Comercial
        </p>
      )}
    </div>
  );
}
