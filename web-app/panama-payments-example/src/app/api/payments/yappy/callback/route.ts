import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@panama-payments/core';

/**
 * POST /api/payments/yappy/callback
 * Handles callback from Yappy after payment processing
 * 
 * This is an example API route. Adapt it to your needs.
 * You should:
 * 1. Validate the callback hash
 * 2. Check if payment is approved
 * 3. Update your database
 * 4. Send confirmation emails
 * 5. Redirect to success/failure page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Parse callback parameters
    const callbackParams = YappyService.parseCallbackParams(body);
    
    // Verify transaction status
    const isApproved = YappyService.isTransactionApproved(callbackParams);
    
    // TODO: Validate hash
    // const hash = body.hash || '';
    // const isValidHash = await YappyService.validateCallbackHash(callbackParams, hash);
    // if (!isValidHash) {
    //   return NextResponse.json({ error: 'Invalid hash' }, { status: 401 });
    // }

    // TODO: Update your database
    // if (isApproved) {
    //   await updatePaymentStatus(callbackParams.orderId, 'approved');
    // }

    // TODO: Send confirmation email
    // if (isApproved) {
    //   await sendPaymentConfirmationEmail(callbackParams);
    // }

    if (isApproved) {
      // Redirect to success page
      return NextResponse.redirect(new URL('/payment/success', request.url));
    } else {
      // Redirect to failure page
      return NextResponse.redirect(new URL('/payment/failed', request.url));
    }
  } catch (error: any) {
    console.error('[Yappy Callback] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing callback' },
      { status: 500 }
    );
  }
}

