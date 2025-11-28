/**
 * Credit Card Validation Utilities
 * Detects card type, validates card numbers using Luhn algorithm, and formats card input
 */

export type CardType = 'visa' | 'mastercard' | 'unknown';

export interface CardValidationResult {
  isValid: boolean;
  cardType: CardType;
  errors: string[];
}

/**
 * Detect card type based on card number
 */
export function detectCardType(cardNumber: string): CardType {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!cleaned) return 'unknown';
  
  // Visa: starts with 4, 13 or 16 digits
  if (/^4/.test(cleaned)) {
    return 'visa';
  }
  
  // Mastercard: starts with 5, 16 digits, or 2 with range 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
    return 'mastercard';
  }
  
  return 'unknown';
}

/**
 * Luhn algorithm for card number validation
 */
export function luhnCheck(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!cleaned || cleaned.length < 13) return false;
  
  let sum = 0;
  let isEven = false;
  
  // Process from right to left
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate card number
 */
export function validateCardNumber(cardNumber: string): { isValid: boolean; error?: string } {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'El número de tarjeta es requerido' };
  }
  
  // Check for non-numeric characters
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'El número de tarjeta solo puede contener dígitos' };
  }
  
  // Check length
  const cardType = detectCardType(cleaned);
  if (cardType === 'visa' && cleaned.length !== 13 && cleaned.length !== 16) {
    return { isValid: false, error: 'Visa requiere 13 o 16 dígitos' };
  }
  
  if (cardType === 'mastercard' && cleaned.length !== 16) {
    return { isValid: false, error: 'Mastercard requiere 16 dígitos' };
  }
  
  if (cardType === 'unknown' && cleaned.length < 13) {
    return { isValid: false, error: 'El número de tarjeta es inválido' };
  }
  
  // Luhn check
  if (!luhnCheck(cleaned)) {
    return { isValid: false, error: 'El número de tarjeta no es válido' };
  }
  
  return { isValid: true };
}

/**
 * Format card number with spaces (4-4-4-4 pattern)
 */
export function formatCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(' ');
}

/**
 * Validate CVV
 */
export function validateCVV(cvv: string, cardType: CardType): { isValid: boolean; error?: string } {
  if (!cvv) {
    return { isValid: false, error: 'El CVV es requerido' };
  }
  
  if (!/^\d+$/.test(cvv)) {
    return { isValid: false, error: 'El CVV solo puede contener dígitos' };
  }
  
  // Visa and Mastercard typically have 3 digits, but some can have 4
  if (cvv.length < 3 || cvv.length > 4) {
    return { isValid: false, error: 'El CVV debe tener 3 o 4 dígitos' };
  }
  
  return { isValid: true };
}

/**
 * Validate expiration date
 */
export function validateExpirationDate(month: string, year: string): { isValid: boolean; error?: string } {
  if (!month || !year) {
    return { isValid: false, error: 'La fecha de expiración es requerida' };
  }
  
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return { isValid: false, error: 'El mes debe ser entre 01 y 12' };
  }
  
  if (isNaN(yearNum) || yearNum < 0 || yearNum > 99) {
    return { isValid: false, error: 'El año debe ser válido' };
  }
  
  // Check if expired
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  // Convert 2-digit year to 4-digit
  const fullYear = yearNum < currentYear ? 2000 + yearNum : 2000 + yearNum;
  
  if (fullYear < now.getFullYear() || (fullYear === now.getFullYear() && monthNum < currentMonth)) {
    return { isValid: false, error: 'La tarjeta ha expirado' };
  }
  
  return { isValid: true };
}

/**
 * Complete card validation
 */
export function validateCard(cardData: {
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
}): CardValidationResult {
  const errors: string[] = [];
  
  const cardType = detectCardType(cardData.cardNumber);
  
  if (cardType === 'unknown') {
    errors.push('Solo se aceptan tarjetas Visa o Mastercard');
  }
  
  const cardNumberValidation = validateCardNumber(cardData.cardNumber);
  if (!cardNumberValidation.isValid) {
    errors.push(cardNumberValidation.error || 'Número de tarjeta inválido');
  }
  
  const cvvValidation = validateCVV(cardData.cvv, cardType);
  if (!cvvValidation.isValid) {
    errors.push(cvvValidation.error || 'CVV inválido');
  }
  
  const expiryValidation = validateExpirationDate(cardData.expiryMonth, cardData.expiryYear);
  if (!expiryValidation.isValid) {
    errors.push(expiryValidation.error || 'Fecha de expiración inválida');
  }
  
  return {
    isValid: errors.length === 0,
    cardType,
    errors,
  };
}

/**
 * Mask card number (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.length <= 4) return cleaned;
  return '**** **** **** ' + cleaned.slice(-4);
}

