/**
 * PagueloFacil Tokenization Service Adapter
 * Maintains compatibility with the current academy-based system
 * while using the new generic @panama-payments/core package
 */

import { 
  PagueloFacilTokenizationService as CoreTokenizationService,
  PagueloFacilService as CorePagueloFacilService,
  type CardData,
  type TokenizationRequest,
  type TokenizationResponse,
  type ProcessPaymentRequest,
  type ProcessPaymentResponse,
} from '@panama-payments/core';
import { PaymentConfigProvider } from '@panama-payments/core';
import { getCurrentAcademyId } from '@/lib/supabase/server';

/**
 * Academy-based config provider for PagueloFacil
 */
class AcademyPagueloFacilConfigProvider implements PaymentConfigProvider {
  constructor(private academyId: string | null) {}

  async getPagueloFacilConfig() {
    if (!this.academyId) {
      return null;
    }

    const { getPagueloFacilConfig } = await import('@/lib/utils/academy-payments');
    const academyConfig = await getPagueloFacilConfig(this.academyId);

    if (!academyConfig) {
      return null;
    }

    return {
      apiKey: academyConfig.api_key,
      cclw: academyConfig.merchant_id,
      sandbox: academyConfig.environment === 'testing',
    };
  }
}

/**
 * Adapter for tokenization service
 */
export class PagueloFacilTokenizationService {
  /**
   * Get API base URL (maintains old API)
   */
  static async getApiBaseUrl(academyId?: string | null): Promise<string> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    const config = await CorePagueloFacilService.getConfig(undefined, provider);
    
    return CoreTokenizationService.getApiBaseUrl(config);
  }

  /**
   * Tokenize card (maintains old API)
   */
  static async tokenizeCard(
    request: { cardData: CardData; email?: string },
    academyId?: string | null
  ): Promise<TokenizationResponse> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    
    return await CoreTokenizationService.tokenizeCard(request, undefined, provider);
  }

  /**
   * Process payment (maintains old API)
   */
  static async processPayment(
    request: ProcessPaymentRequest,
    academyId?: string | null
  ): Promise<ProcessPaymentResponse> {
    const currentAcademyId = academyId || await getCurrentAcademyId();
    const provider = new AcademyPagueloFacilConfigProvider(currentAcademyId);
    
    return await CoreTokenizationService.processPayment(request, undefined, provider);
  }
}

// Re-export types for compatibility
export type {
  TokenizationRequest,
  TokenizationResponse,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
} from '@panama-payments/core';

