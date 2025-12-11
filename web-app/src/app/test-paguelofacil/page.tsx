'use client';

import { useState } from 'react';
import { PagueloFacilPaymentButton } from '@/components/payments/PagueloFacilPaymentButton';

export default function TestPagueloFacilPage() {
  const [amount, setAmount] = useState('10.00');
  const [description, setDescription] = useState('Pago de prueba');
  const [email, setEmail] = useState('javidavo05@gmail.com');
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestLink = async () => {
    try {
      const response = await fetch('/api/payments/paguelofacil/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          email,
          orderId: `test-${Date.now()}`,
        }),
      });

      const data = await response.json();
      setTestResult({
        success: response.ok,
        data,
        status: response.status,
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Prueba de Integración Paguelo Fácil
          </h1>
          <p className="text-gray-600">
            Página de prueba para verificar la integración con Paguelo Fácil
          </p>
        </div>

        {/* Formulario de Prueba */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Datos de Prueba
          </h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monto (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleTestLink}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Probar Generación de Enlace
            </button>
          </div>
        </div>

        {/* Resultado de la Prueba */}
        {testResult && (
          <div className={`glass-card p-6 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
            <h3 className="text-lg font-bold mb-4">
              {testResult.success ? '✅ Éxito' : '❌ Error'}
            </h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(testResult, null, 2)}
            </pre>
            {testResult.success && testResult.data?.paymentUrl && (
              <div className="mt-4">
                <a
                  href={testResult.data.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Abrir Enlace de Pago
                </a>
              </div>
            )}
          </div>
        )}

        {/* Botón de Pago Completo */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Prueba Completa (Botón de Pago)
          </h2>
          <PagueloFacilPaymentButton
            amount={parseFloat(amount)}
            description={description}
            email={email}
            orderId={`test-${Date.now()}`}
            returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/paguelofacil/callback?type=test`}
            onError={(error) => {
              setTestResult({
                success: false,
                error,
              });
            }}
          />
        </div>

        {/* Información */}
        <div className="glass-card p-6 bg-blue-50 border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">
            ℹ️ Información de Prueba
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Ambiente: <strong>{process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') ? 'Desarrollo Local' : 'Producción'}</strong></li>
            <li>• El enlace generado es de un solo uso</li>
            <li>• Después del pago, serás redirigido al callback</li>
            <li>• Puedes usar tarjetas de prueba de Paguelo Fácil para probar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

