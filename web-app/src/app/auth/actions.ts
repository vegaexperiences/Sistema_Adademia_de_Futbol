'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Login] Error:', error);
      return { error: 'Credenciales inválidas' };
    }

    // Success - redirect (this throws a special error in Next.js that we should not catch)
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  } catch (error: any) {
    // Check if this is a redirect error (NEXT_REDIRECT) - if so, re-throw it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('[Login] Unexpected error:', error);
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
