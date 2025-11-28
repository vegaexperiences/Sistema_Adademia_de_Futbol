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
  error?: string;
  message?: string;
}

export interface YappyOrderRequest {
  amount: number;
  description: string;
  orderId: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
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
      const merchantId = process.env.YAPPY_MERCHANT_ID || '';
      const secretKey = process.env.YAPPY_SECRET_KEY || '';
      // Get domain URL - ensure it doesn't include protocol for Yappy
      let domainUrl = process.env.YAPPY_DOMAIN_URL || process.env.NEXT_PUBLIC_APP_URL || '';
      // Remove protocol if present (Yappy expects just the domain)
      domainUrl = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const environment = (process.env.YAPPY_ENVIRONMENT || 'production') as 'production' | 'testing';

      console.log('[Yappy] Configuration loaded:', {
        environment,
        hasMerchantId: !!merchantId,
        hasSecretKey: !!secretKey,
        domainUrl,
      });

      if (!merchantId || !secretKey) {
        throw new Error('Yappy credentials not configured. Please set YAPPY_MERCHANT_ID and YAPPY_SECRET_KEY environment variables.');
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
   * This validates the merchant ID and secret key
   */
  static async validateMerchant(): Promise<YappyValidateResponse> {
    try {
      const config = this.getConfig();
      const baseUrl = this.getApiBaseUrl();

      // According to Yappy documentation, we need to validate the merchant
      // The endpoint should be /payments/validate/merchant
      const response = await fetch(`${baseUrl}/payments/validate/merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          merchantId: config.merchantId,
          secretKey: config.secretKey,
          domainUrl: config.domainUrl,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          token: result.token || result.data?.token,
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || 'Error al validar credenciales de Yappy',
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
   * This creates an order that will be used by the web component
   */
  static async createOrder(request: YappyOrderRequest): Promise<YappyOrderResponse> {
    try {
      const config = this.getConfig();
      const baseUrl = this.getApiBaseUrl();

      // Validate amount
      if (request.amount < 0.01) {
        return {
          success: false,
          error: 'El monto debe ser mayor a $0.01',
        };
      }

      // Build return URL if not provided
      const returnUrl = request.returnUrl || `${config.domainUrl}/api/payments/yappy/callback`;

      // Create order payload
      const orderPayload = {
        merchantId: config.merchantId,
        amount: request.amount.toFixed(2),
        description: request.description.substring(0, 200), // Max 200 characters
        orderId: request.orderId,
        returnUrl: returnUrl,
        domainUrl: config.domainUrl,
        ...(request.metadata || {}),
      };

      console.log('[Yappy] Creating order:', {
        merchantId: config.merchantId,
        amount: orderPayload.amount,
        orderId: request.orderId,
        returnUrl,
      });

      // Make request to create order endpoint
      // According to Yappy docs, this should be /payments/create/order
      const response = await fetch(`${baseUrl}/payments/create/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${config.secretKey}`, // May need to adjust based on actual API
        },
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (response.ok && (result.success || result.status === 'success')) {
        return {
          success: true,
          orderData: {
            orderId: request.orderId,
            amount: request.amount,
            description: request.description,
            merchantId: config.merchantId,
            ...result.data,
          },
        };
      } else {
        console.error('[Yappy] Error creating order:', result);
        return {
          success: false,
          error: result.message || result.error || 'Error al crear orden de pago',
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
   */
  static isTransactionApproved(params: YappyCallbackParams): boolean {
    const status = params.status || '';
    return (
      status === 'approved' ||
      status === 'completed' ||
      status === 'success' ||
      !!(params.transactionId && parseFloat(params.amount || '0') > 0)
    );
  }
}
