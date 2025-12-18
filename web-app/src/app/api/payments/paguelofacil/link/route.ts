import { NextRequest, NextResponse } from 'next/server';
import { PagueloFacilService } from '@/lib/payments/paguelofacil';
import { getBaseUrlFromRequest } from '@/lib/utils/get-base-url';
import { createClient } from '@/lib/supabase/server';
import { enrollmentSchema } from '@/lib/validations/enrollment';

/**
 * POST /api/payments/paguelofacil/link
 * Creates a payment link using Paguelo Fácil's LinkDeamon service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, returnUrl, email, orderId, customParams, expiresIn, enrollmentData } = body;

    // Validate required fields
    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor o igual a $1.00 USD' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    // Build return URL if not provided (automatically detects local/production/ngrok)
    const baseUrl = getBaseUrlFromRequest(request);
    const finalReturnUrl = returnUrl || `${baseUrl}/api/payments/paguelofacil/callback`;

    // Store enrollment data in database if provided (for enrollment payments)
    if (enrollmentData && orderId && customParams?.type === 'enrollment') {
      console.log('[PagueloFacil Link] 📦 Storing enrollment data in database:', {
        orderId,
        orderIdLength: orderId.length,
        orderIdType: typeof orderId,
        hasEnrollmentData: !!enrollmentData,
        enrollmentDataKeys: enrollmentData ? Object.keys(enrollmentData) : [],
        tutorName: enrollmentData?.tutorName,
        tutorEmail: enrollmentData?.tutorEmail,
        tutorCedula: enrollmentData?.tutorCedula,
        tutorCedulaLength: enrollmentData?.tutorCedula?.length || 0,
        playerCount: enrollmentData?.players?.length || 0,
        amount,
        type: customParams?.type,
      });
      
      // Normalize and validate enrollment data before storing
      let normalizedEnrollmentData = { ...enrollmentData };
      
      // Normalize tutorCedula: pad with zeros only if it's numeric and too short
      // Don't normalize if it contains letters (passports, foreign IDs)
      if (normalizedEnrollmentData.tutorCedula && typeof normalizedEnrollmentData.tutorCedula === 'string') {
        const originalCedula = normalizedEnrollmentData.tutorCedula.trim();
        // Only normalize if it contains only numbers, dashes, and spaces (no letters)
        const isNumericOnly = /^[\d\s\-]+$/.test(originalCedula);
        if (isNumericOnly && originalCedula.length > 0 && originalCedula.length < 7) {
          const digitsOnly = originalCedula.replace(/[\s\-]/g, '');
          if (digitsOnly.length < 7) {
            normalizedEnrollmentData.tutorCedula = digitsOnly.padStart(7, '0');
            console.log('[PagueloFacil Link] 🔧 Normalized tutorCedula:', {
              original: originalCedula,
              normalized: normalizedEnrollmentData.tutorCedula,
              originalLength: originalCedula.length,
              normalizedLength: normalizedEnrollmentData.tutorCedula.length,
            });
          } else {
            normalizedEnrollmentData.tutorCedula = originalCedula;
          }
        } else {
          // Contains letters or is already long enough - keep as is
          normalizedEnrollmentData.tutorCedula = originalCedula;
        }
      }
      
      // Validate normalized data
      try {
        const validationResult = enrollmentSchema.safeParse(normalizedEnrollmentData);
        if (!validationResult.success) {
          console.error('[PagueloFacil Link] ⚠️ Enrollment data validation failed:', {
            orderId,
            errors: validationResult.error.flatten().fieldErrors,
            tutorCedula: normalizedEnrollmentData.tutorCedula,
            tutorCedulaLength: normalizedEnrollmentData.tutorCedula?.length || 0,
          });
          // Continue with original data - validation will happen again in callback
          // But log the issue for debugging
        } else {
          console.log('[PagueloFacil Link] ✅ Enrollment data validated successfully before storage');
          // Use validated data (which may have been normalized)
          normalizedEnrollmentData = validationResult.data as any;
        }
      } catch (validationError: any) {
        console.error('[PagueloFacil Link] ⚠️ Error during validation:', {
          orderId,
          error: validationError.message,
        });
        // Continue with original data
      }
      
      try {
        const supabase = await createClient();
        // Store normalized data
        const storeData = {
          order_id: orderId,
          enrollment_data: normalizedEnrollmentData,
          amount: amount,
          type: 'enrollment',
          created_at: new Date().toISOString(),
        };
        
        console.log('[PagueloFacil Link] 📝 Storing data:', {
          order_id: storeData.order_id,
          order_idLength: storeData.order_id.length,
          hasEnrollmentData: !!storeData.enrollment_data,
          amount: storeData.amount,
          type: storeData.type,
        });
        
        const { data: storedData, error: storeError } = await supabase
          .from('paguelofacil_orders')
          .upsert(storeData, {
            onConflict: 'order_id',
          })
          .select();

        if (storeError) {
          console.error('[PagueloFacil Link] ❌ Error storing enrollment data:', {
            orderId,
            error: {
              code: storeError.code,
              message: storeError.message,
              details: storeError.details,
              hint: storeError.hint,
            },
          });
          // Don't fail - we'll try to get it from URL params as fallback
        } else {
          console.log('[PagueloFacil Link] ✅ Stored enrollment data successfully:', {
            orderId,
            storedOrderId: storedData?.[0]?.order_id,
            match: storedData?.[0]?.order_id === orderId,
            hasEnrollmentData: !!storedData?.[0]?.enrollment_data,
            storedAt: storedData?.[0]?.created_at,
          });
          
          // Verify the data was stored correctly by querying it back
          const { data: verifyData, error: verifyError } = await supabase
            .from('paguelofacil_orders')
            .select('order_id, enrollment_data, amount, type')
            .eq('order_id', orderId)
            .single();
          
          if (!verifyError && verifyData) {
            console.log('[PagueloFacil Link] ✅ Verified enrollment data storage:', {
              orderId,
              verifiedOrderId: verifyData.order_id,
              match: verifyData.order_id === orderId,
              hasEnrollmentData: !!verifyData.enrollment_data,
              enrollmentDataTutorName: verifyData.enrollment_data?.tutorName,
            });
          } else {
            console.warn('[PagueloFacil Link] ⚠️ Could not verify enrollment data storage:', {
              orderId,
              error: verifyError ? {
                code: verifyError.code,
                message: verifyError.message,
              } : 'No error but no data',
            });
          }
        }
      } catch (storeErr: any) {
        console.error('[PagueloFacil Link] ❌ Exception storing enrollment data:', {
          orderId,
          error: storeErr.message,
          stack: storeErr.stack,
        });
        // Don't fail - continue with payment link creation
      }
    } else {
      console.log('[PagueloFacil Link] ℹ️ Skipping enrollment data storage:', {
        hasEnrollmentData: !!enrollmentData,
        hasOrderId: !!orderId,
        customParamsType: customParams?.type,
        reason: !enrollmentData ? 'No enrollmentData' : !orderId ? 'No orderId' : customParams?.type !== 'enrollment' ? 'Not enrollment type' : 'Unknown',
      });
    }

    console.log('[PagueloFacil Link] Creating payment link with:', {
      amount,
      description,
      email,
      orderId,
      returnUrl: finalReturnUrl,
      customParams,
      baseUrl,
      hasEnrollmentData: !!enrollmentData,
    });

    // Get academy ID for payment config

    // Create payment link
    const result = await PagueloFacilService.createPaymentLink({
      amount: parseFloat(amount),
      description: description.trim(),
      returnUrl: finalReturnUrl,
      email,
      orderId,
      customParams,
      expiresIn: expiresIn ? parseInt(expiresIn) : 3600,
    }, null); // Single-tenant: no academyId needed

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al generar enlace de pago' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      code: result.code,
    });
  } catch (error: any) {
    console.error('[PagueloFacil API] Error creating payment link:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

