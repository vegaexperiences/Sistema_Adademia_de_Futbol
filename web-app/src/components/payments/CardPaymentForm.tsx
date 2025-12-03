'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import {
  detectCardType,
  formatCardNumber,
  validateCard,
  validateCardNumber,
  validateCVV,
  validateExpirationDate,
  type CardType,
} from '@/lib/utils/card-validation';

export interface CardPaymentFormData {
  cardNumber: string;
  cardholderName: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
}

interface CardPaymentFormProps {
  value?: CardPaymentFormData;
  onChange?: (data: CardPaymentFormData, isValid: boolean) => void;
  showSaveCardOption?: boolean;
  onSaveCardChange?: (save: boolean) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function CardPaymentForm({
  value,
  onChange,
  showSaveCardOption = false,
  onSaveCardChange,
  errors: externalErrors,
  disabled = false,
}: CardPaymentFormProps) {
  const [formData, setFormData] = useState<CardPaymentFormData>({
    cardNumber: value?.cardNumber || '',
    cardholderName: value?.cardholderName || '',
    cvv: value?.cvv || '',
    expiryMonth: value?.expiryMonth || '',
    expiryYear: value?.expiryYear || '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [saveCard, setSaveCard] = useState(false);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Update form data when value prop changes (only if different)
  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(formData)) {
      setFormData(value);
    }
  }, [value]);

  // Calculate card type from card number (memoized)
  const cardType = useMemo(() => detectCardType(formData.cardNumber), [formData.cardNumber]);

  // Validate and notify parent (memoized to prevent unnecessary recalculations)
  const validationResult = useMemo(() => {
    const validation = validateCard({
      cardNumber: formData.cardNumber,
      cvv: formData.cvv,
      expiryMonth: formData.expiryMonth,
      expiryYear: formData.expiryYear,
    });

    // Validate individual fields
    const newErrors: Record<string, string> = {};

    if (touched.cardNumber || formData.cardNumber) {
      const cardValidation = validateCardNumber(formData.cardNumber);
      if (!cardValidation.isValid) {
        newErrors.cardNumber = cardValidation.error || '';
      }
    }

    if (touched.cvv || formData.cvv) {
      const cvvValidation = validateCVV(formData.cvv, cardType);
      if (!cvvValidation.isValid) {
        newErrors.cvv = cvvValidation.error || '';
      }
    }

    if (touched.expiryMonth || touched.expiryYear || formData.expiryMonth || formData.expiryYear) {
      const expiryValidation = validateExpirationDate(formData.expiryMonth, formData.expiryYear);
      if (!expiryValidation.isValid) {
        newErrors.expiry = expiryValidation.error || '';
      }
    }

    if (!formData.cardholderName.trim() && (touched.cardholderName || formData.cardholderName)) {
      newErrors.cardholderName = 'El nombre del titular es requerido';
    }

    const isValid = validation.isValid && Object.keys(newErrors).length === 0 && formData.cardholderName.trim().length > 0;
    
    return { errors: newErrors, isValid };
  }, [formData, touched, cardType]);

  // Update errors state only when validation result changes
  useEffect(() => {
    setLocalErrors(validationResult.errors);
  }, [validationResult.errors]);

  // Notify parent only when validation result changes
  useEffect(() => {
    onChangeRef.current?.(formData, validationResult.isValid);
  }, [formData, validationResult.isValid]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    const formatted = formatCardNumber(rawValue);
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
    setTouched(prev => ({ ...prev, cardNumber: true }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData(prev => ({ ...prev, cvv: value }));
    setTouched(prev => ({ ...prev, cvv: true }));
  };

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    setFormData(prev => ({ ...prev, expiryMonth: value }));
    setTouched(prev => ({ ...prev, expiryMonth: true }));
  };

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    setFormData(prev => ({ ...prev, expiryYear: value }));
    setTouched(prev => ({ ...prev, expiryYear: true }));
  };

