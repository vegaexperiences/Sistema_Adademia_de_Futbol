import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// In-memory storage for temporary enrollment data (expires after 1 hour)
const tempEnrollmentData = new Map<string, { data: any; expiresAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tempEnrollmentData.entries()) {
    if (value.expiresAt < now) {
      tempEnrollmentData.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * POST /api/enrollment/temp
 * Store enrollment data temporarily before payment
 */
export async function POST(request: NextRequest) {
  try {
    const enrollmentData = await request.json();
    
    // Generate a unique token
    const token = `enrollment_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store with 1 hour expiration
    tempEnrollmentData.set(token, {
      data: enrollmentData,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    
    console.log('[Enrollment Temp] Stored enrollment data with token:', token);
    
    return NextResponse.json({ 
      success: true, 
      token,
      expiresIn: 3600, // seconds
    });
  } catch (error: any) {
    console.error('[Enrollment Temp] Error storing enrollment data:', error);
    return NextResponse.json(
      { error: 'Error al almacenar los datos de matrícula' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/enrollment/temp?token=...
 * Retrieve temporary enrollment data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }
    
    const stored = tempEnrollmentData.get(token);
    
    if (!stored) {
      return NextResponse.json(
        { error: 'Datos no encontrados o expirados' },
        { status: 404 }
      );
    }
    
    if (stored.expiresAt < Date.now()) {
      tempEnrollmentData.delete(token);
      return NextResponse.json(
        { error: 'Los datos han expirado' },
        { status: 410 }
      );
    }
    
    console.log('[Enrollment Temp] Retrieved enrollment data for token:', token);
    
    // Return data and delete from storage (one-time use)
    const enrollmentData = stored.data;
    tempEnrollmentData.delete(token);
    
    return NextResponse.json({
      success: true,
      data: enrollmentData,
    });
  } catch (error: any) {
    console.error('[Enrollment Temp] Error retrieving enrollment data:', error);
    return NextResponse.json(
      { error: 'Error al recuperar los datos de matrícula' },
      { status: 500 }
    );
  }
}

