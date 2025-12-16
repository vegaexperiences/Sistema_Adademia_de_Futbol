import { NextResponse } from 'next/server';
import { getOrCreateOpenDonationSponsorLevel, createSponsorRegistration } from '@/lib/actions/sponsors';
import { createPayment } from '@/lib/actions/payments';
import { z } from 'zod';

const openDonationSchema = z.object({
  sponsor_name: z.string().min(1, 'El nombre es requerido'),
  sponsor_email: z.string().email().optional().or(z.literal('')),
  sponsor_phone: z.string().optional().or(z.literal('')),
  sponsor_cedula: z.string().optional().or(z.literal('')),
  sponsor_company: z.string().optional().or(z.literal('')),
  sponsor_ruc: z.string().optional().or(z.literal('')),
  amount: z.number().min(1, 'El monto debe ser mayor o igual a $1.00'),
  method: z.string().min(1, 'El método de pago es requerido'),
  notes: z.string().optional().or(z.literal('')),
  proof_url: z.string().optional().or(z.literal('')),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = openDonationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get or create the open donation sponsor level
    const sponsorLevelResult = await getOrCreateOpenDonationSponsorLevel();
    if (sponsorLevelResult.error || !sponsorLevelResult.data) {
      return NextResponse.json(
        { error: sponsorLevelResult.error || 'Error al obtener nivel de donación abierta' },
        { status: 500 }
      );
    }

    const sponsorLevel = sponsorLevelResult.data;

    // Map method names
    const methodMap: Record<string, string> = {
      'Transferencia': 'transfer',
      'Comprobante': 'cash',
      'ACH': 'ach',
      'Yappy': 'yappy',
      'PagueloFacil': 'paguelofacil',
    };

    const mappedMethod = methodMap[data.method] || data.method.toLowerCase();

    // Create sponsor registration
    const registrationResult = await createSponsorRegistration({
      sponsor_id: sponsorLevel.id,
      sponsor_name: data.sponsor_name,
      sponsor_email: data.sponsor_email || undefined,
      sponsor_phone: data.sponsor_phone || undefined,
      sponsor_cedula: data.sponsor_cedula || undefined,
      sponsor_company: data.sponsor_company || undefined,
      sponsor_ruc: data.sponsor_ruc || undefined,
    });

    if (registrationResult.error || !registrationResult.data) {
      return NextResponse.json(
        { error: registrationResult.error || 'Error al crear registro de padrino' },
        { status: 500 }
      );
    }

    const registration = registrationResult.data;

    // Create payment (only for manual methods - Yappy/PagueloFacil are handled by their callbacks)
    if (mappedMethod !== 'yappy' && mappedMethod !== 'paguelofacil') {
      try {
        const paymentData = {
          amount: data.amount,
          type: 'sponsor',
          method: mappedMethod,
          payment_date: new Date().toISOString().split('T')[0],
          status: (mappedMethod === 'transfer' || mappedMethod === 'cash' || mappedMethod === 'ach') ? 'Pending' : 'Pending',
          notes: data.notes || `Donación de padrino - ${data.sponsor_name}`,
          proof_url: data.proof_url || undefined,
          sponsor_id: sponsorLevel.id,
        };

        const paymentResult = await createPayment(paymentData as any);

        if (paymentResult.error) {
          return NextResponse.json(
            { error: paymentResult.error || 'Error al crear el pago' },
            { status: 500 }
          );
        }

        // Update registration with payment_id
        if (paymentResult.data?.id) {
          // We need to update the registration, but we don't have a direct API for that
          // The payment is already linked via sponsor_id, so this is optional
          // We could add an endpoint to update registrations if needed
        }
      } catch (paymentError: any) {
        console.error('[Open Donation API] Error creating payment:', paymentError);
        // Don't fail the registration if payment creation fails
        // The payment can be created later manually
      }
    }

    return NextResponse.json(
      { 
        data: {
          registration: registration,
          sponsor_level: {
            id: sponsorLevel.id,
            name: sponsorLevel.name,
          },
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Open Donation API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la donación' },
      { status: 500 }
    );
  }
}