  const allErrors = { ...localErrors, ...externalErrors };

  const getCardIcon = () => {
    if (cardType === 'visa') {
      return (
        <div className="flex items-center gap-1">
          <div className="w-8 h-6 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-xs">
            VISA
          </div>
        </div>
      );
    }
    if (cardType === 'mastercard') {
      return (
        <div className="flex items-center gap-1">
          <div className="w-8 h-6 bg-red-600 text-white rounded flex items-center justify-center font-bold text-xs">
            MC
          </div>
        </div>
      );
    }
    return <CreditCard className="w-6 h-6 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Número de Tarjeta
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {getCardIcon()}
          </div>
          <input
            type="text"
            value={formData.cardNumber}
            onChange={handleCardNumberChange}
            onBlur={() => setTouched(prev => ({ ...prev, cardNumber: true }))}
            placeholder="1234 5678 9012 3456"
            maxLength={19} // 16 digits + 3 spaces
            disabled={disabled}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${
              allErrors.cardNumber
                ? 'border-red-300'
                : 'border-gray-200'
            } bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
          />
        </div>
        {allErrors.cardNumber && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {allErrors.cardNumber}
          </p>
        )}
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nombre del Titular
        </label>
        <input
          type="text"
          value={formData.cardholderName}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, cardholderName: e.target.value.toUpperCase() }));
            setTouched(prev => ({ ...prev, cardholderName: true }));
          }}
          onBlur={() => setTouched(prev => ({ ...prev, cardholderName: true }))}
          placeholder="NOMBRE COMO APARECE EN LA TARJETA"
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl border-2 ${
            allErrors.cardholderName
              ? 'border-red-300'
              : 'border-gray-200'
          } bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
        />
        {allErrors.cardholderName && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {allErrors.cardholderName}
          </p>
        )}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        {/* Expiry Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Fecha de Expiración
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.expiryMonth}
              onChange={handleExpiryMonthChange}
              onBlur={() => setTouched(prev => ({ ...prev, expiryMonth: true }))}
              placeholder="MM"
              maxLength={2}
              disabled={disabled}
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                allErrors.expiry
                  ? 'border-red-300'
                  : 'border-gray-200'
              } bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-center`}
            />
            <span className="self-center text-gray-400">/</span>
            <input
              type="text"
              value={formData.expiryYear}
              onChange={handleExpiryYearChange}
              onBlur={() => setTouched(prev => ({ ...prev, expiryYear: true }))}
              placeholder="YY"
              maxLength={2}
              disabled={disabled}
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                allErrors.expiry
                  ? 'border-red-300'
                  : 'border-gray-200'
              } bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-center`}
            />
          </div>
          {allErrors.expiry && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} />
              {allErrors.expiry}
            </p>
          )}
        </div>

        {/* CVV */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            CVV
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.cvv}
              onChange={handleCvvChange}
              onBlur={() => setTouched(prev => ({ ...prev, cvv: true }))}
              placeholder="123"
              maxLength={4}
              disabled={disabled}
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                allErrors.cvv
                  ? 'border-red-300'
                  : 'border-gray-200'
              } bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          {allErrors.cvv && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} />
              {allErrors.cvv}
            </p>
          )}
        </div>
      </div>

      {/* Save Card Option */}
      {showSaveCardOption && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <input
            type="checkbox"
            id="save-card"
            checked={saveCard}
            onChange={(e) => {
              setSaveCard(e.target.checked);
              onSaveCardChange?.(e.target.checked);
            }}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="save-card" className="text-sm text-gray-700 cursor-pointer">
            Guardar esta tarjeta para pagos futuros
          </label>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200">
        <Lock className="w-4 h-4 text-green-600" />
        <p className="text-xs text-gray-600">
          🔒 Pago seguro. Tus datos están protegidos y encriptados.
        </p>
      </div>
    </div>
  );
}

