'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[Login] Missing Supabase environment variables');
      return { error: 'Error de configuración del servidor. Contacta al administrador.' };
    }

    const supabase = await createClient();
    
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'Email y contraseña son requeridos' };
    }

    console.log('[Login] Attempting login for:', email);
    console.log('[Login] Password length:', password.length);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Enhanced error logging
    if (error) {
      console.error('[Login] Supabase auth error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
      });
      
      // Check if user exists (requires SERVICE_ROLE_KEY)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient: createAdminClient } = await import('@supabase/supabase-js')
          const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          const { data: userCheck, error: userCheckError } = await adminSupabase.auth.admin.getUserByEmail(email)
          console.log('[Login] User exists check:', {
            exists: !!userCheck?.user,
            confirmed: userCheck?.user?.email_confirmed_at ? 'Yes' : 'No',
            created: userCheck?.user?.created_at,
            lastSignIn: userCheck?.user?.last_sign_in_at,
            checkError: userCheckError?.message,
          })
        } catch (checkError: any) {
          console.warn('[Login] Could not check user existence:', checkError?.message)
        }
      }
      
      return { error: 'Credenciales inválidas' };
    }

    if (!data?.user) {
      console.error('[Login] No user returned from signInWithPassword');
      return { error: 'Error al iniciar sesión. Por favor intenta de nuevo.' };
    }

    console.log('[Login] Success, redirecting to dashboard');
    
    // Success - redirect (this throws a special error in Next.js that we should not catch)
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  } catch (error: any) {
    // Check if this is a redirect error (NEXT_REDIRECT) - if so, re-throw it
    if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('[Login] Unexpected error:', error);
    console.error('[Login] Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      digest: error?.digest,
    });
    return { error: 'Error al iniciar sesión. Por favor intenta de nuevo.' };
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'El correo electrónico es requerido' };
  }

  // Get the base URL for the reset link
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/reset-password`,
  });

  if (error) {
    return { error: 'Error al enviar el correo de recuperación. Verifica tu email.' };
  }

  return { success: true, message: 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña.' };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { error: 'Todos los campos son requeridos' };
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: 'Error al actualizar la contraseña. El enlace puede haber expirado.' };
  }

  revalidatePath('/', 'layout');
  redirect('/login?passwordReset=success');
}
