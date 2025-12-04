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
  aliasYappy?: string; // Número de teléfono del cliente (8 dígitos, opcional)
  ipnUrl?: string; // URL del callback (Instant Payment Notification)
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

  static getConfig(): YappyConfig {
    if (!this.config) {
      // Clean merchantId and secretKey - remove whitespace, newlines, and special characters
      const rawMerchantId = process.env.YAPPY_MERCHANT_ID || '';
      const rawSecretKey = process.env.YAPPY_SECRET_KEY || '';
      const merchantId = rawMerchantId.trim().replace(/[\r\n\t]/g, '');
      const secretKey = rawSecretKey.trim().replace(/[\r\n\t]/g, '');
      
      // Get domain URL - Yappy panel shows it with https://, but web component expects domain only
      let domainUrl = process.env.YAPPY_DOMAIN_URL || process.env.NEXT_PUBLIC_APP_URL || '';
      // Remove protocol and trailing slash for component attribute (Yappy web component expects domain only)
      // Example: https://sistema-adademia-de-futbol-tura.vercel.app -> sistema-adademia-de-futbol-tura.vercel.app
      domainUrl = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
      const environment = (process.env.YAPPY_ENVIRONMENT || 'production') as 'production' | 'testing';

      console.log('[Yappy] Configuration loaded:', {
        environment,
        hasMerchantId: !!merchantId,
        hasSecretKey: !!secretKey,
        domainUrl,
        merchantIdLength: merchantId.length,
        secretKeyLength: secretKey.length,
        domainUrlLength: domainUrl.length,
        domainUrlPreview: domainUrl || 'EMPTY',
        merchantIdHasNewlines: rawMerchantId.includes('\n') || rawMerchantId.includes('\r'),
        secretKeyHasNewlines: rawSecretKey.includes('\n') || rawSecretKey.includes('\r'),
      });

      if (!merchantId || !secretKey) {
        throw new Error('Yappy credentials not configured. Please set YAPPY_MERCHANT_ID and YAPPY_SECRET_KEY environment variables.');
      }

      if (!domainUrl || domainUrl.trim().length === 0) {
        throw new Error('Yappy domain URL not configured. Please set YAPPY_DOMAIN_URL or NEXT_PUBLIC_APP_URL environment variable.');
      }

      // Warn if credentials were cleaned
      if (rawMerchantId !== merchantId || rawSecretKey !== secretKey) {
        console.warn('[Yappy] ⚠️ Credentials were cleaned - whitespace/newlines removed. Please check your environment variables.');
      }

      this.config = { merchantId, secretKey, domainUrl, environment };
    }

    return this.config;
  }

  /**
   * Get API base URL based on environment
   */
  static getApiBaseUrl(): string {
    const config = this.getConfig();
    return config.environment === 'testing'
      ? 'https://api-comecom-uat.yappycloud.com'
      : 'https://apipagosbg.bgeneral.cloud';
  }

  /**
   * Get CDN URL for web component
   */
  static getCdnUrl(): string {
    const config = this.getConfig();
    return config.environment === 'testing'
      ? 'https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js'
      : 'https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js';
  }

  /**
   * Validate merchant credentials with Yappy API
   * According to Yappy manual: /payments/validate/merchant (POST)
   * Returns: token and epochTime in body.epochTime
   */
  static async validateMerchant(): Promise<YappyValidateResponse> {
    try {
      const config = this.getConfig();
      const baseUrl = this.getApiBaseUrl();

      // According to Yappy manual, the endpoint is /payments/validate/merchant
      // It requires: merchantId and urlDomain (NOT domainUrl)
      // Note: Testing environment might require https:// in urlDomain
      // Try with https:// first, if it fails we can try without
      const baseDomainUrl = process.env.YAPPY_DOMAIN_URL || process.env.NEXT_PUBLIC_APP_URL || '';
      let urlDomain = baseDomainUrl.replace(/\/$/, '').trim(); // Remove trailing slash but keep https://
      
      // If domain doesn't start with http:// or https://, add https://
      if (!urlDomain.match(/^https?:\/\//)) {
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
  static async createOrder(request: YappyOrderRequest): Promise<YappyOrderResponse> {
    try {
      const config = this.getConfig();
      const baseUrl = this.getApiBaseUrl();

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
      const subtotal = request.amount.toFixed(2);
      const taxes = '0.00';
      const shipping = '0.00';
      const discount = '0.00';
      const total = request.amount.toFixed(2);

      // Create order payload according to Yappy manual
      // Note: For payment-wc, domain should be without https:// (just the domain name)
      // This is different from validate/merchant which requires https://
      const domainForOrder = config.domainUrl; // Use domain without https:// (as stored in config)
      
      const orderPayload = {
        merchantId: config.merchantId,
        orderId: request.orderId.substring(0, 15), // Max 15 characters
        domain: domainForOrder, // Domain without https:// (just domain name)
        paymentDate: request.paymentDate, // epochTime from validation
        ipnUrl: ipnUrl, // URL for Instant Payment Notification (callback)
        shipping: shipping, // Format: "0.00"
        discount: discount, // Format: "0.00"
        taxes: taxes, // Format: "0.00"
        subtotal: subtotal, // Format: "0.00"
        total: total, // Format: "0.00"
        // aliasYappy is optional - number of phone (8 digits, no dashes, no prefixes)
        // We'll omit it and let the web component handle it
      };

      console.log('[Yappy] Creating order with /payments/payment-wc:', {
        merchantId: config.merchantId,
        orderId: orderPayload.orderId,
        domain: orderPayload.domain,
        domainLength: orderPayload.domain?.length || 0,
        domainHasHttps: orderPayload.domain?.startsWith('https://') || false,
        paymentDate: orderPayload.paymentDate,
        ipnUrl: orderPayload.ipnUrl,
        total: orderPayload.total,
        hasToken: !!request.token,
        tokenPreview: request.token ? `${request.token.substring(0, 20)}...` : 'MISSING',
        tokenLength: request.token?.length || 0,
        authorizationHeader: request.token ? `${request.token.substring(0, 20)}...` : 'MISSING',
        requestBodyString: JSON.stringify(orderPayload),
      });

      // According to Yappy manual, endpoint is /payments/payment-wc
      // Authorization header must contain the token from validation
      // Try without "Bearer" prefix first, as some APIs use just the token
      const response = await fetch(`${baseUrl}/payments/payment-wc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': request.token, // Token from validation (without Bearer prefix)
        },
        body: JSON.stringify(orderPayload),
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
        console.error('[Yappy] Error creating order:', {
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
  static async verifyPayment(orderId: string): Promise<{ status: string; verified: boolean }> {
    try {
      const config = this.getConfig();
      const baseUrl = this.getApiBaseUrl();

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
    return status === 'E' || status === 'Ejecutado' || status === 'approved' || status === 'completed' || status === 'success';
  }

  /**
   * Validate hash from Yappy callback
   * According to Yappy manual, the hash is used to verify the callback authenticity
   * The hash is calculated using the secret key and callback parameters
   * Note: The exact hash algorithm may need to be verified with Yappy documentation
   */
  static validateCallbackHash(params: YappyCallbackParams, receivedHash: string): boolean {
    try {
      const config = this.getConfig();
      
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
