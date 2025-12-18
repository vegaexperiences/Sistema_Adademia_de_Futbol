/**
 * Yappy Service Adapter
 * Maintains compatibility with the current academy-based system
 * while using the new generic @panama-payments/core package
 */

import { YappyService as CoreYappyService } from '@panama-payments/core';
import type {
  YappyConfig,
  YappyValidateResponse,
  YappyOrderRequest,
  YappyOrderResponse,
  YappyCallbackParams,
} from '@panama-payments/core';
import { PaymentConfigProvider } from '@panama-payments/core';
import { getCurrentAcademyId } from '@/lib/supabase/server';

/**
 * Academy-based config provider for Yappy
 */
class AcademyYappyConfigProvider implements PaymentConfigProvider {
  constructor(private academyId: string | null) {}

  async getYappyConfig(): Promise<YappyConfig | null> {
    if (!this.academyId) {
      return null; // Fallback to env vars
    }

    // Load from academy settings
    const { getYappyConfig } = await import('@/lib/utils/academy-payments');
    const academyConfig = await getYappyConfig(this.academyId);

    if (!academyConfig) {
      return null; // Fallback to env vars
    }

    return {
      merchantId: academyConfig.merchant_id,
      secretKey: academyConfig.secret_key,
      domainUrl: academyConfig.domain_url,
      environment: academyConfig.environment,
    };
  }
}

/**
 * Adapter class that maintains the old API while using the new core service
 */
export class YappyService {
  private static configCache: Map<string, YappyConfig> = new Map();

  /**
   * Get Yappy configuration (maintains old API)
   */
  static async getConfig(academyId?: string | null): Promise<YappyConfig> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyYappyConfigProvider(currentAcademyId);
    
    // Use core service with provider
    return await CoreYappyService.getConfig(undefined, provider);
  }

  /**
   * Get API base URL (maintains old API)
   */
  static async getApiBaseUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    return CoreYappyService.getApiBaseUrl(config);
  }

  /**
   * Get CDN URL (maintains old API)
   */
  static async getCdnUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    return CoreYappyService.getCdnUrl(config);
  }

  /**
   * Validate merchant (maintains old API)
   */
  static async validateMerchant(academyId?: string | null): Promise<YappyValidateResponse> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyYappyConfigProvider(currentAcademyId);
    
    return await CoreYappyService.validateMerchant(undefined, provider);
  }

  /**
   * Create order (maintains old API)
   */
  static async createOrder(
    request: YappyOrderRequest,
    academyId?: string | null
  ): Promise<YappyOrderResponse> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyYappyConfigProvider(currentAcademyId);
    const baseUrlForCallback = process.env.NEXT_PUBLIC_APP_URL || '';
    
    return await CoreYappyService.createOrder(
      request,
      undefined,
      provider,
      baseUrlForCallback
    );
  }

  /**
   * Verify payment (maintains old API)
   */
  static async verifyPayment(
    orderId: string,
    academyId?: string | null
  ): Promise<{ status: string; verified: boolean }> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyYappyConfigProvider(currentAcademyId);
    
    return await CoreYappyService.verifyPayment(orderId, undefined, provider);
  }

  /**
   * Parse callback params (maintains old API)
   */
  static parseCallbackParams(query: Record<string, string | string[]>): YappyCallbackParams {
    return CoreYappyService.parseCallbackParams(query);
  }

  /**
   * Check if approved (maintains old API)
   */
  static isTransactionApproved(params: YappyCallbackParams): boolean {
    return CoreYappyService.isTransactionApproved(params);
  }

  /**
   * Validate hash (maintains old API)
   */
  static async validateCallbackHash(
    params: YappyCallbackParams,
    receivedHash: string,
    academyId?: string | null
  ): Promise<boolean> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyYappyConfigProvider(currentAcademyId);
    
    return await CoreYappyService.validateCallbackHash(
      params,
      receivedHash,
      undefined,
      provider
    );
  }
}

// Re-export types for compatibility
export type {
  YappyConfig,
  YappyValidateResponse,
  YappyOrderRequest,
  YappyOrderResponse,
  YappyCallbackParams,
} from '@panama-payments/core';

