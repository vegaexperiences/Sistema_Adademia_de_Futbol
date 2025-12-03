/**
 * Paguelo Fácil Payment Service
 * Integration with Paguelo Fácil payment gateway for Panama
 */

export interface PagueloFacilConfig {
  apiKey: string; // Access Token API
  cclw: string; // Código Web (CCLW)
  sandbox?: boolean; // Use sandbox environment
}


export interface PagueloFacilResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
  message?: string;
}

export interface PagueloFacilCallbackParams {
  TotalPagado: string;
  Fecha: string;
  Hora: string;
  Tipo: string;
  Oper: string;
  Usuario: string;
  Email: string;
  Estado: string;
  Razon?: string;
  PARM_1?: string;
  [key: string]: string | undefined; // Para parámetros personalizados adicionales
}

export interface PagueloFacilLinkResponse {
  success: boolean;
  paymentUrl?: string;
  code?: string;
  error?: string;
}

export interface PagueloFacilTransaction {
  amount: number;
  description: string;
  email?: string;
  orderId?: string;
  returnUrl?: string;
  expiresIn?: number;
  customParams?: Record<string, string>;
  metadata?: Record<string, any>;
}

export class PagueloFacilService {
  private static config: PagueloFacilConfig | null = null;

  static initialize(config: PagueloFacilConfig) {
    this.config = config;
  }

  static getConfig(): PagueloFacilConfig {
    if (!this.config) {
      // Get tokens and clean them (remove any non-ASCII characters that might have been copied incorrectly)
      const rawApiKey = process.env.PAGUELOFACIL_ACCESS_TOKEN || '';
      const rawCclw = process.env.PAGUELOFACIL_CCLW || '';
      
      // Clean tokens: remove non-ASCII characters and trim whitespace
      const apiKey = rawApiKey.replace(/[^\x20-\x7E]/g, '').trim();
      const cclw = rawCclw.replace(/[^\x20-\x7E]/g, '').trim();
      const sandbox = process.env.PAGUELOFACIL_SANDBOX === 'true';

      // Log sandbox status for debugging
      console.log('[PagueloFacil] Configuration loaded:', {
        sandbox,
        sandboxEnv: process.env.PAGUELOFACIL_SANDBOX,
        hasApiKey: !!apiKey,
        hasCclw: !!cclw,
        apiKeyLength: apiKey.length,
        cclwLength: cclw.length,
      });

      if (!apiKey || !cclw) {
        throw new Error('PagueloFacil credentials not configured. Please set PAGUELOFACIL_ACCESS_TOKEN and PAGUELOFACIL_CCLW environment variables.');
      }

      // Log warning if tokens were cleaned (indicates potential copy/paste issue)
      if (rawApiKey !== apiKey || rawCclw !== cclw) {
        console.warn('[PagueloFacil] Tokens were cleaned - some non-ASCII characters were removed. Please verify your environment variables.');
      }

      this.config = { apiKey, cclw, sandbox };
    }

    return this.config;
  }

  static getBaseUrl(): string {
    const config = this.getConfig();
    return config.sandbox
      ? 'https://api-sand.pfserver.net'
      : 'https://api.pfserver.net';
  }

  /**
   * Create a payment transaction using Paguelo Fácil SDK
   * This will return the configuration needed to initialize the SDK on the client
   */
  static getSDKConfig(): { apiKey: string; cclw: string; sandbox: boolean } {
    const config = this.getConfig();
    return {
      apiKey: config.apiKey,
      cclw: config.cclw,
      sandbox: config.sandbox || false
    };
  }

  /**
   * Create a transaction - returns configuration for client-side SDK
   */
  static async createTransaction(transaction: PagueloFacilTransaction): Promise<PagueloFacilResponse> {
    try {
      const config = this.getConfig();
      
      // For now, return the SDK config that will be used on client-side
      // The actual payment processing happens via the SDK
      return {
        success: true,
        paymentUrl: this.getBaseUrl(),
        transactionId: `pf_${Date.now()}_${Math.random().toString(36).substring(7)}`
      };
    } catch (error: any) {
      console.error('[PagueloFacil] Error creating transaction:', error);
      return {
        success: false,
        error: error.message || 'Error al crear la transacción'
      };
    }
  }

  /**
   * Verify payment status (for webhook or polling)
   */
  static async verifyPayment(transactionId: string): Promise<{ status: string; verified: boolean }> {
    try {
      const config = this.getConfig();
      const baseUrl = this.getBaseUrl();

      // This would call the actual API endpoint to verify payment
      // For now, return a placeholder
      return {
        status: 'pending',
        verified: false
      };
    } catch (error: any) {
      console.error('[PagueloFacil] Error verifying payment:', error);
      return {
        status: 'error',
        verified: false
      };
    }
  }

  /**
   * Get the base URL for LinkDeamon endpoint
   */
  static getLinkDeamonUrl(): string {
    const config = this.getConfig();
    return config.sandbox
      ? 'https://sandbox.paguelofacil.com/LinkDeamon.cfm'
      : 'https://secure.paguelofacil.com/LinkDeamon.cfm';
  }

  /**
   * Encode URL to hexadecimal format for RETURN_URL parameter
   */
  static encodeUrlToHex(url: string): string {
    return Buffer.from(url, 'utf8').toString('hex').toUpperCase();
  }

