'use client';

import { useState, useEffect, useRef } from 'react';
import { DollarSign, Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { processPublicPayment, getPaymentMethodsConfig } from '@/lib/actions/payment-portal';
import { uploadFile } from '@/lib/utils/file-upload';
import { YappyPaymentButton } from '@/components/payments/YappyPaymentButton';
import { PagueloFacilPaymentButton } from '@/components/payments/PagueloFacilPaymentButton';

interface PublicPaymentFormProps {
  playerId: string;
  playerName: string;
  balance: number;
  pendingCharges: Array<{
    id: string;
    month_year: string | null;
    amount: number;
    status: string;
  }>;
}

export function PublicPaymentForm({
  playerId,
  playerName,
  balance,
  pendingCharges,
}: PublicPaymentFormProps) {
  const [paymentType, setPaymentType] = useState<'pending' | 'advance'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [proofFile, setProofFile] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load payment methods config
  useEffect(() => {
    getPaymentMethodsConfig().then((result) => {
      if (result.data) {
        setPaymentMethods(result.data);
      }
    });
  }, []);

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
      const path = `payments/proofs/public/${playerId}`;
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

    if (!paymentMethod) {
      setError('Por favor selecciona un método de pago');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if ((paymentMethod === 'Transferencia' || paymentMethod === 'Comprobante') && !proofFile) {
      setError('Por favor sube un comprobante de pago');
      return;
    }

    setSubmitting(true);

    try {
      // For Yappy and PagueloFacil, the payment buttons handle the submission
      // This form is only for manual methods (Transferencia, Comprobante, ACH)
      if (paymentMethod === 'Yappy' || paymentMethod === 'PagueloFacil') {
        setError('Por favor usa el botón de pago correspondiente');
        setSubmitting(false);
        return;
      }

      const isAdvancePayment = paymentType === 'advance';
      const monthYear = isAdvancePayment ? undefined : (pendingCharges.length > 0 ? pendingCharges[0].month_year || undefined : undefined);

      const result = await processPublicPayment({
        player_id: playerId,
        amount: paymentAmount,
        method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
        notes: notes || `Pago público - ${paymentMethod} - ${playerName}`,
        proof_url: proofFile || undefined,
        month_year: monthYear,
        isAdvancePayment: isAdvancePayment,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Reset form
        setAmount('');
        setNotes('');
        setProofFile('');
        setPaymentMethod('');
        setPaymentType('pending');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  const suggestedAmount = balance > 0 ? balance : pendingCharges.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Realizar Pago</h2>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-900">¡Pago registrado exitosamente!</p>
            <p className="text-sm text-green-800">El pago será verificado y procesado pronto.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Payment Type Selection (Radio Buttons) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de Pago <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className={`border rounded-xl p-4 cursor-pointer transition-all ${
              paymentType === 'pending'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50'
                : 'border-gray-200 hover:border-blue-400 bg-white'
            }`}
            onClick={() => {
              setPaymentType('pending');
              setAmount('');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Pagar Cargo Pendiente</p>
                <p className="text-sm text-gray-600 mt-1">Pagar cargos mensuales pendientes</p>
              </div>
              {paymentType === 'pending' && (
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>

          <div
            className={`border rounded-xl p-4 cursor-pointer transition-all ${
              paymentType === 'advance'
                ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-50'
                : 'border-gray-200 hover:border-green-400 bg-white'
            }`}
            onClick={() => {
              setPaymentType('advance');
              setAmount('');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Pago Adelantado</p>
                <p className="text-sm text-gray-600 mt-1">Pago como crédito para futuros cargos</p>
              </div>
              {paymentType === 'advance' && (
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advance Payment Explanation */}
      {paymentType === 'advance' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-900 mb-2">
            <strong>💡 ¿Cómo funciona el pago adelantado?</strong>
          </p>
          <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
            <li>Este pago se aplicará como crédito a tu cuenta</li>
            <li>El crédito se usará automáticamente para futuros cargos mensuales</li>
            <li>Puedes ingresar cualquier monto que desees adelantar</li>
            <li>Tu balance puede quedar negativo (esto indica crédito disponible)</li>
          </ul>
        </div>
      )}

      {/* Suggested Amount (only for pending charges) */}
      {paymentType === 'pending' && suggestedAmount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 mb-2">
            <strong>Monto sugerido:</strong> ${suggestedAmount.toFixed(2)}
          </p>
          <button
            type="button"
            onClick={() => setAmount(suggestedAmount.toFixed(2))}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Usar este monto
          </button>
        </div>
      )}

      {/* Payment Methods Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Método de Pago <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Yappy */}
          {paymentMethods?.yappy && (
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
          {paymentMethods?.paguelofacil && (
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
          {paymentMethods?.transfer && (
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
          {paymentMethods?.proof && (
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
          {paymentMethods?.ach && (
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto a Pagar <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Información adicional sobre el pago..."
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
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
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
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <DollarSign className="h-5 w-5" />
                Registrar Pago
              </>
            )}
          </button>
        </form>
      )}

      {/* Yappy Payment Button */}
      {paymentMethod === 'Yappy' && paymentMethods?.yappy && (
        <YappyPaymentButton
          amount={parseFloat(amount) || 0}
          description={paymentType === 'advance' ? `Pago adelantado - ${playerName}` : `Pago mensualidad - ${playerName}`}
          orderId={`public-payment-${playerId}-${Date.now()}`}
          paymentType={paymentType === 'advance' ? 'custom' : 'monthly'}
          customParams={{
            type: paymentType === 'advance' ? 'custom' : 'monthly',
            playerId: playerId,
            amount: (parseFloat(amount) || 0).toString(),
            isAdvancePayment: paymentType === 'advance' ? 'true' : 'false',
          }}
          metadata={{
            type: paymentType === 'advance' ? 'custom' : 'monthly',
            player_id: playerId,
            isAdvancePayment: paymentType === 'advance',
          }}
          returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${playerId}?success=true`}
          onSuccess={() => {
            setSuccess(true);
            setPaymentMethod('');
            setAmount('');
            setPaymentType('pending');
          }}
          onError={(error) => {
            setError(error);
          }}
        />
      )}

      {/* Paguelo Fácil Payment Button */}
      {paymentMethod === 'PagueloFacil' && paymentMethods?.paguelofacil && (
        <PagueloFacilPaymentButton
          amount={parseFloat(amount) || 0}
          description={paymentType === 'advance' ? `Pago adelantado - ${playerName}` : `Pago mensualidad - ${playerName}`}
          email=""
          orderId={`public-payment-${playerId}-${Date.now()}`}
          returnUrl={() => {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            return `${baseUrl}/pay/${playerId}?success=true`;
          }}
          customParams={{
            type: paymentType === 'advance' ? 'custom' : 'monthly',
            playerId: playerId,
            amount: (parseFloat(amount) || 0).toString(),
            isAdvancePayment: paymentType === 'advance' ? 'true' : 'false',
          }}
          enrollmentData={{}}
          onSuccess={() => {
            setSuccess(true);
            setPaymentMethod('');
            setAmount('');
            setPaymentType('pending');
          }}
          onError={(errorMsg: string) => {
            setError(errorMsg);
          }}
        />
      )}
    </div>
  );
}

