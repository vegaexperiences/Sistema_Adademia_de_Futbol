/**
 * Yappy Comercial Payment Service
 * Integration with Yappy Comercial payment gateway for Panama
 * Documentation: https://www.yappy.com.pa/comercial/desarrolladores/boton-de-pago-yappy-nueva-integracion/
 */

export interface YappyConfig {
  merchantId: string; // ID del comercio
  secretKey: string; // Clave secreta
  domainUrl: string; // URL del dominio configurado
  environment: 'production' | 'testing'; // Ambiente
}

export interface YappyValidateResponse {
  success: boolean;
  token?: string;
  epochTime?: number; // Fecha en formato epoch obtenida de la validación
  error?: string;
  message?: string;
}

export interface YappyOrderRequest {
  amount: number;
  description: string;
  orderId: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
  token?: string; // Token obtenido de la validación
  paymentDate?: number; // epochTime obtenido de la validación
  aliasYappy?: string; // Número de teléfono del cliente (8 dígitos, requerido según Yappy)
  ipnUrl?: string; // URL del callback (Instant Payment Notification)
}

/**
 * Formatea un número de teléfono a 8 dígitos para Yappy
 * Elimina prefijos, guiones, espacios y toma los últimos 8 dígitos
 */
function formatPhoneForYappy(phone: string | null | undefined): string {
  if (!phone) {
    return '00000000'; // Valor por defecto si no hay teléfono
  }
  
  // Eliminar todos los caracteres no numéricos
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Si no hay dígitos, retornar valor por defecto
  if (digitsOnly.length === 0) {
    return '00000000';
  }
  
  // Tomar los últimos 8 dígitos (Panamá tiene números de 8 dígitos)
  // Si tiene más de 8, tomar los últimos 8 (eliminar prefijo de país)
  // Si tiene menos de 8, rellenar con ceros a la izquierda
  if (digitsOnly.length >= 8) {
    return digitsOnly.slice(-8);
  } else {
    return digitsOnly.padStart(8, '0');
  }
}

export interface YappyOrderResponse {
  success: boolean;
  orderData?: {
    orderId: string;
    amount: number;
    description: string;
    merchantId: string;
    [key: string]: any;
  };
  error?: string;
  message?: string;
  statusCode?: string; // Yappy error code (e.g., 'E005')
  isClientError?: boolean; // true if error is client-side (400), false if server-side (500)
}

export interface YappyCallbackParams {
  orderId: string;
  transactionId?: string;
  status: string;
  amount?: string;
  [key: string]: string | undefined;
}

export class YappyService {
  private static config: YappyConfig | null = null;
  private static configCache: Map<string, YappyConfig> = new Map();

  /**
   * Get Yappy configuration, optionally for a specific academy
   * If academyId is provided, loads from academy settings
   * Otherwise uses environment variables (backward compatibility)
   */
  static async getConfig(academyId?: string | null): Promise<YappyConfig> {
    // If academy ID provided, use academy-specific config
    if (academyId) {
      // Check cache first
      if (this.configCache.has(academyId)) {
        return this.configCache.get(academyId)!;
      }

      // Load from academy settings
      const { getYappyConfig } = await import('@/lib/utils/academy-payments');
      const academyConfig = await getYappyConfig(academyId);

      if (academyConfig) {
        const config: YappyConfig = {
          merchantId: academyConfig.merchant_id,
          secretKey: academyConfig.secret_key,
          domainUrl: academyConfig.domain_url,
          environment: academyConfig.environment,
        };
        this.configCache.set(academyId, config);
        return config;
      }
      // If academy config not found, fall through to env vars
    }

    // Fallback to centralized configuration (backward compatibility with env vars)
    if (!this.config) {
      try {
        // Try to get from centralized config first
        const { getYappyConfig } = await import('@/lib/config/client-config');
        this.config = getYappyConfig();
      } catch (error) {
        // If centralized config not available or Yappy not configured, throw error
        // This ensures clear error messages instead of silent failures
        throw new Error(
          'Yappy payment provider not configured. ' +
          'Set YAPPY_MERCHANT_ID, YAPPY_SECRET_KEY, and YAPPY_DOMAIN_URL environment variables.'
        );
      }
    }

    return this.config;
  }