  /**
   * Create a payment link using LinkDeamon
   */
  static async createPaymentLink(transaction: PagueloFacilTransaction): Promise<PagueloFacilLinkResponse> {
    try {
      const config = this.getConfig();
      const url = this.getLinkDeamonUrl();

      // Validate amount (minimum is $1.00)
      if (transaction.amount < 1.0) {
        return {
          success: false,
          error: 'El monto mínimo es $1.00 USD'
        };
      }

      // Prepare POST data
      const postData: Record<string, string> = {
        CCLW: config.cclw,
        CMTN: transaction.amount.toFixed(2), // Amount with 2 decimal places
        CDSC: transaction.description.substring(0, 150), // Max 150 characters
      };

      // Add optional parameters
      if (transaction.returnUrl) {
        const encodedReturnUrl = this.encodeUrlToHex(transaction.returnUrl);
        postData.RETURN_URL = encodedReturnUrl;
        console.log('[PagueloFacil] Return URL:', transaction.returnUrl);
        console.log('[PagueloFacil] Encoded RETURN_URL (hex):', encodedReturnUrl);
      } else {
        console.warn('[PagueloFacil] No returnUrl provided! Callback will not work.');
      }

      if (transaction.email) {
        postData.EMAIL = transaction.email;
      }

      if (transaction.expiresIn) {
        postData.EXPIRES_IN = transaction.expiresIn.toString();
      } else {
        postData.EXPIRES_IN = '3600'; // Default 1 hour
      }

      // Add orderId first as PARM_1 if provided
      if (transaction.orderId) {
        postData.PARM_1 = transaction.orderId;
      }

      // Add custom parameters (PARM_2, PARM_3, etc.) starting after orderId
      if (transaction.customParams) {
        let paramIndex = transaction.orderId ? 2 : 1; // Start from PARM_2 if orderId exists
        Object.entries(transaction.customParams).forEach(([key, value]) => {
          const paramKey = `PARM_${paramIndex}`;
          postData[paramKey] = String(value).substring(0, 150); // Max 150 characters
          paramIndex++;
        });
      }

      // Build query string for POST
      const postBody = Object.entries(postData)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      console.log('[PagueloFacil] Sending to LinkDeamon:', {
        url,
        postDataKeys: Object.keys(postData),
        hasReturnUrl: !!postData.RETURN_URL,
        returnUrlLength: postData.RETURN_URL?.length || 0,
      });

      // Make POST request to LinkDeamon
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*',
        },
        body: postBody,
      });

      const responseText = await response.text();
      console.log('[PagueloFacil] LinkDeamon response status:', response.status);
      console.log('[PagueloFacil] LinkDeamon response text (first 500 chars):', responseText.substring(0, 500));

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('[PagueloFacil] Parsed response:', result);
      } catch (e) {
        // If not JSON, might be HTML error page
        console.error('[PagueloFacil] Non-JSON response:', responseText);
        return {
          success: false,
          error: 'Error al generar enlace de pago. Respuesta inválida del servidor.'
        };
      }

      // Check response structure
      if (result.success && result.data?.url) {
        console.log('[PagueloFacil] ✅ Payment link created successfully:', result.data.url);
        return {
          success: true,
          paymentUrl: result.data.url,
          code: result.data.code,
        };
      } else {
        const errorMsg = result.message || result.error || 'Error desconocido al generar enlace de pago';
        console.error('[PagueloFacil] ❌ Error creating payment link:', result);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error: any) {
      console.error('[PagueloFacil] Error creating payment link:', error);
      return {
        success: false,
        error: error.message || 'Error al crear enlace de pago'
      };
    }
  }

  /**
   * Parse callback parameters from RETURN_URL
   */
  static parseCallbackParams(query: Record<string, string | string[]>): PagueloFacilCallbackParams {
    const params: PagueloFacilCallbackParams = {
      TotalPagado: '',
      Fecha: '',
      Hora: '',
      Tipo: '',
      Oper: '',
      Usuario: '',
      Email: '',
      Estado: '',
    };

    Object.entries(query).forEach(([key, value]) => {
      const stringValue = Array.isArray(value) ? value[0] : value;
      params[key] = stringValue;
    });

    return params;
  }

  /**
   * Verify if a callback indicates an approved transaction
   */
  static isTransactionApproved(params: PagueloFacilCallbackParams): boolean {
    const estado = (params.Estado || '').trim().toLowerCase();
    const totalPagado = parseFloat(params.TotalPagado || '0');
    
    // Log para diagnóstico
    console.log('[PagueloFacil] Verificando estado de transacción:', {
      Estado: params.Estado,
      EstadoNormalizado: estado,
      TotalPagado: params.TotalPagado,
      TotalPagadoParsed: totalPagado,
      Razon: params.Razon,
    });
    
    // Según documentación: TotalPagado > 0 indica transacción aprobada
    // También verificamos que Estado no sea "Denegado" o "Denegada"
    const isDenied = estado === 'denegado' || estado === 'denegada' || estado === 'rechazado' || estado === 'rechazada';
    const isApproved = estado === 'aprobada' || estado === 'approved';
    
    // Si TotalPagado > 0, la transacción fue aprobada (según documentación)
    // Si Estado es explícitamente "Denegado/Denegada", rechazamos
    if (isDenied) {
      return false;
    }
    
    // Si TotalPagado > 0, consideramos aprobada (independientemente del texto de Estado)
    if (totalPagado > 0) {
      return true;
    }
    
    // Si Estado es explícitamente "Aprobada", consideramos aprobada
    if (isApproved) {
      return true;
    }
    
    return false;
  }
}
