'use client';

import { useState, useRef } from 'react';
import { X, DollarSign, Upload, FileText, Loader2, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ExternalIncomeFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const INCOME_CATEGORIES = [
  'Patrocinios/Sponsorships',
  'Donaciones',
  'Eventos/Torneos',
  'Servicios externos',
  'Venta de productos',
  'Alquileres',
  'Otros ingresos',
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia Bancaria' },
  { value: 'ach', label: 'ACH' },
  { value: 'yappy', label: 'Yappy' },
  { value: 'paguelofacil', label: 'Paguelo Fácil' },
  { value: 'other', label: 'Otro' },
];

export function ExternalIncomeForm({ onClose, onSuccess }: ExternalIncomeFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    amount: '',
    income_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'transfer' | 'ach' | 'yappy' | 'paguelofacil' | 'other',
    description: '',
    category: '',
    source: '',
    notes: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      setProofFile(file);
      setError(null);
    }
  };

  const removeFile = () => {
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (!formData.description.trim()) {
      setError('La descripción es requerida');
      return;
    }

    if (!formData.category) {
      setError('La categoría es requerida');
      return;
    }

    if ((formData.payment_method === 'transfer' || formData.payment_method === 'cash') && !proofFile) {
      setError('Por favor sube un comprobante de pago');
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      // Upload proof file if provided
      let proofUrl: string | undefined;
      if (proofFile) {
        const { uploadFile } = await import('@/lib/utils/file-upload');
        const uploadResult = await uploadFile(
          proofFile,
          `finances/external-income/${Date.now()}-${proofFile.name}`
        );
        if (uploadResult.error) {
          setError(`Error al subir el comprobante: ${uploadResult.error}`);
          setUploading(false);
          setSubmitting(false);
          return;
        }
        proofUrl = uploadResult.url || undefined;
      }

      setUploading(false);

      // Create external income via API
      const response = await fetch('/api/finances/external-income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          income_date: formData.income_date,
          payment_method: formData.payment_method,
          description: formData.description,
          category: formData.category,
          source: formData.source || undefined,
          notes: formData.notes || undefined,
          proof_url: proofUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el ingreso externo');
      }

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el ingreso');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="glass-card p-6 animate-fade-in w-full">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nuevo Ingreso Externo</h2>
          <p className="text-sm text-gray-600 mt-1">
            Registra ingresos que provienen de fuentes externas (no de jugadores)
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">¡Ingreso externo registrado exitosamente!</p>
              <p className="text-sm text-green-800">El ingreso se ha agregado a los reportes financieros.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Income Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Ingreso <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.income_date}
            onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción/Concepto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Patrocinio de empresa XYZ, Venta de camisetas, etc."
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría de Ingreso <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Selecciona una categoría</option>
            {INCOME_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Source/Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fuente/Proveedor <span className="text-gray-400 text-xs">(Opcional)</span>
          </label>
          <input
            type="text"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Empresa ABC, Juan Pérez, etc."
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Método de Pago <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.payment_method}
            onChange={(e) => {
              setFormData({ ...formData, payment_method: e.target.value as any });
              setProofFile(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {/* Proof Upload */}
        {(formData.payment_method === 'transfer' || formData.payment_method === 'cash') && (
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
                  id="proof-upload-external"
                />
                <label
                  htmlFor="proof-upload-external"
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
                  <span className="text-sm text-gray-700">{proofFile.name}</span>
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

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Adicionales <span className="text-gray-400 text-xs">(Opcional)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Información adicional sobre el ingreso..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || uploading || !formData.amount || !formData.description || !formData.category}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(submitting || uploading) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Registrar Ingreso
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}



