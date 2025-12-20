import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@panama-payments/core';

/**
 * GET /api/payments/paguelofacil/callback
 * Handles callback from PagueloFacil after payment (RETURN_URL)
 * 
 * This is an example API route. Adapt it to your needs.
 * You should:
 * 1. Parse callback parameters
 * 2. Check if payment is approved
 * 3. Update your database
 * 4. Send confirmation emails
 * 5. Redirect to success/failure page
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Convert URLSearchParams to object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Parse callback parameters
    const callbackParams = PagueloFacilService.parseCallbackParams(params);
    
    // Verify transaction status
    const isApproved = PagueloFacilService.isTransactionApproved(callbackParams);

    // TODO: Update your database
    // if (isApproved) {
    //   const orderId = callbackParams.PARM_1; // Your orderId
    //   const amount = parseFloat(callbackParams.TotalPagado);
    //   await updatePaymentStatus(orderId, 'approved', amount);
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
    console.error('[PagueloFacil Callback] Error:', error);
    return NextResponse.redirect(new URL('/payment/error', request.url));
  }
}



