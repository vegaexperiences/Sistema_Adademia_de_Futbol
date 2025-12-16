import { NextResponse } from 'next/server';
import { createExternalIncome } from '@/lib/actions/payments';
import { z } from 'zod';

const externalIncomeSchema = z.object({
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  income_date: z.string().min(1, 'La fecha es requerida'),
  payment_method: z.string().min(1, 'El método de pago es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  category: z.string().min(1, 'La categoría es requerida'),
  source: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  proof_url: z.string().optional().or(z.literal('')),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = externalIncomeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create external income
    const result = await createExternalIncome({
      amount: data.amount,
      income_date: data.income_date,
      payment_method: data.payment_method,
      description: data.description,
      category: data.category,
      source: data.source || undefined,
      notes: data.notes || undefined,
      proof_url: data.proof_url || undefined,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        data: result.data,
        message: 'Ingreso externo registrado exitosamente'
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[External Income API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar el ingreso externo' },
      { status: 500 }
    );
  }
}
