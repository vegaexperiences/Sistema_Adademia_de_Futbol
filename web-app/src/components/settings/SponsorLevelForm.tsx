'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface SponsorLevelFormProps {
  initialData?: {
    id?: string;
    name?: string;
    description?: string;
    amount?: number;
    benefits?: string[];
    display_order?: number;
    image_url?: string;
    is_active?: boolean;
  };
  onSubmit: (data: {
    name: string;
    description?: string;
    amount: number;
    benefits: string[];
    display_order: number;
    image_url?: string;
    is_active: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SponsorLevelForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SponsorLevelFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [benefits, setBenefits] = useState<string[]>(initialData?.benefits || ['']);
  const [displayOrder, setDisplayOrder] = useState(initialData?.display_order?.toString() || '0');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [isActive, setIsActive] = useState(initialData?.is_active !== undefined ? initialData.is_active : true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    // Filter out empty benefits
    const validBenefits = benefits.filter((b) => b.trim() !== '');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Filter out empty benefits
    const validBenefits = benefits.filter((b) => b.trim() !== '');

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      amount: parseFloat(amount),
      benefits: validBenefits,
      display_order: parseInt(displayOrder) || 0,
      image_url: imageUrl.trim() || undefined,
      is_active: isActive,
    });
  };

  const addBenefit = () => {
    setBenefits([...benefits, '']);
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...benefits];
    newBenefits[index] = value;
    setBenefits(newBenefits);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del Nivel <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ej: Padrino Bronce, Padrino Plata, etc."
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="Descripción del nivel de padrinazgo..."
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monto (USD) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
            errors.amount ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="0.00"
        />
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
      </div>

      {/* Benefits */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Beneficios
        </label>
        <div className="space-y-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder={`Beneficio ${index + 1}`}
              />
              {benefits.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBenefit(index)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addBenefit}
            className="flex items-center gap-2 px-4 py-2 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-lg transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Agregar Beneficio
          </button>
        </div>
      </div>

      {/* Display Order */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Orden de Visualización
        </label>
        <input
          type="number"
          min="0"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="0"
        />
        <p className="mt-1 text-sm text-gray-500">
          Los niveles se ordenarán de menor a mayor. Menor número = aparece primero.
        </p>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL de Imagen (opcional)
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>

      {/* Is Active */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-5 h-5 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Nivel activo (visible en la página pública)
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isSubmitting ? 'Guardando...' : initialData?.id ? 'Actualizar Nivel' : 'Crear Nivel'}
        </button>
      </div>
    </form>
  );
}

