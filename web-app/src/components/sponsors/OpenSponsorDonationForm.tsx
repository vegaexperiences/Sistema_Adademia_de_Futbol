'use client';

import { useState, useRef } from 'react';
import { DollarSign, Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { SystemConfig } from '@/lib/actions/config';
import { uploadFile } from '@/lib/utils/file-upload';
import { YappyPaymentButton } from '@/components/payments/YappyPaymentButton';
import { PagueloFacilPaymentButton } from '@/components/payments/PagueloFacilPaymentButton';
import { SponsorInfoStep } from './SponsorInfoStep';

interface OpenSponsorDonationFormProps {
  config: SystemConfig;
}

export function OpenSponsorDonationForm({ config }: OpenSponsorDonationFormProps) {
  const [formData, setFormData] = useState({
    sponsor_name: '',
    sponsor_email: '',
    sponsor_phone: '',
    sponsor_cedula: '',
    sponsor_company: '',
    sponsor_ruc: '',
  });
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [proofFile, setProofFile] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFormData = (newData: any) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const path = `sponsors/payments/proofs/${formData.sponsor_cedula || 'payment'}`;
      const result = await uploadFile(file, path);

      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }

      if (result.url) {
        setProofFile(result.url);
      }
    } catch (error: any) {
      setError(error.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setProofFile('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.sponsor_name.trim()) {
      setError('Por favor ingresa tu nombre completo');
      return;
    }

    if (!paymentMethod) {
      setError('Por favor selecciona un método de pago');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount < 1) {
      setError('El monto debe ser mayor o igual a $1.00');
      return;
    }

    if ((paymentMethod === 'Transferencia' || paymentMethod === 'Comprobante') && !proofFile) {
      setError('Por favor sube un comprobante de pago');
      return;
    }

    // For Yappy and PagueloFacil, the payment buttons handle the submission
    if (paymentMethod === 'Yappy' || paymentMethod === 'PagueloFacil') {
      setError('Por favor usa el botón de pago correspondiente');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/sponsors/open-donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sponsor_name: formData.sponsor_name,
          sponsor_email: formData.sponsor_email || undefined,
          sponsor_phone: formData.sponsor_phone || undefined,
          sponsor_cedula: formData.sponsor_cedula || undefined,
          sponsor_company: formData.sponsor_company || undefined,
          sponsor_ruc: formData.sponsor_ruc || undefined,
          amount: paymentAmount,
          method: paymentMethod,
          notes: notes || undefined,
          proof_url: proofFile || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al procesar la donación');
      }

      setSuccess(true);
      // Reset form
      setFormData({
        sponsor_name: '',
        sponsor_email: '',
        sponsor_phone: '',
        sponsor_cedula: '',
        sponsor_company: '',
        sponsor_ruc: '',
      });
      setAmount('');
      setNotes('');
      setProofFile('');
      setPaymentMethod('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la donación');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¡Donación Registrada Exitosamente!
        </h2>
        <p className="text-gray-600 mb-6">
          Gracias por tu apoyo. Tu donación ha sido registrada y será procesada pronto.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          Volver al Inicio
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 sm:p-8 lg:p-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Realizar Donación</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sponsor Information */}
        <SponsorInfoStep data={formData} updateData={updateFormData} />

        {/* Donation Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto de Donación <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-2">(Mínimo $1.00)</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="number"
              step="0.01"
              min="1.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>
          {amount && parseFloat(amount) > 0 && parseFloat(amount) < 1.00 && (
            <p className="text-sm text-red-600 mt-1">El monto mínimo es $1.00</p>
          )}
        </div>

        {/* Payment Methods Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Método de Pago <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Yappy */}
            {config.paymentMethods.yappy && (
              <div
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'Yappy'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50'
                    : 'border-gray-200 hover:border-blue-400 bg-white'
                }`}
                onClick={() => setPaymentMethod('Yappy')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-blue-600">Yappy Comercial</span>
                  {paymentMethod === 'Yappy' && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">Busca @SuarezAcademy en el directorio.</p>
              </div>
            )}

            {/* Paguelo Fácil */}
            {config.paymentMethods.paguelofacil && (
              <div
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'PagueloFacil'
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500 ring-opacity-50'
                    : 'border-gray-200 hover:border-purple-400 bg-white'
                }`}
                onClick={() => setPaymentMethod('PagueloFacil')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-purple-600">Paguelo Fácil</span>
                  {paymentMethod === 'PagueloFacil' && (
                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">Pago con tarjeta de crédito o débito.</p>
              </div>
            )}

            {/* Transferencia */}
            {config.paymentMethods.transfer && (
              <div
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'Transferencia'
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-50'
                    : 'border-gray-200 hover:border-green-400 bg-white'
                }`}
                onClick={() => setPaymentMethod('Transferencia')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-green-600">Transferencia Bancaria</span>
                  {paymentMethod === 'Transferencia' && (
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">Transferencia directa a nuestra cuenta.</p>
              </div>
            )}

            {/* Comprobante */}
            {config.paymentMethods.proof && (
              <div
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'Comprobante'
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500 ring-opacity-50'
                    : 'border-gray-200 hover:border-orange-400 bg-white'
                }`}
                onClick={() => setPaymentMethod('Comprobante')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-orange-600">Comprobante de Pago</span>
                  {paymentMethod === 'Comprobante' && (
                    <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">Sube un comprobante de tu pago.</p>
              </div>
            )}

            {/* ACH */}
            {config.paymentMethods.ach && (
              <div
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'ACH'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-opacity-50'
                    : 'border-gray-200 hover:border-indigo-400 bg-white'
                }`}
                onClick={() => setPaymentMethod('ACH')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-indigo-600">ACH</span>
                  {paymentMethod === 'ACH' && (
                    <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">Transferencia ACH directa.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Specific Forms */}
        {(paymentMethod === 'Transferencia' || paymentMethod === 'Comprobante' || paymentMethod === 'ACH') && (
          <>
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                rows={3}
                placeholder="Información adicional sobre la donación..."
              />
            </div>

            {/* Proof Upload for Transferencia and Comprobante */}
            {(paymentMethod === 'Transferencia' || paymentMethod === 'Comprobante') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comprobante de Pago <span className="text-red-500">*</span>
                </label>
                {!proofFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label
                      htmlFor="proof-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      {uploading ? (
                        <Loader2 className="h-8 w-8 text-pink-500 animate-spin mb-2" />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      )}
                      <span className="text-sm text-gray-600">
                        {uploading ? 'Subiendo...' : 'Haz clic para subir o arrastra aquí'}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">PNG, JPG, PDF hasta 5MB</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">Comprobante subido</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !amount || (paymentMethod !== 'ACH' && !proofFile)}
              className="w-full bg-pink-600 text-white py-4 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign className="h-5 w-5" />
                  Registrar Donación
                </>
              )}
            </button>
          </>
        )}

        {/* Yappy Payment Button */}
        {paymentMethod === 'Yappy' && config.paymentMethods.yappy && (
          <div className="space-y-4">
            {(() => {
              const paymentAmount = parseFloat(amount) || 0;
              const isValidAmount = paymentAmount >= 1.00;
              
              if (!isValidAmount || !amount) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      {!amount 
                        ? 'Por favor ingresa el monto de donación'
                        : 'El monto mínimo es $1.00'}
                    </p>
                  </div>
                );
              }
              
              if (!formData.sponsor_name.trim()) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      Por favor completa tu nombre
                    </p>
                  </div>
                );
              }
              
              return (
                <YappyPaymentButton
                  amount={paymentAmount}
                  description={`Donación de padrino - ${formData.sponsor_name}`}
                  orderId={`sponsor-open-${Date.now()}`}
                  paymentType="sponsor"
                  customParams={{
                    type: 'sponsor',
                    sponsorName: formData.sponsor_name,
                    sponsor_name: formData.sponsor_name,
                    sponsorEmail: formData.sponsor_email || '',
                    sponsor_email: formData.sponsor_email || '',
                    sponsorCedula: formData.sponsor_cedula || '',
                    sponsor_cedula: formData.sponsor_cedula || '',
                    sponsorCompany: formData.sponsor_company || '',
                    sponsor_company: formData.sponsor_company || '',
                    sponsorRuc: formData.sponsor_ruc || '',
                    sponsor_ruc: formData.sponsor_ruc || '',
                    amount: paymentAmount.toString(),
                    isOpenDonation: 'true',
                  }}
                  metadata={{
                    type: 'sponsor',
                    sponsor_name: formData.sponsor_name,
                    sponsor_email: formData.sponsor_email || '',
                    sponsor_cedula: formData.sponsor_cedula || '',
                    sponsor_company: formData.sponsor_company || '',
                    sponsor_ruc: formData.sponsor_ruc || '',
                    isOpenDonation: true,
                  }}
                  returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/sponsors?yappy=success`}
                  onSuccess={() => {
                    setSuccess(true);
                    setPaymentMethod('');
                    setAmount('');
                    setFormData({
                      sponsor_name: '',
                      sponsor_email: '',
                      sponsor_phone: '',
                      sponsor_cedula: '',
                      sponsor_company: '',
                      sponsor_ruc: '',
                    });
                  }}
                  onError={(error) => {
                    setError(error);
                  }}
                />
              );
            })()}
          </div>
        )}

        {/* Paguelo Fácil Payment Button */}
        {paymentMethod === 'PagueloFacil' && config.paymentMethods.paguelofacil && (
          <div className="space-y-4">
            {(() => {
              const paymentAmount = parseFloat(amount) || 0;
              const isValidAmount = paymentAmount >= 1.00;
              
              if (!isValidAmount || !amount) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      {!amount 
                        ? 'Por favor ingresa el monto de donación'
                        : 'El monto mínimo es $1.00'}
                    </p>
                  </div>
                );
              }
              
              if (!formData.sponsor_name.trim()) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      Por favor completa tu nombre
                    </p>
                  </div>
                );
              }
              
              return (
                <PagueloFacilPaymentButton
                  amount={paymentAmount}
                  description={`Donación de padrino - ${formData.sponsor_name}`}
                  email={formData.sponsor_email || ''}
                  orderId={`sponsor-open-${Date.now()}`}
                  returnUrl={() => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    return `${baseUrl}/sponsors?paguelofacil=success`;
                  }}
                  customParams={{
                    type: 'sponsor',
                    sponsorName: formData.sponsor_name,
                    sponsorEmail: formData.sponsor_email || '',
                    sponsorCedula: formData.sponsor_cedula || '',
                    sponsorCompany: formData.sponsor_company || '',
                    sponsorRuc: formData.sponsor_ruc || '',
                    amount: paymentAmount.toString(),
                    isOpenDonation: 'true',
                  }}
                  enrollmentData={{
                    sponsor_name: formData.sponsor_name,
                    sponsor_email: formData.sponsor_email || '',
                    sponsor_cedula: formData.sponsor_cedula || '',
                    sponsor_company: formData.sponsor_company || '',
                    sponsor_ruc: formData.sponsor_ruc || '',
                    isOpenDonation: true,
                  }}
                  onSuccess={() => {
                    setSuccess(true);
                    setPaymentMethod('');
                    setAmount('');
                    setFormData({
                      sponsor_name: '',
                      sponsor_email: '',
                      sponsor_phone: '',
                      sponsor_cedula: '',
                      sponsor_company: '',
                      sponsor_ruc: '',
                    });
                  }}
                  onError={(errorMsg: string) => {
                    setError(errorMsg);
                  }}
                />
              );
            })()}
          </div>
        )}
      </form>
    </div>
  );
}
