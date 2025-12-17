import { NextResponse } from 'next/server';
import { getAllSponsors, createSponsorRegistration } from '@/lib/actions/sponsors';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const sponsorRegistrationSchema = z.object({
  sponsor_id: z.string().uuid(),
  sponsor_name: z.string().min(1, 'El nombre es requerido'),
  sponsor_email: z.string().email().optional().or(z.literal('')),
  sponsor_phone: z.string().optional().or(z.literal('')),
  sponsor_cedula: z.string().optional().or(z.literal('')),
  sponsor_company: z.string().optional().or(z.literal('')),
  sponsor_ruc: z.string().optional().or(z.literal('')),
  payment_id: z.string().uuid().optional(),
  notes: z.string().optional().or(z.literal('')),
});

export async function GET() {
  try {
    const result = await getAllSponsors();

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error('[API /sponsors] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener sponsors' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = sponsorRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify sponsor exists and is active
    const supabase = await createClient();

    let query = supabase
      .from('sponsors')
      .select('id, amount, is_active')
      .eq('id', data.sponsor_id)
      .eq('is_active', true);

    if (academyId) {
      query = query.eq('academy_id', academyId);
    }

    const { data: sponsor, error: sponsorError } = await query.single();

    if (sponsorError || !sponsor) {
      return NextResponse.json(
        { error: 'Sponsor no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Create registration
    const result = await createSponsorRegistration(data);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        data: result.data,
        sponsor: {
          id: sponsor.id,
          amount: sponsor.amount,
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /sponsors] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear registro de sponsor' },
      { status: 500 }
    );
  }
}

