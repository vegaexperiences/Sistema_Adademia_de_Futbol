/**
 * PagueloFacil Service Adapter
 * Maintains compatibility with the current academy-based system
 * while using the new generic @panama-payments/core package
 */

import { PagueloFacilService as CorePagueloFacilService } from '@panama-payments/core';
import type {
  PagueloFacilConfig,
  PagueloFacilResponse,
  PagueloFacilCallbackParams,
  PagueloFacilLinkResponse,
  PagueloFacilTransaction,
} from '@panama-payments/core';
import { PaymentConfigProvider } from '@panama-payments/core';
import { getCurrentAcademyId } from '@/lib/supabase/server';

/**
 * Academy-based config provider for PagueloFacil
 */
class AcademyPagueloFacilConfigProvider implements PaymentConfigProvider {
  constructor(private academyId: string | null) {}

  async getPagueloFacilConfig(): Promise<PagueloFacilConfig | null> {
    if (!this.academyId) {
      return null; // Fallback to env vars
    }

    // Load from academy settings
    const { getPagueloFacilConfig } = await import('@/lib/utils/academy-payments');
    const academyConfig = await getPagueloFacilConfig(this.academyId);

    if (!academyConfig) {
      return null; // Fallback to env vars
    }

    return {
      apiKey: academyConfig.api_key,
      cclw: academyConfig.merchant_id, // merchant_id in academy config is actually CCLW
      sandbox: academyConfig.environment === 'testing',
    };
  }
}

/**
 * Adapter class that maintains the old API while using the new core service
 */
export class PagueloFacilService {
  private static config: PagueloFacilConfig | null = null;
  private static configCache: Map<string, PagueloFacilConfig> = new Map();

  static initialize(config: PagueloFacilConfig) {
    this.config = config;
  }

  /**
   * Get PagueloFacil configuration (maintains old API)
   */
  static async getConfig(academyId?: string | null): Promise<PagueloFacilConfig> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    
    // Use core service with provider
    return await CorePagueloFacilService.getConfig(undefined, provider);
  }

  /**
   * Get base URL (maintains old API)
   */
  static async getBaseUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    return CorePagueloFacilService.getBaseUrl(config);
  }

  /**
   * Get SDK config (maintains old API)
   */
  static async getSDKConfig(academyId?: string | null): Promise<{ apiKey: string; cclw: string; sandbox: boolean }> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    
    return await CorePagueloFacilService.getSDKConfig(undefined, provider);
  }

  /**
   * Create transaction (maintains old API)
   */
  static async createTransaction(
    transaction: PagueloFacilTransaction,
    academyId?: string | null
  ): Promise<PagueloFacilResponse> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    
    return await CorePagueloFacilService.createTransaction(transaction, undefined, provider);
  }

  /**
   * Verify payment (maintains old API)
   */
  static async verifyPayment(
    transactionId: string,
    academyId?: string | null
  ): Promise<{ status: string; verified: boolean }> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    
    return await CorePagueloFacilService.verifyPayment(transactionId, undefined, provider);
  }

  /**
   * Get LinkDeamon URL (maintains old API)
   */
  static async getLinkDeamonUrl(academyId?: string | null): Promise<string> {
    const config = await this.getConfig(academyId);
    return CorePagueloFacilService.getLinkDeamonUrl(config);
  }

  /**
   * Encode URL to hex (maintains old API)
   */
  static encodeUrlToHex(url: string): string {
    return CorePagueloFacilService.encodeUrlToHex(url);
  }

  /**
   * Create payment link (maintains old API)
   */
  static async createPaymentLink(
    transaction: PagueloFacilTransaction,
    academyId?: string | null
  ): Promise<PagueloFacilLinkResponse> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    
    return await CorePagueloFacilService.createPaymentLink(transaction, undefined, provider);
  }

  /**
   * Parse callback params (maintains old API)
   */
  static parseCallbackParams(query: Record<string, string | string[]>): PagueloFacilCallbackParams {
    return CorePagueloFacilService.parseCallbackParams(query);
  }

  /**
   * Check if approved (maintains old API)
   */
  static isTransactionApproved(params: PagueloFacilCallbackParams): boolean {
    return CorePagueloFacilService.isTransactionApproved(params);
  }
}

// Re-export types for compatibility
export type {
  PagueloFacilConfig,
  PagueloFacilResponse,
  PagueloFacilCallbackParams,
  PagueloFacilLinkResponse,
  PagueloFacilTransaction,
} from '@panama-payments/core';

