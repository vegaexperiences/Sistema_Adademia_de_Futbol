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
  cardType?: string; // CARD_TYPE parameter: NEQUI,CASH,CLAVE,CARD,CRYPTO
  pfCf?: string; // PF_CF parameter: JSON encoded in hexadecimal
}

export class PagueloFacilService {
  private static config: PagueloFacilConfig | null = null;
  private static configCache: Map<string, PagueloFacilConfig> = new Map();

  static initialize(config: PagueloFacilConfig) {
    this.config = config;
  }

  /**
   * Get PagueloFacil configuration, optionally for a specific academy
   * If academyId is provided, loads from academy settings
   * Otherwise uses environment variables (backward compatibility)
   */
  static async getConfig(academyId?: string | null): Promise<PagueloFacilConfig> {
    // If academy ID provided, use academy-specific config
    if (academyId) {
      // Check cache first
      if (this.configCache.has(academyId)) {
        return this.configCache.get(academyId)!;
      }

      // Load from academy settings
      const { getPagueloFacilConfig } = await import('@/lib/utils/academy-payments');
      const academyConfig = await getPagueloFacilConfig(academyId);

      if (academyConfig) {
        const config: PagueloFacilConfig = {
          apiKey: academyConfig.api_key,
          cclw: academyConfig.merchant_id, // merchant_id in academy config is actually CCLW
          sandbox: academyConfig.environment === 'testing',
        };
        this.configCache.set(academyId, config);
        return config;
      }
      // If academy config not found, fall through to env vars
    }

    // Fallback to environment variables (backward compatibility)
    if (!this.config) {
      // Get tokens and clean them (remove any non-ASCII characters that might have been copied incorrectly)
      const rawApiKey = process.env.PAGUELOFACIL_ACCESS_TOKEN || '';
      const rawCclw = process.env.PAGUELOFACIL_CCLW || '';
      
      // Clean tokens: remove non-ASCII characters and trim whitespace
      const apiKey = rawApiKey.replace(/[^\x20-\x7E]/g, '').trim();
      const cclw = rawCclw.replace(/[^\x20-\x7E]/g, '').trim();
      const sandbox = process.env.PAGUELOFACIL_SANDBOX === 'true';

      // Validate sandbox configuration
      if (sandbox) {
        // Verify that URLs match sandbox environment
        const linkDeamonUrl = sandbox
          ? 'https://sandbox.paguelofacil.com/LinkDeamon.cfm'
          : 'https://secure.paguelofacil.com/LinkDeamon.cfm';
        
        console.log('[PagueloFacil] Sandbox mode enabled:', {
          sandbox,
          linkDeamonUrl,
          note: 'Using sandbox credentials and endpoints',
        });
      } else {
        console.log('[PagueloFacil] Production mode enabled');
      }

      // Log sandbox status for debugging
      const cclwPreview = cclw.length > 20 
        ? `${cclw.substring(0, 10)}...${cclw.substring(cclw.length - 10)}`
        : cclw;
      
      console.log('[PagueloFacil] ========== CONFIGURATION LOADED ==========');
      console.log('[PagueloFacil] Configuration loaded:', {
        sandbox,
        sandboxEnv: process.env.PAGUELOFACIL_SANDBOX,
        sandboxEnvRaw: process.env.PAGUELOFACIL_SANDBOX,
        hasApiKey: !!apiKey,
        hasCclw: !!cclw,
        apiKeyLength: apiKey.length,
        apiKeyPreview: apiKey.length > 20 ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}` : apiKey,
        cclwLength: cclw.length,
        cclwPreview,
        linkDeamonUrl: sandbox
          ? 'https://sandbox.paguelofacil.com/LinkDeamon.cfm'
          : 'https://secure.paguelofacil.com/LinkDeamon.cfm',
      });
      
      // Validate sandbox configuration
      if (sandbox && process.env.PAGUELOFACIL_SANDBOX !== 'true') {
        console.warn('[PagueloFacil] ⚠️ WARNING: Sandbox mode detected but PAGUELOFACIL_SANDBOX is not exactly "true"');
      }
      
      if (!sandbox && process.env.PAGUELOFACIL_SANDBOX === 'true') {
        console.warn('[PagueloFacil] ⚠️ WARNING: PAGUELOFACIL_SANDBOX is "true" but sandbox mode is false - check environment variable');
      }

      if (!apiKey || !cclw) {
        console.error('[PagueloFacil] ❌ CRITICAL: Missing credentials:', {
          hasApiKey: !!apiKey,
          hasCclw: !!cclw,
          apiKeyEnv: process.env.PAGUELOFACIL_ACCESS_TOKEN ? 'Set' : 'Not set',
          cclwEnv: process.env.PAGUELOFACIL_CCLW ? 'Set' : 'Not set',
        });
        throw new Error('PagueloFacil credentials not configured. Please set PAGUELOFACIL_ACCESS_TOKEN and PAGUELOFACIL_CCLW environment variables.');
      }
      
      // Validate CCLW format (should be hexadecimal, typically 128+ characters)
      if (cclw.length < 64) {
        console.warn('[PagueloFacil] ⚠️ WARNING: CCLW seems too short. Expected length: 128+ characters, got:', cclw.length);
      }
      
      // Validate that CCLW is hexadecimal
      if (!/^[0-9A-Fa-f]+$/.test(cclw)) {
        console.warn('[PagueloFacil] ⚠️ WARNING: CCLW contains non-hexadecimal characters. This may indicate a copy/paste issue.');
      }

      // Log warning if tokens were cleaned (indicates potential copy/paste issue)
      if (rawApiKey !== apiKey || rawCclw !== cclw) {
        console.warn('[PagueloFacil] Tokens were cleaned - some non-ASCII characters were removed. Please verify your environment variables.');
      }

      this.config = { apiKey, cclw, sandbox };
    }

    return this.config;
  }

  static async getBaseUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    return config.sandbox
      ? 'https://api-sand.pfserver.net'
      : 'https://api.pfserver.net';
  }

  /**
   * Create a payment transaction using Paguelo Fácil SDK
   * This will return the configuration needed to initialize the SDK on the client
   */
  static async getSDKConfig(academyId?: string | null): Promise<{ apiKey: string; cclw: string; sandbox: boolean }> {
    const config = await this.getConfig(academyId);
    return {
      apiKey: config.apiKey,
      cclw: config.cclw,
      sandbox: config.sandbox || false
    };
  }

  /**
   * Create a transaction - returns configuration for client-side SDK
   */
  static async createTransaction(transaction: PagueloFacilTransaction, academyId?: string | null): Promise<PagueloFacilResponse> {
    try {
      const config = await this.getConfig(academyId);
      
      // For now, return the SDK config that will be used on client-side
      // The actual payment processing happens via the SDK
      return {
        success: true,
        paymentUrl: await this.getBaseUrl(academyId),
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
  static async verifyPayment(transactionId: string, academyId?: string | null): Promise<{ status: string; verified: boolean }> {
    try {
      const config = await this.getConfig(academyId);
      const baseUrl = await this.getBaseUrl(academyId);

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
  static async getLinkDeamonUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    const url = config.sandbox
      ? 'https://sandbox.paguelofacil.com/LinkDeamon.cfm'
      : 'https://secure.paguelofacil.com/LinkDeamon.cfm';
    
    // Validate that sandbox configuration is consistent
    if (config.sandbox && !url.includes('sandbox')) {
      console.error('[PagueloFacil] ⚠️ WARNING: Sandbox mode enabled but URL does not contain "sandbox"');
    }
    if (!config.sandbox && url.includes('sandbox')) {
      console.error('[PagueloFacil] ⚠️ WARNING: Production mode but URL contains "sandbox"');
    }
    
    return url;
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
  static async createPaymentLink(transaction: PagueloFacilTransaction, academyId?: string | null): Promise<PagueloFacilLinkResponse> {
    try {
      const config = await this.getConfig(academyId);
      const url = await this.getLinkDeamonUrl(academyId);
      
      // Validate sandbox configuration
      if (config.sandbox) {
        console.log('[PagueloFacil] Creating payment link in SANDBOX mode:', {
          url,
          cclwLength: config.cclw.length,
          note: 'Using sandbox credentials and endpoints',
        });
      } else {
        console.log('[PagueloFacil] Creating payment link in PRODUCTION mode:', {
          url,
          cclwLength: config.cclw.length,
        });
      }

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

      // Add CARD_TYPE parameter if specified (to filter payment methods)
      // Values: NEQUI,CASH,CLAVE,CARD,CRYPTO
      if (transaction.cardType) {
        postData.CARD_TYPE = transaction.cardType;
        console.log('[PagueloFacil] CARD_TYPE specified:', transaction.cardType);
      }

      // Add PF_CF (custom fields) if specified (JSON encoded in hexadecimal)
      if (transaction.pfCf) {
        postData.PF_CF = transaction.pfCf;
        console.log('[PagueloFacil] PF_CF specified (custom fields)');
      }

      // Build query string for POST
      const postBody = Object.entries(postData)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      // Log detailed request information (without exposing full CCLW for security)
      const cclwPreview = config.cclw.length > 20 
        ? `${config.cclw.substring(0, 10)}...${config.cclw.substring(config.cclw.length - 10)}`
        : config.cclw;
      
      console.log('[PagueloFacil] ========== LINKDEAMON REQUEST ==========');
      console.log('[PagueloFacil] Sending to LinkDeamon:', {
        url,
        sandbox: config.sandbox,
        cclwPreview,
        cclwLength: config.cclw.length,
        postDataKeys: Object.keys(postData),
        parameters: {
          CCLW: `[${cclwPreview}] (${config.cclw.length} chars)`,
          CMTN: postData.CMTN,
          CDSC: postData.CDSC?.substring(0, 50) + (postData.CDSC?.length > 50 ? '...' : ''),
          RETURN_URL: postData.RETURN_URL ? `[Encoded, ${postData.RETURN_URL.length} chars]` : 'Not provided',
          EMAIL: postData.EMAIL || 'Not provided',
          EXPIRES_IN: postData.EXPIRES_IN,
          CARD_TYPE: postData.CARD_TYPE || 'Not specified',
          PF_CF: postData.PF_CF ? 'Provided' : 'Not provided',
          PARM_1: postData.PARM_1 || 'Not provided',
          PARM_2: postData.PARM_2 || 'Not provided',
          PARM_3: postData.PARM_3 || 'Not provided',
          PARM_4: postData.PARM_4 || 'Not provided',
          PARM_5: postData.PARM_5 || 'Not provided',
          PARM_6: postData.PARM_6 || 'Not provided',
        },
        postBodyLength: postBody.length,
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
      console.log('[PagueloFacil] ========== LINKDEAMON RESPONSE ==========');
      console.log('[PagueloFacil] LinkDeamon response status:', response.status);
      console.log('[PagueloFacil] LinkDeamon response headers:', Object.fromEntries(response.headers.entries()));
      console.log('[PagueloFacil] LinkDeamon response text length:', responseText.length);
      console.log('[PagueloFacil] LinkDeamon response text (first 1000 chars):', responseText.substring(0, 1000));
      if (responseText.length > 1000) {
        console.log('[PagueloFacil] LinkDeamon response text (last 500 chars):', responseText.substring(responseText.length - 500));
      }

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
    const razon = params.Razon || '';
    
    // Log para diagnóstico - CRITICAL para debugging
    console.log('[PagueloFacil] ========== VERIFICANDO ESTADO DE TRANSACCIÓN ==========');
    console.log('[PagueloFacil] Verificando estado de transacción:', {
      Estado: params.Estado,
      EstadoRaw: params.Estado,
      EstadoNormalizado: estado,
      TotalPagado: params.TotalPagado,
      TotalPagadoRaw: params.TotalPagado,
      TotalPagadoParsed: totalPagado,
      Razon: razon,
      Oper: params.Oper,
      Fecha: params.Fecha,
      Hora: params.Hora,
      Tipo: params.Tipo,
      Usuario: params.Usuario,
      Email: params.Email,
      timestamp: new Date().toISOString(),
    });
    
    // Check for 3DS authentication errors
    const is3DSError = razon.toLowerCase().includes('authentication') || 
                       razon.toLowerCase().includes('3ds') ||
                       razon.toLowerCase().includes('issuer is rejecting');
    
    if (is3DSError) {
      console.warn('[PagueloFacil] ⚠️ 3DS Authentication Error detected:', {
        razon,
        note: 'This may indicate a problem with 3D Secure authentication. Check if you are using the correct test cards for sandbox environment.',
        suggestion: 'Verify that you are using sandbox test cards and that 3DS is properly configured in your PagueloFacil merchant account.',
      });
    }
    
    // Según documentación: TotalPagado > 0 indica transacción aprobada
    // También verificamos que Estado no sea "Denegado" o "Denegada"
    const isDenied = estado === 'denegado' || estado === 'denegada' || estado === 'rechazado' || estado === 'rechazada';
    const isApproved = estado === 'aprobada' || estado === 'approved';
    
    // Si TotalPagado > 0, la transacción fue aprobada (según documentación)
    // Si Estado es explícitamente "Denegado/Denegada", rechazamos
    if (isDenied) {
      console.log('[PagueloFacil] Transaction denied:', {
        estado,
        totalPagado,
        razon,
        is3DSError,
      });
      return false;
    }
    
    // Si TotalPagado > 0, consideramos aprobada (independientemente del texto de Estado)
    if (totalPagado > 0) {
      console.log('[PagueloFacil] Transaction approved (TotalPagado > 0):', {
        totalPagado,
        estado,
      });
      return true;
    }
    
    // Si Estado es explícitamente "Aprobada", consideramos aprobada
    if (isApproved) {
      console.log('[PagueloFacil] Transaction approved (Estado = Aprobada):', {
        estado,
        totalPagado,
      });
      return true;
    }
    
    console.log('[PagueloFacil] Transaction status unclear:', {
      estado,
      totalPagado,
      razon,
    });
    return false;
  }
}
