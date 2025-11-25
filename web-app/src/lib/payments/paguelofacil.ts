/**
 * Paguelo Fácil Payment Service
 * Integration with Paguelo Fácil payment gateway for Panama
 */

export interface PagueloFacilConfig {
  apiKey: string; // Access Token API
  cclw: string; // Código Web (CCLW)
  sandbox?: boolean; // Use sandbox environment
}

export interface PagueloFacilTransaction {
  amount: number;
  description: string;
  email: string;
  orderId?: string;
  metadata?: Record<string, any>;
}

export interface PagueloFacilResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
  message?: string;
}

export class PagueloFacilService {
  private static config: PagueloFacilConfig | null = null;

  static initialize(config: PagueloFacilConfig) {
    this.config = config;
  }

  static getConfig(): PagueloFacilConfig {
    if (!this.config) {
      const apiKey = process.env.PAGUELOFACIL_ACCESS_TOKEN || '';
      const cclw = process.env.PAGUELOFACIL_CCLW || '';
      const sandbox = process.env.PAGUELOFACIL_SANDBOX === 'true';

      if (!apiKey || !cclw) {
        throw new Error('PagueloFacil credentials not configured. Please set PAGUELOFACIL_ACCESS_TOKEN and PAGUELOFACIL_CCLW environment variables.');
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
}
