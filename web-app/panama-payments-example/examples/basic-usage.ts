/**
 * Basic Usage Examples
 * 
 * These examples show how to use @panama-payments/core
 * in a Node.js/TypeScript environment
 */

import {
  YappyService,
  PagueloFacilService,
  PagueloFacilTokenizationService,
} from '@panama-payments/core';

// ============================================
// Yappy Examples
// ============================================

async function yappyExample() {
  // Configure Yappy
  const yappyConfig = {
    merchantId: process.env.YAPPY_MERCHANT_ID!,
    secretKey: process.env.YAPPY_SECRET_KEY!,
    domainUrl: process.env.YAPPY_DOMAIN_URL!,
    environment: 'production' as const,
  };

  // Step 1: Validate merchant
  console.log('Validating Yappy merchant...');
  const validation = await YappyService.validateMerchant(yappyConfig);

  if (!validation.success) {
    console.error('Validation failed:', validation.error);
    return;
  }

  console.log('Validation successful:', {
    hasToken: !!validation.token,
    epochTime: validation.epochTime,
  });

  // Step 2: Create order
  console.log('Creating Yappy order...');
  const order = await YappyService.createOrder(
    {
      amount: 25.50,
      description: 'Monthly payment',
      orderId: `ORD-${Date.now()}`,
      token: validation.token!,
      paymentDate: validation.epochTime!,
      ipnUrl: 'https://yourdomain.com/api/payments/yappy/callback',
      aliasYappy: '61234567', // Customer phone
    },
    yappyConfig,
    undefined,
    'https://yourdomain.com'
  );

  if (!order.success) {
    console.error('Order creation failed:', order.error);
    return;
  }

  console.log('Order created:', {
    orderId: order.orderData?.orderId,
    transactionId: order.orderData?.transactionId,
    token: order.orderData?.token,
    documentName: order.orderData?.documentName,
  });

  // Step 3: Handle callback (example)
  const callbackParams = {
    orderId: order.orderData!.orderId,
    status: 'E', // E=Ejecutado (approved)
    amount: '25.50',
    hash: 'callback-hash-here',
  };

  const isApproved = YappyService.isTransactionApproved(callbackParams);
  console.log('Transaction approved?', isApproved);
}

// ============================================
// PagueloFacil Examples
// ============================================

async function pagueloFacilExample() {
  // Configure PagueloFacil
  const pfConfig = {
    apiKey: process.env.PAGUELOFACIL_ACCESS_TOKEN!,
    cclw: process.env.PAGUELOFACIL_CCLW!,
    sandbox: process.env.PAGUELOFACIL_SANDBOX === 'true',
  };

  // Create payment link
  console.log('Creating PagueloFacil payment link...');
  const link = await PagueloFacilService.createPaymentLink(
    {
      amount: 25.50,
      description: 'Monthly payment',
      email: 'customer@example.com',
      orderId: `ORD-${Date.now()}`,
      returnUrl: 'https://yourdomain.com/payment/success',
      customParams: {
        playerId: 'player-123',
        type: 'monthly',
      },
    },
    pfConfig
  );

  if (!link.success) {
    console.error('Link creation failed:', link.error);
    return;
  }

  console.log('Payment link created:', link.paymentUrl);
  console.log('Redirect user to:', link.paymentUrl);

  // Handle callback (example)
  const callbackParams = {
    TotalPagado: '25.50',
    Estado: 'Aprobada',
    Oper: '123456',
    Fecha: '2024-01-15',
    Hora: '10:30:00',
    Email: 'customer@example.com',
    PARM_1: 'ORD-1234567890',
    PARM_2: 'player-123',
  };

  const isApproved = PagueloFacilService.isTransactionApproved(callbackParams);
  console.log('Transaction approved?', isApproved);

  if (isApproved) {
    const orderId = callbackParams.PARM_1;
    const amount = parseFloat(callbackParams.TotalPagado);
    console.log('Payment successful:', { orderId, amount });
  }
}

// ============================================
// Tokenization Example
// ============================================

async function tokenizationExample() {
  const pfConfig = {
    apiKey: process.env.PAGUELOFACIL_ACCESS_TOKEN!,
    cclw: process.env.PAGUELOFACIL_CCLW!,
    sandbox: true, // Use sandbox for testing
  };

  // Tokenize card
  console.log('Tokenizing card...');
  const tokenization = await PagueloFacilTokenizationService.tokenizeCard(
    {
      cardData: {
        cardNumber: '4111111111111111', // Test card
        cardholderName: 'John Doe',
        cvv: '123',
        expiryMonth: '12',
        expiryYear: '25',
      },
      email: 'customer@example.com',
    },
    pfConfig
  );

  if (!tokenization.success || !tokenization.token) {
    console.error('Tokenization failed:', tokenization.error);
    return;
  }

  console.log('Card tokenized:', tokenization.token);

  // Use token for payment
  console.log('Processing payment with token...');
  const payment = await PagueloFacilTokenizationService.processPayment(
    {
      amount: 25.50,
      description: 'Monthly payment',
      email: 'customer@example.com',
      orderId: `ORD-${Date.now()}`,
      cardToken: tokenization.token,
    },
    pfConfig
  );

  if (!payment.success) {
    console.error('Payment failed:', payment.error);
    return;
  }

  console.log('Payment processed:', {
    transactionId: payment.transactionId,
    operationId: payment.operationId,
    status: payment.status,
  });
}

// Run examples
// yappyExample();
// pagueloFacilExample();
// tokenizationExample();



