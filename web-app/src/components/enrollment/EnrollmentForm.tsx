'use client';

import { useState } from 'react';
import { TutorStep } from './steps/TutorStep';
import { PlayerStep } from './steps/PlayerStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { PaymentStep } from './steps/PaymentStep';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  { id: 'tutor', title: 'Tutor' },
  { id: 'player', title: 'Jugador' },
  { id: 'documents', title: 'Documentos' },
  { id: 'payment', title: 'Pago' },
];

import { SystemConfig } from '@/lib/actions/config';

interface EnrollmentFormProps {
  config: SystemConfig;
}

export function EnrollmentForm({ config }: EnrollmentFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Tutor
    tutorName: '',
    tutorCedula: '',
    tutorEmail: '',
    tutorPhone: '',
    // Players (Array)
    players: [{
      firstName: '',
      lastName: '',
      birthDate: '',
      gender: '',
      cedula: '',
      category: '',
      cedulaFrontFile: '',
      cedulaBackFile: ''
    }],
    // Documents
    cedulaTutorFile: '',
    // Payment
    paymentMethod: '',
    paymentProofFile: ''
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateData = (newData: any) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const updatePlayer = (index: number, playerData: any) => {
    const newPlayers = [...formData.players];
    newPlayers[index] = { ...newPlayers[index], ...playerData };
    setFormData(prev => ({ ...prev, players: newPlayers }));
  };

  const addPlayer = () => {
    setFormData(prev => ({
      ...prev,
      players: [...prev.players, {
        firstName: '',
        lastName: '',
        birthDate: '',
        gender: '',
        cedula: '',
        category: '',
        cedulaFrontFile: '',
        cedulaBackFile: ''
      }]
    }));
  };

  const removePlayer = (index: number) => {
    if (formData.players.length > 1) {
      const newPlayers = formData.players.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, players: newPlayers }));
    }
  };

  const updatePlayerFile = (index: number, field: string, fileName: string) => {
    const newPlayers = [...formData.players];
    newPlayers[index] = { ...newPlayers[index], [field]: fileName };
    setFormData(prev => ({ ...prev, players: newPlayers }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) {
      console.warn('[EnrollmentForm] Submission already in progress, ignoring duplicate call');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Submitting form data:', formData);
      
      const response = await fetch('/api/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('[EnrollmentForm] Response status:', response.status);
      console.log('[EnrollmentForm] Response data:', result);

      if (!response.ok) {
        // Handle error responses
        const errorMessage = result.error || 'Error al procesar la matrícula';
        const errorDetails = result.details || result.issues || '';
        console.error('[EnrollmentForm] Error response:', {
          status: response.status,
          error: errorMessage,
          details: errorDetails,
        });
        
        alert(`${errorMessage}${errorDetails ? '\n\nDetalles: ' + JSON.stringify(errorDetails, null, 2) : ''}`);
        setIsSubmitting(false); // Allow retry on error
        return;
      }

      if (result.success) {
        // In a real app, we would redirect to result.paymentUrl
        // For this demo, we just show the success screen and log the URL
        console.log('Redirecting to payment:', result.paymentUrl);
        
        // If it's a duplicate, show a message but still mark as completed
        if (result.duplicate) {
          alert(result.message || 'Esta solicitud ya fue registrada anteriormente.');
        }
        
        setIsCompleted(true);
      } else {
        alert('Error al procesar la matrícula. Por favor intente nuevamente.');
        setIsSubmitting(false); // Allow retry on error
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ocurrió un error inesperado.');
      setIsSubmitting(false); // Allow retry on error
    }
  };

  if (isCompleted) {
    return (
      <div className="p-10 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Matrícula Exitosa!</h2>
        <p className="text-gray-600 mb-8">
          Hemos recibido tu información y el pago correctamente. Te hemos enviado un correo de confirmación a <strong>{formData.tutorEmail}</strong>.
        </p>
        <Link
          href="/"
          className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      {/* Progress Bar */}
      <div className="bg-gray-100 dark:bg-gray-800/50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          {/* Progress Line Background - Positioned absolutely to be behind circles */}
          <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-0 hidden sm:block" />
          
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 touch-manipulation ${
                  index <= currentStep
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg scale-110'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                }`}
              >
                {index + 1}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1 sm:mt-2 font-medium transition-colors duration-300 text-center ${
                index <= currentStep 
                  ? 'text-blue-700 dark:text-blue-400 font-bold' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4 sm:p-6 md:p-10 flex-grow overflow-visible">
        {currentStep === 0 && (
          <TutorStep data={formData} updateData={updateData} onNext={nextStep} />
        )}
        {currentStep === 1 && (
          <PlayerStep
            data={formData}
            updatePlayer={updatePlayer}
            addPlayer={addPlayer}
            removePlayer={removePlayer}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 2 && (
          <DocumentsStep
            data={formData}
            updateData={updateData}
            updatePlayerFile={updatePlayerFile}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 3 && (
          <PaymentStep
            data={formData}
            updateData={updateData}
            onBack={prevStep}
            onSubmit={handleSubmit}
            config={config}
          />
        )}
      </div>
    </div>
  );
}
