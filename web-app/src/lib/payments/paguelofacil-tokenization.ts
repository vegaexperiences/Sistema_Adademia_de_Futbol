/**
 * Paguelo Fácil Tokenization and Direct Payment Processing Service
 * Handles tokenization and direct payments
 */

import { PagueloFacilService } from './paguelofacil';

export interface CardData {
  cardNumber: string;
  cardholderName: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface TokenizationRequest {
  cardData: CardData;
  email?: string;
}

export interface TokenizationResponse {
  success: boolean;
  token?: string;
  cardToken?: string;
  error?: string;
  message?: string;
}

export interface ProcessPaymentRequest {
  amount: number;
  description: string;
  cardToken?: string; // Use token if available
  cardData?: CardData; // Use card data if no token
  email: string;
  orderId?: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentResponse {
  success: boolean;
  transactionId?: string;
  operationId?: string;
  status?: string;
  error?: string;
  message?: string;
}


export class PagueloFacilTokenizationService {
  /**
   * Get API base URL for tokenization and direct payments
   */
  static getApiBaseUrl(): string {
    const config = PagueloFacilService.getConfig();
    return config.sandbox
      ? 'https://api-sand.pfserver.net'
      : 'https://api.pfserver.net';
  }

  /**
   * Tokenize a credit card
   * This creates a secure token that can be used for future payments
   * 
   * NOTE: The exact endpoint URL and parameters need to be verified with Paguelo Fácil documentation.
   * This is a placeholder structure based on common payment gateway patterns.
   * You may need to adjust the endpoint path, request/response format based on their actual API.
   */
  static async tokenizeCard(request: TokenizationRequest): Promise<TokenizationResponse> {
    try {
      const config = PagueloFacilService.getConfig();
      const baseUrl = this.getApiBaseUrl();
      
      // Clean card number (remove spaces)
      const cardNumber = request.cardData.cardNumber.replace(/\s/g, '');
      
      // Prepare tokenization request
      // Note: The exact endpoint and parameters need to be verified with Paguelo Fácil documentation
      // This is a placeholder structure based on common payment gateway patterns
      const tokenizationPayload = {
        cclw: config.cclw,
        card_number: cardNumber,
        cardholder_name: request.cardData.cardholderName,
        cvv: request.cardData.cvv,
        expiry_month: request.cardData.expiryMonth,
        expiry_year: `20${request.cardData.expiryYear}`, // Convert YY to YYYY
        email: request.email,
      };

      // Make request to tokenization endpoint
      // TODO: Verify the exact endpoint URL with Paguelo Fácil documentation
      const response = await fetch(`${baseUrl}/api/v3/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PAGUELOFACIL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(tokenizationPayload),
      });

      // Check if endpoint exists
      if (response.status === 404) {
        return {
          success: false,
          error: 'El endpoint de tokenización no está disponible. Por favor, contacta a Paguelo Fácil para confirmar si este servicio está habilitado.',
        };
      }

      // Try to parse JSON response
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        const text = await response.text();
        return {
          success: false,
          error: `Error en la respuesta de Paguelo Fácil: ${text || response.statusText}`,
        };
      }

      if (response.ok && result.success) {
        return {
          success: true,
          token: result.token || result.cardToken || result.data?.token,
          cardToken: result.cardToken || result.data?.cardToken,
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || result.messageSys || 'Error al tokenizar la tarjeta',
        };
      }
    } catch (error: any) {
      console.error('[PagueloFacil] Tokenization error:', error);
      
      // Check if it's a network error or 404
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('Recurso no encontrado')) {
        return {
          success: false,
          error: 'El servicio de tokenización no está disponible. Paguelo Fácil puede no ofrecer este servicio. Por favor, contacta a Paguelo Fácil para confirmar los endpoints disponibles o usa el método de "Enlace de Pago".',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Error al tokenizar la tarjeta',
      };
    }
  }

  /**
   * Process a direct payment
   * Can use either a token or card data directly
   * 
   * NOTE: The exact endpoint URL and parameters need to be verified with Paguelo Fácil documentation.
   * This is a placeholder structure based on common payment gateway patterns.
   * You may need to adjust the endpoint path, request/response format based on their actual API.
   */
  static async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    try {
      const config = PagueloFacilService.getConfig();
      const baseUrl = this.getApiBaseUrl();

      // Prepare payment request
      const paymentPayload: any = {
        cclw: config.cclw,
        amount: request.amount.toFixed(2),
        description: request.description.substring(0, 150),
        email: request.email,
      };

      // Use token if available, otherwise use card data
      if (request.cardToken) {
        paymentPayload.card_token = request.cardToken;
      } else if (request.cardData) {
        paymentPayload.card_number = request.cardData.cardNumber.replace(/\s/g, '');
        paymentPayload.cardholder_name = request.cardData.cardholderName;
        paymentPayload.cvv = request.cardData.cvv;
        paymentPayload.expiry_month = request.cardData.expiryMonth;
        paymentPayload.expiry_year = `20${request.cardData.expiryYear}`;
      } else {
        return {
          success: false,
          error: 'Se requiere token de tarjeta o datos de tarjeta',
        };
      }

      if (request.orderId) {
        paymentPayload.order_id = request.orderId;
      }

      if (request.metadata) {
        paymentPayload.metadata = request.metadata;
      }

      // Make request to payment processing endpoint
      // TODO: Verify the exact endpoint URL with Paguelo Fácil documentation
      const response = await fetch(`${baseUrl}/api/v3/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PAGUELOFACIL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(paymentPayload),
      });

      // Check if endpoint exists
      if (response.status === 404) {
        return {
          success: false,
          error: 'El endpoint de procesamiento de pagos no está disponible. Paguelo Fácil puede no ofrecer procesamiento directo de tarjetas. Por favor, usa el método de "Enlace de Pago" o contacta a Paguelo Fácil para confirmar los endpoints disponibles.',
        };
      }

      // Try to parse JSON response
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        const text = await response.text();
        return {
          success: false,
          error: `Error en la respuesta de Paguelo Fácil: ${text || response.statusText}`,
        };
      }

      if (response.ok && (result.success || result.status === 1 || result.status === 'approved')) {
        return {
          success: true,
          transactionId: result.transactionId || result.id || result.data?.id,
          operationId: result.operationId || result.operation_id || result.codOper,
          status: result.status === 1 || result.status === 'approved' ? 'approved' : 'pending',
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || result.messageSys || 'Error al procesar el pago',
        };
      }
    } catch (error: any) {
      console.error('[PagueloFacil] Payment processing error:', error);
      
      // Check if it's a network error or 404
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('Recurso no encontrado')) {
        return {
          success: false,
          error: 'El servicio de procesamiento directo de pagos no está disponible. Paguelo Fácil puede no ofrecer procesamiento directo de tarjetas. Por favor, usa el método de "Enlace de Pago" o contacta a Paguelo Fácil para confirmar los endpoints disponibles.',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Error al procesar el pago',
      };
    }
  }

}

