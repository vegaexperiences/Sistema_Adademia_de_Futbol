'use client';

import { useState } from 'react';
import { SponsorInfoStep } from './SponsorInfoStep';
import { SponsorDocumentsStep } from './SponsorDocumentsStep';
import { SponsorPaymentStep } from './SponsorPaymentStep';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Sponsor } from '@/lib/actions/sponsors';
import { SystemConfig } from '@/lib/actions/config';

const STEPS = [
  { id: 'info', title: 'Información' },
  { id: 'documents', title: 'Documentos' },
  { id: 'payment', title: 'Pago' },
];

interface SponsorCheckoutFormProps {
  sponsor: Sponsor;
  config: SystemConfig;
}

export function SponsorCheckoutForm({ sponsor, config }: SponsorCheckoutFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    sponsor_name: '',
    sponsor_email: '',
    sponsor_phone: '',
    sponsor_cedula: '',
    sponsor_company: '',
    cedulaFrontFile: '',
    cedulaBackFile: '',
    paymentMethod: '',
    paymentProofFile: '',
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateData = (newData: any) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.paymentMethod) {
      setError('Por favor selecciona un método de pago');
      return;
    }

    if (formData.paymentMethod === 'Comprobante' && !formData.paymentProofFile) {
      setError('Por favor sube un comprobante de pago');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create sponsor registration
      const response = await fetch('/api/sponsors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sponsor_id: sponsor.id,
          sponsor_name: formData.sponsor_name,
          sponsor_email: formData.sponsor_email || undefined,
          sponsor_phone: formData.sponsor_phone || undefined,
          sponsor_cedula: formData.sponsor_cedula || undefined,
          sponsor_company: formData.sponsor_company || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al procesar el padrinazgo');
      }

      // If payment method is not Yappy or PagueloFacil, create payment directly
      if (formData.paymentMethod !== 'Yappy' && formData.paymentMethod !== 'PagueloFacil') {
        // Create payment via API
        const paymentResponse = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: sponsor.amount,
            type: 'sponsor',
            method: formData.paymentMethod === 'Transferencia' ? 'transfer' :
                   formData.paymentMethod === 'Comprobante' ? 'cash' :
                   formData.paymentMethod === 'ACH' ? 'ach' : 'other',
            payment_date: new Date().toISOString().split('T')[0],
            status: formData.paymentMethod === 'Comprobante' ? 'Pending' : 'Pending',
            notes: `Padrinazgo: ${sponsor.name} - ${formData.sponsor_name}`,
            proof_url: formData.paymentProofFile || undefined,
            sponsor_id: sponsor.id,
          }),
        });

        if (!paymentResponse.ok) {
          const paymentResult = await paymentResponse.json();
          throw new Error(paymentResult.error || 'Error al crear el pago');
        }

        const paymentResult = await paymentResponse.json();

        // Update registration with payment_id
        if (result.data?.id && paymentResult.data?.id) {
          await fetch(`/api/sponsors/registrations/${result.data.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              payment_id: paymentResult.data.id,
            }),
          });
        }
      }

      setIsCompleted(true);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el padrinazgo');
      console.error('[SponsorCheckoutForm] Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¡Padrinazgo Registrado Exitosamente!
        </h2>
        <p className="text-gray-600 mb-6">
          Gracias por tu apoyo. Tu padrinazgo ha sido registrado y será procesado pronto.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sponsors"
            className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            Ver Otros Niveles
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  index === currentStep
                    ? 'bg-pink-600 text-white ring-4 ring-pink-200'
                    : index < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  index === currentStep ? 'text-pink-600' : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="glass-card p-6 lg:p-8">
        {currentStep === 0 && (
          <SponsorInfoStep data={formData} updateData={updateData} />
        )}
        {currentStep === 1 && (
          <SponsorDocumentsStep data={formData} updateData={updateData} />
        )}
        {currentStep === 2 && (
          <SponsorPaymentStep
            data={formData}
            updateData={updateData}
            onBack={prevStep}
            onSubmit={handleSubmit}
            config={config}
            sponsor={sponsor}
          />
        )}
      </div>

      {/* Navigation Buttons (only for steps 0 and 1) */}
      {currentStep < 2 && (
        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Atrás
          </button>
          <button
            onClick={nextStep}
            disabled={
              currentStep === 0 && !formData.sponsor_name.trim()
            }
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Siguiente
          </button>
        </div>
      )}

      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Procesando padrinazgo...</p>
          </div>
        </div>
      )}
    </div>
  );
}

