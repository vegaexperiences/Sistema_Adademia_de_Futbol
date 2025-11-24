import { CheckCircle, Upload, FileText, X } from 'lucide-react';
import { SystemConfig } from '@/lib/actions/config';
import { useRef } from 'react';

interface PaymentStepProps {
  data: any;
  updateData: (data: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  config: SystemConfig;
}

export function PaymentStep({ data, updateData, onBack, onSubmit, config }: PaymentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaymentSelection = (method: string) => {
    updateData({ paymentMethod: method });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock upload - in real app, upload to storage and get URL
      updateData({ paymentProofFile: file.name });
    }
  };

  const removeFile = () => {
    updateData({ paymentProofFile: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const basePrice = config.prices.enrollment;
  const totalAmount = basePrice * data.players.length; // No discount for enrollment

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pago de Matrícula</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Total a pagar por {data.players.length} jugador(es): <span className="font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Yappy */}
          {config.paymentMethods.yappy && (
            <div 
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'Yappy' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 ring-opacity-50' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 bg-white dark:bg-gray-800'
              }`}
              onClick={() => handlePaymentSelection('Yappy')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">Yappy Comercial</span>
                {data.paymentMethod === 'Yappy' && <CheckCircle className="text-blue-600 dark:text-blue-400 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Busca <b>@SuarezAcademy</b> en el directorio.</p>
            </div>
          )}

          {/* Transfer */}
          {config.paymentMethods.transfer && (
            <div 
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'Transferencia' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500 ring-opacity-50' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-400 bg-white dark:bg-gray-800'
              }`}
              onClick={() => handlePaymentSelection('Transferencia')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-green-600 dark:text-green-400">Transferencia</span>
                {data.paymentMethod === 'Transferencia' && <CheckCircle className="text-green-600 dark:text-green-400 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Banco General - Cuenta de Ahorros.</p>
            </div>
          )}

          {/* Proof Upload */}
          {config.paymentMethods.proof && (
            <div 
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                data.paymentMethod === 'Comprobante' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500 ring-opacity-50' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-400 bg-white dark:bg-gray-800'
              }`}
              onClick={() => handlePaymentSelection('Comprobante')}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-purple-600 dark:text-purple-400">Subir Comprobante</span>
                {data.paymentMethod === 'Comprobante' && <CheckCircle className="text-purple-600 dark:text-purple-400 h-6 w-6" />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Sube una foto o captura del pago.</p>
            </div>
          )}
        </div>

        {/* File Upload Section for Proof */}
        {(data.paymentMethod === 'Comprobante' || data.paymentMethod === 'Transferencia' || data.paymentMethod === 'Yappy') && (
          <div className="mt-4 animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adjuntar Comprobante
            </label>
            
            {!data.paymentProofFile ? (
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Clic para subir imagen
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  JPG, PNG o PDF (Max 5MB)
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[200px]">
                    {data.paymentProofFile}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={removeFile}
                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!data.paymentMethod || (['Comprobante', 'Transferencia', 'Yappy'].includes(data.paymentMethod) && !data.paymentProofFile)}
          className={`px-6 py-2 rounded-lg font-bold transition-all shadow-md hover:scale-105 duration-300 ${
            !data.paymentMethod || (['Comprobante', 'Transferencia', 'Yappy'].includes(data.paymentMethod) && !data.paymentProofFile)
              ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-500 shadow-none hover:scale-100' 
              : 'bg-primary text-white hover:bg-primary/90 hover:shadow-lg'
          }`}
        >
          Pagar y Finalizar
        </button>
      </div>
    </div>
  );
}
