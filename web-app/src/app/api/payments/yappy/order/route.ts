import { NextRequest, NextResponse } from 'next/server';
import { YappyService } from '@/lib/payments/yappy';
import { createClient, getCurrentAcademyId } from '@/lib/supabase/server';

/**
 * POST /api/payments/yappy/order
 * Creates a payment order with Yappy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, orderId, returnUrl, metadata, token, paymentDate, ipnUrl, playerId, tutorPhone } = body;

    // Validate required fields
    if (!amount || amount < 0.01) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor o igual a $0.01' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    if (!orderId || orderId.trim().length === 0) {
      return NextResponse.json(
        { error: 'El ID de orden es requerido' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token de validación requerido. Debe validar el merchant primero llamando a /api/payments/yappy/validate' },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: 'paymentDate (epochTime) requerido. Debe validar el merchant primero llamando a /api/payments/yappy/validate' },
        { status: 400 }
      );
    }

    // Validate orderId length (max 15 characters according to manual)
    if (orderId.length > 15) {
      return NextResponse.json(
        { error: 'El orderId no puede tener más de 15 caracteres' },
        { status: 400 }
      );
    }

    console.log('[Yappy Order] Creating order with /payments/payment-wc:', {
      amount,
      description,
      orderId,
      returnUrl,
      hasToken: !!token,
      paymentDate,
      playerId,
    });

    // Get tutor phone number
    // Priority: 1) tutorPhone from request (enrollment), 2) from playerId (existing player), 3) from metadata
    let finalTutorPhone: string | null = null;
    
    // First, try tutorPhone from request body (for enrollment)
    if (tutorPhone) {
      finalTutorPhone = tutorPhone;
      console.log('[Yappy Order] Using tutorPhone from request body:', tutorPhone);
    } 
    // Second, try from metadata (customParams)
    else if (metadata?.tutorPhone) {
      finalTutorPhone = metadata.tutorPhone;
      console.log('[Yappy Order] Using tutorPhone from metadata:', metadata.tutorPhone);
    }
    // Third, try to get from playerId (existing player)
    else if (playerId) {
      try {
        const supabase = await createClient();
        const { data: player, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            tutor_phone,
            family_id,
            families (
              tutor_phone
            )
          `)
          .eq('id', playerId)
          .single();

        if (!playerError && player) {
          // Get phone from family first, then from player directly
          const family = Array.isArray(player.families) ? player.families[0] : player.families;
          finalTutorPhone = family?.tutor_phone || player.tutor_phone || null;
          
          console.log('[Yappy Order] Tutor phone retrieved from player:', {
            playerId,
            tutorPhone: finalTutorPhone,
            fromFamily: !!family?.tutor_phone,
            fromPlayer: !!player.tutor_phone,
          });
        } else {
          console.warn('[Yappy Order] Could not find player or error fetching:', {
            playerId,
            error: playerError?.message,
          });
        }
      } catch (phoneError: any) {
        console.error('[Yappy Order] Error fetching tutor phone from player:', phoneError);
        // Continue without phone - will use default value
      }
    }
    
    if (!finalTutorPhone) {
      console.warn('[Yappy Order] ⚠️ No tutor phone found. Will use default value (00000000)');
    }

    // Build IPN URL if not provided
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (request.headers.get('origin') || 'http://localhost:3000');
    const finalIpnUrl = ipnUrl || `${baseUrl}/api/payments/yappy/callback`;

    // Truncate orderId to 15 characters (Yappy limit)
    const truncatedOrderId = orderId.trim().substring(0, 15);
    
    console.log('[Yappy Order] OrderId processing:', {
      originalOrderId: orderId,
      originalLength: orderId.length,
      truncatedOrderId,
      truncatedLength: truncatedOrderId.length,
    });

    // Get academy ID for payment config
    const academyId = await getCurrentAcademyId();

    // Create order using the new flow
    const result = await YappyService.createOrder({
      amount: parseFloat(amount),
      description: description.trim(),
      orderId: truncatedOrderId, // Max 15 characters
      returnUrl,
      metadata,
      token, // Token from validation
      paymentDate, // epochTime from validation
      ipnUrl: finalIpnUrl, // IPN URL for callback
      aliasYappy: finalTutorPhone || undefined, // Tutor phone number (will be formatted to 8 digits)
    }, academyId);

    if (!result.success) {
      // Use appropriate status code based on error type
      // Client errors (400) for validation issues like E005 (número no registrado)
      // Server errors (500) for unexpected issues
      const statusCode = result.isClientError ? 400 : 500;
      
      return NextResponse.json(
        { 
          error: result.error || 'Error al crear orden de pago',
          yappyErrorCode: result.statusCode,
        },
        { status: statusCode }
      );
    }

    // Store order information in database for callback retrieval
    // This is needed because Yappy truncates orderId and doesn't send amount in callback
    try {
      const supabase = await createClient();
      
      // Extract type from metadata or determine from context
      const orderType = metadata?.type || (playerId ? 'payment' : 'enrollment');
      const paymentType = metadata?.paymentType || 'custom';
      
      const orderDataToStore = {
        order_id: truncatedOrderId,
        player_id: playerId || null,
        amount: parseFloat(amount),
        payment_type: paymentType,
        type: orderType,
        month_year: metadata?.monthYear || null,
        notes: metadata?.notes || null,
        description: description.trim(),
      };
      
      console.log('[Yappy Order] Storing order info in database:', {
        orderId: truncatedOrderId,
        originalOrderId: orderId,
        originalLength: orderId.length,
        truncatedLength: truncatedOrderId.length,
        playerId: playerId || 'null',
        amount: parseFloat(amount),
        type: orderType,
        paymentType,
        monthYear: metadata?.monthYear || 'null',
        notes: metadata?.notes || 'null',
      });
      
      const { error: storeError, data: storedData } = await supabase
        .from('yappy_orders')
        .upsert(orderDataToStore, {
          onConflict: 'order_id',
        })
        .select();

      if (storeError) {
        console.error('[Yappy Order] ❌ Error storing order info:', {
          error: storeError.message,
          code: storeError.code,
          details: storeError.details,
          hint: storeError.hint,
          orderId: truncatedOrderId,
        });
        // Don't fail the order creation if storage fails, but log it
      } else {
        console.log('[Yappy Order] ✅ Order info stored successfully:', {
          orderId: truncatedOrderId,
          storedOrderId: storedData?.[0]?.order_id,
          playerId: storedData?.[0]?.player_id || playerId || 'null',
          amount: storedData?.[0]?.amount || parseFloat(amount),
          type: storedData?.[0]?.type || orderType,
          paymentType: storedData?.[0]?.payment_type || paymentType,
          createdAt: storedData?.[0]?.created_at,
          note: 'This order info will be retrieved in callback using orderId: ' + truncatedOrderId,
        });
      }
    } catch (storeError: any) {
      console.error('[Yappy Order] ❌ Exception storing order info:', {
        error: storeError?.message,
        stack: storeError?.stack,
        orderId: truncatedOrderId,
      });
      // Don't fail the order creation if storage fails
    }

    const config = await YappyService.getConfig(academyId);
    const cdnUrl = await YappyService.getCdnUrl(academyId);

    return NextResponse.json({
      success: true,
      orderData: result.orderData,
      cdnUrl,
      merchantId: config.merchantId,
    });
  } catch (error: any) {
    console.error('[Yappy Order] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

