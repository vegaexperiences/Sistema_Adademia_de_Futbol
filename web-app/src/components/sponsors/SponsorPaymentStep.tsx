'use client';

import { CheckCircle, Upload, FileText, X, Loader2 } from 'lucide-react';
import { SystemConfig } from '@/lib/actions/config';
import { useRef, useState, useEffect } from 'react';
import { uploadFile } from '@/lib/utils/file-upload';
import { PagueloFacilPaymentButton } from '@/components/payments/PagueloFacilPaymentButton';
import { YappyPaymentButton } from '@/components/payments/YappyPaymentButton';
import { Sponsor } from '@/lib/actions/sponsors';

interface SponsorPaymentStepProps {
  data: {
    paymentMethod: string;
    paymentProofFile: string;
    sponsor_name: string;
    sponsor_email: string;
    sponsor_cedula: string;
  };
  updateData: (data: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  config: SystemConfig;
  sponsor: Sponsor;
}

export function SponsorPaymentStep({
  data,
  updateData,
  onBack,
  onSubmit,
  config,
  sponsor,
}: SponsorPaymentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [enrollmentToken, setEnrollmentToken] = useState<string | null>(null);

  const handlePaymentSelection = (method: string) => {
    updateData({ paymentMethod: method });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const path = `sponsors/payments/proofs/${data.sponsor_cedula || 'payment'}`;
      const result = await uploadFile(file, path);

      if (result.error) {
        setUploadError(result.error);
        setUploading(false);
        return;
      }

      if (result.url) {
        updateData({ paymentProofFile: result.url });
      }
    } catch (error: any) {
      setUploadError(error.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    updateData({ paymentProofFile: '' });
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalAmount = sponsor.amount;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Pago de Padrinazgo</h2>
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Nivel:</strong> {sponsor.name}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            <strong>Total a pagar:</strong>{' '}
            <span className="font-bold text-pink-600 text-lg">${totalAmount.toFixed(2)}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Yappy */}
          {config.paymentMethods.yappy && (
            <div
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'Yappy'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-blue-400 bg-white'
              }`}
              onClick={() => handlePaymentSelection('Yappy')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-blue-600">Yappy Comercial</span>
                {data.paymentMethod === 'Yappy' && <CheckCircle className="text-blue-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Busca <b>@SuarezAcademy</b> en el directorio.</p>
            </div>
          )}

          {/* Transfer */}
          {config.paymentMethods.transfer && (
            <div
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'Transferencia'
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-green-400 bg-white'
              }`}
              onClick={() => handlePaymentSelection('Transferencia')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-green-600">Transferencia Bancaria</span>
                {data.paymentMethod === 'Transferencia' && <CheckCircle className="text-green-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Transferencia directa a nuestra cuenta.</p>
            </div>
          )}

          {/* Paguelo Fácil */}
          {config.paymentMethods.paguelofacil && (
            <div
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'PagueloFacil'
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-purple-400 bg-white'
              }`}
              onClick={() => handlePaymentSelection('PagueloFacil')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-purple-600">Paguelo Fácil</span>
                {data.paymentMethod === 'PagueloFacil' && <CheckCircle className="text-purple-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Pago con tarjeta de crédito o débito.</p>
            </div>
          )}

          {/* Proof */}
          {config.paymentMethods.proof && (
            <div
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'Comprobante'
                  ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-orange-400 bg-white'
              }`}
              onClick={() => handlePaymentSelection('Comprobante')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-orange-600">Comprobante de Pago</span>
                {data.paymentMethod === 'Comprobante' && <CheckCircle className="text-orange-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Sube un comprobante de tu pago.</p>
            </div>
          )}

          {/* ACH */}
          {config.paymentMethods.ach === true && (
            <div
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'ACH'
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-indigo-400 bg-white'
              }`}
              onClick={() => handlePaymentSelection('ACH')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-indigo-600">ACH</span>
                {data.paymentMethod === 'ACH' && <CheckCircle className="text-indigo-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Transferencia ACH directa.</p>
            </div>
          )}
        </div>

        {/* Payment Method Specific UI */}
        {data.paymentMethod === 'Comprobante' && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subir Comprobante de Pago
            </label>
            {!data.paymentProofFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="payment-proof"
                />
                <label
                  htmlFor="payment-proof"
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
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            )}
          </div>
        )}

        {/* Yappy Payment Button */}
        {data.paymentMethod === 'Yappy' && (
          <YappyPaymentButton
            amount={totalAmount}
            description={`Padrinazgo: ${sponsor.name} - ${data.sponsor_name}`}
            paymentType="sponsor"
            metadata={{
              sponsor_id: sponsor.id,
              sponsor_name: data.sponsor_name,
              sponsor_email: data.sponsor_email,
              sponsor_cedula: data.sponsor_cedula,
            }}
            onSuccess={() => {
              // This will be handled by the callback
              onSubmit();
            }}
          />
        )}

        {/* Paguelo Fácil Payment Button */}
        {data.paymentMethod === 'PagueloFacil' && (
          <PagueloFacilPaymentButton
            amount={totalAmount}
            description={`Padrinazgo: ${sponsor.name} - ${data.sponsor_name}`}
            email={data.sponsor_email || ''}
            orderId={`sponsor-${sponsor.id}-${Date.now()}`}
            returnUrl={() => {
              const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
              return `${baseUrl}/api/payments/paguelofacil/callback?type=sponsor&amount=${totalAmount}&sponsorId=${sponsor.id}&sponsorName=${encodeURIComponent(data.sponsor_name)}&sponsorEmail=${encodeURIComponent(data.sponsor_email || '')}`;
            }}
            customParams={{
              type: 'sponsor',
              sponsorId: sponsor.id,
              sponsorName: data.sponsor_name,
              sponsorEmail: data.sponsor_email || '',
              amount: totalAmount.toString(),
            }}
            enrollmentData={{
              sponsor_id: sponsor.id,
              sponsor_name: data.sponsor_name,
              sponsor_email: data.sponsor_email,
              sponsor_cedula: data.sponsor_cedula,
            }}
            onSuccess={() => {
              // This will be handled by the callback
              onSubmit();
            }}
            onError={(errorMsg: string) => {
              setError(errorMsg);
            }}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Atrás
        </button>
        <button
          onClick={onSubmit}
          disabled={!data.paymentMethod || (data.paymentMethod === 'Comprobante' && !data.paymentProofFile)}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {data.paymentMethod === 'Yappy' || data.paymentMethod === 'PagueloFacil'
            ? 'Procesar Pago'
            : 'Completar Padrinazgo'}
        </button>
      </div>
    </div>
  );
}

