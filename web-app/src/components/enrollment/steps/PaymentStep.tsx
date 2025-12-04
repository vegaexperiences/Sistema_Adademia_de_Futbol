'use client';

import { CheckCircle, Upload, FileText, X, Loader2 } from 'lucide-react';
import { SystemConfig } from '@/lib/actions/config';
import { useRef, useState } from 'react';
import { uploadFile } from '@/lib/utils/file-upload';
import { PagueloFacilCheckout } from '@/components/payments/PagueloFacilCheckout';
import { YappyPaymentButton } from '@/components/payments/YappyPaymentButton';

interface PaymentStepProps {
  data: any;
  updateData: (data: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  config: SystemConfig;
}

export function PaymentStep({ data, updateData, onBack, onSubmit, config }: PaymentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPagueloFacilCheckout, setShowPagueloFacilCheckout] = useState(false);
  const [pagueloFacilConfig, setPagueloFacilConfig] = useState<{ apiKey: string; cclw: string; sandbox: boolean } | null>(null);

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
      const path = `payments/proofs/${data.tutorCedula || 'payment'}`;
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

  const basePrice = config.prices.enrollment;
  const totalAmount = basePrice * data.players.length;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Pago de Matrícula</h2>
        <p className="text-sm text-gray-500">
          Total a pagar por {data.players.length} jugador(es): <span className="font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
        </p>

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
                <span className="font-bold text-lg text-green-600">Transferencia</span>
                {data.paymentMethod === 'Transferencia' && <CheckCircle className="text-green-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Banco General - Cuenta de Ahorros.</p>
            </div>
          )}

          {/* Proof Upload */}
          {config.paymentMethods.proof && (
            <div 
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'Comprobante' 
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500 ring-opacity-50' 
                  : 'border-gray-200 hover:border-purple-400 bg-white'
              }`}
              onClick={() => handlePaymentSelection('Comprobante')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-purple-600">Subir Comprobante</span>
                {data.paymentMethod === 'Comprobante' && <CheckCircle className="text-purple-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Sube una foto o captura del pago.</p>
            </div>
          )}

          {/* PagueloFacil */}
          {config.paymentMethods.paguelofacil && (
            <div 
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'PagueloFacil' 
                  ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500 ring-opacity-50' 
                  : 'border-gray-200 hover:border-cyan-400 bg-white'
              }`}
              onClick={() => handlePaymentSelection('PagueloFacil')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-cyan-600">💳 Paguelo Fácil</span>
                {data.paymentMethod === 'PagueloFacil' && <CheckCircle className="text-cyan-600 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 mt-2">Pago seguro con tarjeta de crédito/débito.</p>
            </div>
          )}
        </div>

        {/* Yappy Payment Button */}
        {data.paymentMethod === 'Yappy' && (
          <div className="mt-4 animate-fade-in">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Total a pagar:</strong> ${totalAmount.toFixed(2)}
              </p>
              <p className="text-xs text-blue-700">
                Completa el pago con Yappy Comercial. El pago se registrará automáticamente.
              </p>
            </div>
            <YappyPaymentButton
              amount={totalAmount}
              description={`Matrícula para ${data.players.length} jugador(es) - ${data.tutorName}`}
              orderId={`enrollment-${Date.now()}-${data.tutorCedula || 'enrollment'}`}
              returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/yappy/callback?type=enrollment&amount=${totalAmount}`}
              customParams={{
                type: 'enrollment',
                amount: totalAmount.toString(),
                playerCount: data.players.length.toString(),
                tutorName: data.tutorName || '',
                tutorEmail: data.tutorEmail || '',
              }}
              onSuccess={async (transactionId: string) => {
                // Mark payment as complete and submit enrollment
                updateData({ 
                  paymentProofFile: `yappy:${transactionId}` // Store transaction ID as proof
                });
                // Submit the enrollment form (only once)
                if (onSubmit) {
                  onSubmit();
                }
              }}
              onError={(errorMsg: string) => {
                alert('Error en Yappy: ' + errorMsg);
              }}
            />
          </div>
        )}

        {/* File Upload Section for Proof - Not needed for PagueloFacil or Yappy */}
        {(data.paymentMethod === 'Comprobante' || data.paymentMethod === 'Transferencia') && (
          <div className="mt-4 animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjuntar Comprobante
            </label>
            
            {!data.paymentProofFile ? (
              <div 
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${
                  uploading 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-300 hover:border-purple-500 bg-gray-50 cursor-pointer'
                }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      Subiendo archivo...
                    </p>
                  </>
                ) : (
                  <>
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900">
                  Clic para subir imagen
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG o PDF (Max 5MB)
                </p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Comprobante subido correctamente
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={removeFile}
                  className="p-1 hover:bg-green-100 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-sm text-red-500">{uploadError}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-white text-gray-700 border border-gray-300 px-6 py-3 sm:py-3.5 min-h-[48px] rounded-lg active:bg-gray-50 hover:bg-gray-50 transition-colors font-medium text-base touch-manipulation w-full sm:w-auto"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={async () => {
            // If PagueloFacil is selected, open checkout instead of submitting
            if (data.paymentMethod === 'PagueloFacil') {
              try {
                const response = await fetch('/api/payments/paguelofacil');
                const result = await response.json();
                
                if (result.success && result.config) {
                  setPagueloFacilConfig(result.config);
                  setShowPagueloFacilCheckout(true);
                } else {
                  alert('Error al inicializar Paguelo Fácil. Por favor intenta con otro método de pago.');
                }
              } catch (err: any) {
                alert('Error al inicializar Paguelo Fácil: ' + (err.message || 'Error desconocido'));
              }
            } else {
              // For other methods, proceed with normal submission
              onSubmit();
            }
          }}
          disabled={!data.paymentMethod || (['Comprobante', 'Transferencia'].includes(data.paymentMethod) && !data.paymentProofFile) || data.paymentMethod === 'Yappy'}
          className={`px-6 py-2 rounded-lg font-bold transition-all shadow-md hover:scale-105 duration-300 ${
            !data.paymentMethod || (['Comprobante', 'Transferencia'].includes(data.paymentMethod) && !data.paymentProofFile) || data.paymentMethod === 'Yappy'
              ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none hover:scale-100' 
              : 'bg-primary text-white hover:bg-primary/90 hover:shadow-lg'
          }`}
        >
          {data.paymentMethod === 'PagueloFacil' ? 'Continuar con Paguelo Fácil' : 
           data.paymentMethod === 'Yappy' ? 'Completa el pago con Yappy arriba' :
           'Pagar y Finalizar'}
        </button>
      </div>

      {/* PagueloFacil Checkout Modal */}
      {showPagueloFacilCheckout && pagueloFacilConfig && (
        <PagueloFacilCheckout
          amount={totalAmount}
          description={`Matrícula para ${data.players.length} jugador(es) - ${data.tutorName}`}
          email={data.tutorEmail}
          orderId={`enrollment-${Date.now()}`}
          apiKey={pagueloFacilConfig.apiKey}
          cclw={pagueloFacilConfig.cclw}
          sandbox={pagueloFacilConfig.sandbox}
          onSuccess={async (transactionId: string, response: any) => {
            // Mark payment as complete and submit enrollment
            updateData({ 
              paymentProofFile: `paguelofacil:${transactionId}` // Store transaction ID as proof
            });
            setShowPagueloFacilCheckout(false);
            // Submit the enrollment form (only once)
            if (onSubmit) {
              onSubmit();
            }
          }}
          onError={(errorMsg: string) => {
            alert('Error en Paguelo Fácil: ' + errorMsg);
            setShowPagueloFacilCheckout(false);
          }}
          onClose={() => setShowPagueloFacilCheckout(false)}
        />
      )}
    </div>
  );
}
