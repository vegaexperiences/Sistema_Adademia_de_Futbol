import { LoginForm } from '@/components/auth/LoginForm';
import { CheckCircle2 } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { passwordReset?: string };
}) {
  const showSuccess = searchParams?.passwordReset === 'success';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Acceso administrativo a Suarez Academy
          </p>
        </div>
        
        {showSuccess && (
          <div className="rounded-md bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.
                </p>
              </div>
            </div>
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  );
}
