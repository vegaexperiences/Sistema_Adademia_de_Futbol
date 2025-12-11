import { LoginForm } from '@/components/auth/LoginForm';
import { CheckCircle2 } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ passwordReset?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showSuccess = resolvedSearchParams?.passwordReset === 'success';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Header Section */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-3xl font-bold text-white">SA</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Iniciar Sesión
          </h2>
          <p className="text-sm text-gray-600 font-medium">
            Acceso administrativo a Suarez Academy
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="rounded-xl bg-green-50 p-4 border-2 border-green-200 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-green-800">
                  Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
