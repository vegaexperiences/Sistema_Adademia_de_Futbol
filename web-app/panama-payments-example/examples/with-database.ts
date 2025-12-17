/**
 * Example with Database Integration
 * 
 * Shows how to integrate payments with a database
 * and use custom config providers
 */

import {
  YappyService,
  PagueloFacilService,
  PaymentConfigProvider,
  YappyConfig,
  PagueloFacilConfig,
} from '@panama-payments/core';

// Example: Database config provider
class DatabaseConfigProvider implements PaymentConfigProvider {
  constructor(private tenantId: string) {}

  async getYappyConfig(): Promise<YappyConfig | null> {
    // Load from database
    // const tenant = await db.tenant.findUnique({
    //   where: { id: this.tenantId },
    //   include: { paymentSettings: true }
    // });

    // if (!tenant?.paymentSettings?.yappy) return null;

    // return {
    //   merchantId: tenant.paymentSettings.yappy.merchantId,
    //   secretKey: tenant.paymentSettings.yappy.secretKey,
    //   domainUrl: tenant.paymentSettings.yappy.domainUrl,
    //   environment: tenant.paymentSettings.yappy.environment
    // };

    // For this example, return null to use env vars
    return null;
  }

  async getPagueloFacilConfig(): Promise<PagueloFacilConfig | null> {
    // Similar to getYappyConfig
    return null;
  }
}

// Example: Payment processing with database
async function processPaymentWithDatabase(
  tenantId: string,
  orderId: string,
  amount: number,
  description: string
) {
  const configProvider = new DatabaseConfigProvider(tenantId);

  // Validate Yappy merchant
  const validation = await YappyService.validateMerchant(undefined, configProvider);

  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // Create order
  const order = await YappyService.createOrder(
    {
      amount,
      description,
      orderId,
      token: validation.token!,
      paymentDate: validation.epochTime!,
      ipnUrl: `https://yourdomain.com/api/payments/yappy/callback?tenantId=${tenantId}`,
    },
    undefined,
    configProvider,
    'https://yourdomain.com'
  );

  if (!order.success) {
    throw new Error(`Order creation failed: ${order.error}`);
  }

  // Save order to database
  // await db.paymentOrder.create({
  //   data: {
  //     tenantId,
  //     orderId,
  //     amount,
  //     description,
  //     status: 'pending',
  //     yappyTransactionId: order.orderData?.transactionId,
  //     createdAt: new Date(),
  //   }
  // });

  return order.orderData;
}

// Example: Handle callback with database update
async function handleCallbackWithDatabase(
  tenantId: string,
  callbackParams: any
) {
  const configProvider = new DatabaseConfigProvider(tenantId);

  // Parse and validate
  const params = YappyService.parseCallbackParams(callbackParams);
  const isApproved = YappyService.isTransactionApproved(params);

  // Update database
  // await db.paymentOrder.update({
  //   where: { orderId: params.orderId },
  //   data: {
  //     status: isApproved ? 'approved' : 'rejected',
  //     yappyConfirmationNumber: params.confirmationNumber,
  //     updatedAt: new Date(),
  //   }
  // });

  // Send confirmation email
  // if (isApproved) {
  //   await sendEmail({
  //     to: customerEmail,
  //     subject: 'Payment Confirmed',
  //     body: `Your payment of $${params.amount} has been confirmed.`
  //   });
  // }

  return { success: isApproved };
}

// Example usage
// const order = await processPaymentWithDatabase(
//   'tenant-123',
//   'ORD-12345',
//   25.50,
//   'Monthly payment'
// );

