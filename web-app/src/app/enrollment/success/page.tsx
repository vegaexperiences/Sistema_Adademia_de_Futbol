'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function EnrollmentSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'success' | 'failed' | 'error' | null>(null);
  const [details, setDetails] = useState<{
    operationId?: string;
    amount?: string;
    reason?: string;
    paymentMethod?: 'paguelofacil' | 'yappy';
  }>({});

  useEffect(() => {
    // Check for PagueloFacil success
    const pagueloFacilStatus = searchParams.get('paguelofacil');
    if (pagueloFacilStatus) {
      setStatus(pagueloFacilStatus as 'success' | 'failed' | 'error');
      setDetails({
        operationId: searchParams.get('oper') || undefined,
        amount: searchParams.get('monto') || undefined,
        reason: searchParams.get('razon') ? decodeURIComponent(searchParams.get('razon')!) : undefined,
        paymentMethod: 'paguelofacil',
      });
      return;
    }

    // Check for Yappy success
    const yappyStatus = searchParams.get('yappy');
    if (yappyStatus) {
      setStatus(yappyStatus === 'success' ? 'success' : yappyStatus === 'failed' ? 'failed' : 'error');
      setDetails({
        operationId: searchParams.get('orderId') || undefined,
        amount: searchParams.get('amount') || undefined,
        paymentMethod: 'yappy',
      });
      return;
    }

    // Default to error if no status found
    setStatus('error');
  }, [searchParams]);

  return (
    <div className="min-h-screen py-12 transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 sm:p-10 text-center">
          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
                ¡Matrícula Exitosa!
              </h1>
              <p className="text-gray-600 mb-6 text-lg">
                Tu matrícula ha sido procesada correctamente y el pago ha sido confirmado.
              </p>
              
              {details.operationId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Número de Operación:</strong> {details.operationId}
                  </p>
                  {details.amount && (
                    <p className="text-sm text-blue-800 mt-2">
                      <strong>Monto Pagado:</strong> ${parseFloat(details.amount).toFixed(2)} USD
                    </p>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-8">
                Hemos recibido tu información y el pago correctamente. Te hemos enviado un correo de confirmación con todos los detalles.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Volver al Inicio
                </Link>
                <Link
                  href="/enrollment"
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Nueva Matrícula
                </Link>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
                Pago No Procesado
              </h1>
              <p className="text-gray-600 mb-6 text-lg">
                El pago no pudo ser procesado. Por favor, intenta nuevamente.
              </p>
              
              {details.reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-800">
                    <strong>Razón:</strong> {details.reason}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/enrollment"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Intentar Nuevamente
                </Link>
                <Link
                  href="/"
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Volver al Inicio
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
                <AlertCircle className="h-10 w-10 text-yellow-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
                Error en el Proceso
              </h1>
              <p className="text-gray-600 mb-6 text-lg">
                Hubo un problema procesando tu matrícula. Por favor, contacta a soporte si el problema persiste.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/enrollment"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Volver a Intentar
                </Link>
                <Link
                  href="/"
                  className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Volver al Inicio
                </Link>
              </div>
            </>
          )}

          {!status && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando información...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