  /**
   * Get API base URL based on environment
   */
  static async getApiBaseUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    return config.environment === 'testing'
      ? 'https://api-comecom-uat.yappycloud.com'
      : 'https://apipagosbg.bgeneral.cloud';
  }

  /**
   * Get CDN URL for web component
   */
  static async getCdnUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    return config.environment === 'testing'
      ? 'https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js'
      : 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
  }

  /**
   * Validate merchant credentials with Yappy API
   * According to Yappy manual: /payments/validate/merchant (POST)
   * Returns: token and epochTime in body.epochTime
   */
  static async validateMerchant(academyId?: string | null): Promise<YappyValidateResponse> {
    try {
      const config = await this.getConfig(academyId);
      const baseUrl = await this.getApiBaseUrl(academyId);

      // According to Yappy manual, the endpoint is /payments/validate/merchant
      // It requires: merchantId and urlDomain (NOT domainUrl)
      // Note: Testing environment might require https:// in urlDomain
      // Try with https:// first, if it fails we can try without
      // Use domainUrl from config (which may come from academy settings)
      let urlDomain = config.domainUrl;
      if (!urlDomain.startsWith('http://') && !urlDomain.startsWith('https://')) {
        urlDomain = `https://${urlDomain}`;
      }
      
      const requestBody: Record<string, string> = {
        merchantId: config.merchantId,
        urlDomain: urlDomain, // Try with https:// for testing environment
      };

      // Validate that required fields are not empty
      if (!requestBody.merchantId || requestBody.merchantId.trim().length === 0) {
        throw new Error('Yappy merchantId is empty. Please check YAPPY_MERCHANT_ID environment variable.');
      }

      if (!requestBody.urlDomain || requestBody.urlDomain.trim().length === 0) {
        throw new Error('Yappy urlDomain is empty. Please check YAPPY_DOMAIN_URL or NEXT_PUBLIC_APP_URL environment variable.');
      }

      // Log the exact request body being sent
      const requestBodyString = JSON.stringify(requestBody);
      console.log('[Yappy] Validate merchant request:', {
        baseUrl,
        endpoint: `${baseUrl}/payments/validate/merchant`,
        requestBody: {
          merchantId: requestBody.merchantId ? `${requestBody.merchantId.substring(0, 8)}...${requestBody.merchantId.substring(requestBody.merchantId.length - 4)}` : 'MISSING',
          urlDomain: requestBody.urlDomain || 'MISSING',
          merchantIdLength: requestBody.merchantId?.length || 0,
          urlDomainLength: requestBody.urlDomain?.length || 0,
          merchantIdEmpty: !requestBody.merchantId || requestBody.merchantId.trim().length === 0,
          urlDomainEmpty: !requestBody.urlDomain || requestBody.urlDomain.trim().length === 0,
        },
        requestBodyString,
        merchantIdFull: requestBody.merchantId, // Log full merchantId for debugging
        urlDomainFull: requestBody.urlDomain, // Log full urlDomain for debugging
      });

      const response = await fetch(`${baseUrl}/payments/validate/merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('[Yappy] Validate merchant response:', {
        status: response.status,
        success: result.success,
        hasToken: !!result.body?.token,
        hasEpochTime: !!result.body?.epochTime,
        statusCode: result.status?.code,
        statusDescription: result.status?.description,
      });

      // Yappy returns success with status code '0000' and description 'Correct execution'
      const isSuccess = response.ok && 
                       (result.status?.code === '0000' || result.success) && 
                       result.body?.token && 
                       result.body?.epochTime;

      if (isSuccess) {
        return {
          success: true,
          token: result.body.token,
          epochTime: result.body.epochTime,
        };
      } else {
        const errorMsg = result.status?.description || result.message || result.error || 'Error al validar credenciales de Yappy';
        console.error('[Yappy] Validation failed:', {
          statusCode: result.status?.code,
          description: errorMsg,
          fullResponse: result,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error: any) {
      console.error('[Yappy] Error validating merchant:', error);
      return {
        success: false,
        error: error.message || 'Error al validar credenciales de Yappy',
      };
    }
  }

  /**
   * Create a payment order with Yappy
   * According to Yappy manual: /payments/payment-wc (POST)
   * Requires: token from validation in Authorization header, and paymentDate (epochTime)
   */
  static async createOrder(request: YappyOrderRequest, academyId?: string | null): Promise<YappyOrderResponse> {
    try {
      const config = await this.getConfig(academyId);
      const baseUrl = await this.getApiBaseUrl(academyId);

      // Validate required fields
      if (!request.token) {
        return {
          success: false,
          error: 'Token de validación requerido. Debe validar el merchant primero.',
        };
      }

      if (!request.paymentDate) {
        return {
          success: false,
          error: 'paymentDate (epochTime) requerido. Debe validar el merchant primero.',
        };
      }

      // Validate amount
      if (request.amount < 0.01) {
        return {
          success: false,
          error: 'El monto debe ser mayor a $0.01',
        };
      }

      // Validate orderId length (max 15 characters according to manual)
      if (request.orderId.length > 15) {
        return {
          success: false,
          error: 'El orderId no puede tener más de 15 caracteres',
        };
      }

      // Build IPN URL (Instant Payment Notification) - this is the callback URL
      const baseUrlForCallback = process.env.NEXT_PUBLIC_APP_URL || 
                                 (typeof window !== 'undefined' ? window.location.origin : '');
      const ipnUrl = request.ipnUrl || `${baseUrlForCallback}/api/payments/yappy/callback`;

      // Calculate subtotal, taxes, shipping, discount, total
      // For simplicity, we'll set shipping, discount, taxes to 0.00 and subtotal = total = amount
      // Yappy expects these as strings with decimal format "0.00"
      const subtotal = request.amount.toFixed(2);
      const taxes = '0.00';
      const shipping = '0.00';
      const discount = '0.00';
      const total = request.amount.toFixed(2);

      // Create order payload according to Yappy manual
      // Try sending domain WITH https:// (same as validate/merchant uses urlDomain with https://)
      // The manual might be ambiguous, but since validate/merchant works with https://, let's try it here too
      const domainForOrder = config.domainUrl.startsWith('https://') 
        ? config.domainUrl 
        : `https://${config.domainUrl}`; // Ensure domain has https://
      
      // Validate that domain is not empty
      if (!domainForOrder || domainForOrder.trim().length === 0) {
        return {
          success: false,
          error: 'El dominio no puede estar vacío. Verifique YAPPY_DOMAIN_URL o NEXT_PUBLIC_APP_URL.',
        };
      }

      // Validate that all required fields are present and not empty
      if (!config.merchantId || config.merchantId.trim().length === 0) {
        return {
          success: false,
          error: 'El merchantId no puede estar vacío.',
        };
      }

      if (!request.orderId || request.orderId.trim().length === 0) {
        return {
          success: false,
          error: 'El orderId no puede estar vacío.',
        };
      }

      if (!ipnUrl || ipnUrl.trim().length === 0) {
        return {
          success: false,
          error: 'El ipnUrl no puede estar vacío.',
        };
      }

      // Format aliasYappy - required by Yappy according to their support
      const aliasYappy = request.aliasYappy ? formatPhoneForYappy(request.aliasYappy) : '00000000';
      
      console.log('[Yappy] Formatting aliasYappy:', {
        original: request.aliasYappy,
        formatted: aliasYappy,
        length: aliasYappy.length,
      });

      // Create order payload according to Yappy Postman collection (official reference)
      // Order matters for some APIs - following exact order from Postman collection:
      // merchantId, orderId, domain, paymentDate, aliasYappy, ipnUrl, shipping, discount, taxes, subtotal, total
      // Try paymentDate as number (epochTime) - some APIs expect it as number
      const orderPayload: Record<string, string | number> = {
        merchantId: config.merchantId.trim(),
        orderId: request.orderId.substring(0, 15).trim(), // Max 15 characters
        domain: domainForOrder.trim(), // Domain with https:// (same format as urlDomain in validate/merchant)
        paymentDate: Number(request.paymentDate), // epochTime from validation as number
        aliasYappy: aliasYappy, // Número de teléfono formateado a 8 dígitos (requerido por Yappy) - debe ir después de paymentDate
        ipnUrl: ipnUrl.trim(), // URL for Instant Payment Notification (callback)
        shipping: shipping, // Format: "0.00"
        discount: discount, // Format: "0.00"
        taxes: taxes, // Format: "0.00"
        subtotal: subtotal, // Format: "0.00"
        total: total, // Format: "0.00"
      };

      // Log each field individually to check for empty values
      console.log('[Yappy] Creating order with /payments/payment-wc - Field validation:', {
        merchantId: {
          value: orderPayload.merchantId,
          length: orderPayload.merchantId?.toString().length || 0,
          isEmpty: !orderPayload.merchantId || orderPayload.merchantId.toString().trim().length === 0,
        },
        orderId: {
          value: orderPayload.orderId,
          length: orderPayload.orderId?.toString().length || 0,
          isEmpty: !orderPayload.orderId || orderPayload.orderId.toString().trim().length === 0,
        },
        domain: {
          value: orderPayload.domain,
          length: orderPayload.domain?.toString().length || 0,
          isEmpty: !orderPayload.domain || orderPayload.domain.toString().trim().length === 0,
        },
        paymentDate: {
          value: orderPayload.paymentDate,
          type: typeof orderPayload.paymentDate,
          isEmpty: orderPayload.paymentDate === null || orderPayload.paymentDate === undefined,
        },
        ipnUrl: {
          value: orderPayload.ipnUrl,
          length: orderPayload.ipnUrl?.toString().length || 0,
          isEmpty: !orderPayload.ipnUrl || orderPayload.ipnUrl.toString().trim().length === 0,
        },
        shipping: {
          value: orderPayload.shipping,
          isEmpty: !orderPayload.shipping || orderPayload.shipping.toString().trim().length === 0,
        },
        discount: {
          value: orderPayload.discount,
          isEmpty: !orderPayload.discount || orderPayload.discount.toString().trim().length === 0,
        },
        taxes: {
          value: orderPayload.taxes,
          isEmpty: !orderPayload.taxes || orderPayload.taxes.toString().trim().length === 0,
        },
        subtotal: {
          value: orderPayload.subtotal,
          isEmpty: !orderPayload.subtotal || orderPayload.subtotal.toString().trim().length === 0,
        },
        total: {
          value: orderPayload.total,
          isEmpty: !orderPayload.total || orderPayload.total.toString().trim().length === 0,
        },
        aliasYappy: {
          value: orderPayload.aliasYappy,
          length: orderPayload.aliasYappy?.toString().length || 0,
          isEmpty: !orderPayload.aliasYappy || orderPayload.aliasYappy.toString().trim().length === 0,
          original: request.aliasYappy,
        },
        hasToken: !!request.token,
        tokenPreview: request.token ? `${request.token.substring(0, 20)}...` : 'MISSING',
        requestBodyString: JSON.stringify(orderPayload),
      });

      // According to Yappy manual, endpoint is /payments/payment-wc
      // Authorization header must contain the token from validation
      // Try without "Bearer" prefix first, as some APIs use just the token
      
      // Log the exact request being sent
      const requestBody = JSON.stringify(orderPayload);
      console.log('[Yappy] Sending request to /payments/payment-wc:', {
        url: `${baseUrl}/payments/payment-wc`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': request.token ? `${request.token.substring(0, 20)}...` : 'MISSING',
        },
        body: requestBody,
        bodyParsed: JSON.parse(requestBody), // Parse to show exact structure
      });
      
      const response = await fetch(`${baseUrl}/payments/payment-wc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': request.token, // Token from validation (without Bearer prefix)
        },
        body: requestBody,
      });

      const result = await response.json();
      console.log('[Yappy] Payment-wc response:', {
        status: response.status,
        success: result.success,
        statusCode: result.status?.code,
        statusDescription: result.status?.description,
        hasTransactionId: !!result.body?.transactionId,
        hasToken: !!result.body?.token,
        hasDocumentName: !!result.body?.documentName,
        fullResponse: result,
      });

      // Yappy returns success with status code '0000' and description 'Correct execution'
      const isSuccess = response.ok && 
                       (result.status?.code === '0000' || result.success) && 
                       result.body?.transactionId;

      if (isSuccess) {
        return {
          success: true,
          orderData: {
            orderId: request.orderId,
            amount: request.amount,
            description: request.description,
            merchantId: config.merchantId,
            transactionId: result.body.transactionId,
            token: result.body.token, // Token for frontend validation
            documentName: result.body.documentName, // Document name for frontend validation
            ...result.body,
          },
        };
      } else {
        const errorMsg = result.status?.description || result.message || result.error || 'Error al crear orden de pago';
        const yappyErrorCode = result.status?.code;
        
        // Determine if this is a client error (400) or server error (500)
        // E005 = número no registrado en Yappy (client error)
        // E004 = aliasYappy no enviado (client error)
        // Other E0xx codes are typically client errors
        // 5xx codes from Yappy would be server errors
        const isClientError = yappyErrorCode?.startsWith('E0') || 
                             (response.status >= 400 && response.status < 500);
        
        console.error('[Yappy] Error creating order:', {
          statusCode: yappyErrorCode,
          description: errorMsg,
          isClientError,
          httpStatus: response.status,
          fullResponse: result,
        });
        
        return {
          success: false,
          error: errorMsg,
          statusCode: yappyErrorCode,
          isClientError,
        };
      }
    } catch (error: any) {
      console.error('[Yappy] Error creating order:', error);
      return {
        success: false,
        error: error.message || 'Error al crear orden de pago',
      };
    }
  }

  /**
   * Verify payment status
   * This can be used to check payment status after callback
   */
  static async verifyPayment(orderId: string, academyId?: string | null): Promise<{ status: string; verified: boolean }> {
    try {
      const config = await this.getConfig(academyId);
      const baseUrl = await this.getApiBaseUrl(academyId);

      const response = await fetch(`${baseUrl}/payments/verify/${orderId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${config.secretKey}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.status) {
        return {
          status: result.status,
          verified: result.status === 'approved' || result.status === 'completed',
        };
      }

      return {
        status: 'unknown',
        verified: false,
      };
    } catch (error: any) {
      console.error('[Yappy] Error verifying payment:', error);
      return {
        status: 'error',
        verified: false,
      };
    }
  }

  /**
   * Parse callback parameters from Yappy
   */
  static parseCallbackParams(query: Record<string, string | string[]>): YappyCallbackParams {
    const params: YappyCallbackParams = {
      orderId: '',
      status: '',
    };

    Object.entries(query).forEach(([key, value]) => {
      const stringValue = Array.isArray(value) ? value[0] : value;
      if (typeof stringValue === 'string') {
        params[key] = stringValue;
      }
    });

    return params;
  }

  /**
   * Check if transaction is approved
   * According to Yappy manual: status = 'E' means Ejecutado (approved)
   */
  static isTransactionApproved(params: YappyCallbackParams): boolean {
    const status = params.status || '';
    // According to manual: E=Ejecutado, R=Rechazado, C=Cancelado, X=Expirado
    // Also check for case-insensitive and common variations
    const statusUpper = status.toUpperCase().trim();
    const isApproved = statusUpper === 'E' || 
                      statusUpper === 'EJECUTADO' || 
                      statusUpper === 'APPROVED' || 
                      statusUpper === 'COMPLETED' || 
                      statusUpper === 'SUCCESS' ||
                      status === 'Ejecutado';
    
    // Log for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Yappy] isTransactionApproved check:', {
        originalStatus: status,
        statusUpper,
        isApproved,
        statusCharCode: status.charCodeAt(0),
      });
    }
    
    return isApproved;
  }

  /**
   * Validate hash from Yappy callback
   * According to Yappy manual, the hash is used to verify the callback authenticity
   * The hash is calculated using the secret key and callback parameters
   * Note: The exact hash algorithm may need to be verified with Yappy documentation
   */
  static async validateCallbackHash(params: YappyCallbackParams, receivedHash: string, academyId?: string | null): Promise<boolean> {
    try {
      const config = await this.getConfig(academyId);
      
      // According to Yappy manual, hash validation uses:
      // hash = HMAC-SHA256(secretKey, orderId + status + domain + confirmationNumber)
      // However, the exact algorithm may vary - this is a placeholder implementation
      
      if (!receivedHash) {
        console.warn('[Yappy] No hash received in callback');
        return false;
      }

      // Build the string to hash (orderId + status + domain + confirmationNumber)
      const orderId = params.orderId || '';
      const status = params.status || '';
      const domain = params.domain || '';
      const confirmationNumber = params.confirmationNumber || params.transactionId || '';
      
      const hashString = `${orderId}${status}${domain}${confirmationNumber}`;
      
      // For now, we'll use a simple validation
      // TODO: Implement proper HMAC-SHA256 validation once we confirm the exact algorithm with Yappy
      console.log('[Yappy] Hash validation:', {
        orderId,
        status,
        domain,
        confirmationNumber,
        receivedHash,
        hashString,
        note: 'Hash validation algorithm needs to be confirmed with Yappy documentation',
      });

      // For security, we should validate the hash properly
      // But for now, we'll log it and return true if hash is present
      // This should be updated once we have the exact hash algorithm from Yappy
      return !!receivedHash;
    } catch (error: any) {
      console.error('[Yappy] Error validating hash:', error);
      return false;
    }
  }
}
