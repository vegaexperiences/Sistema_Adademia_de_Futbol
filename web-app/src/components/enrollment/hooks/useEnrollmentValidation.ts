import { useState, useCallback } from 'react';
import { enrollmentSchema, playerSchema } from '@/lib/validations/enrollment';
import { z } from 'zod';

export type ValidationErrors = {
  [key: string]: string | string[] | ValidationErrors;
};

export function useEnrollmentValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateStep = useCallback((step: number, formData: any): boolean => {
    const newErrors: ValidationErrors = {};

    try {
      switch (step) {
        case 0: // Tutor step
          // Validate tutor fields using partial schema
          const tutorPartialSchema = enrollmentSchema.pick({
            tutorName: true,
            tutorCedula: true,
            tutorEmail: true,
            tutorPhone: true,
          }).extend({
            players: z.array(z.any()).min(0),
            paymentMethod: z.enum(['Yappy', 'Transferencia', 'Comprobante', 'Efectivo', 'Cheque', 'PagueloFacil']),
          });
          
          const tutorData = {
            tutorName: formData.tutorName || '',
            tutorCedula: formData.tutorCedula || '',
            tutorEmail: formData.tutorEmail || '',
            tutorPhone: formData.tutorPhone || '',
            players: [],
            paymentMethod: 'PagueloFacil' as const,
          };
          
          const tutorResult = tutorPartialSchema.safeParse(tutorData);
          if (!tutorResult.success) {
            tutorResult.error.errors.forEach((error) => {
              const path = error.path.join('.');
              newErrors[path] = error.message;
            });
          }
          break;

        case 1: // Player step
          if (!formData.players || formData.players.length === 0) {
            newErrors.players = 'Debe agregar al menos un jugador';
          } else {
            formData.players.forEach((player: any, index: number) => {
              const playerResult = playerSchema.safeParse(player);
              if (!playerResult.success) {
                playerResult.error.errors.forEach((error) => {
                  const path = `players.${index}.${error.path.join('.')}`;
                  newErrors[path] = error.message;
                });
              }
            });
          }
          break;

        case 2: // Documents step - no validation needed
          break;

        case 3: // Payment step
          const paymentResult = enrollmentSchema.pick({
            paymentMethod: true,
          }).safeParse(formData);
          
          if (!paymentResult.success) {
            paymentResult.error.errors.forEach((error) => {
              const path = error.path.join('.');
              newErrors[path] = error.message;
            });
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }, []);

  const validateFullForm = useCallback((formData: any): boolean => {
    try {
      const result = enrollmentSchema.safeParse(formData);
      if (!result.success) {
        const newErrors: ValidationErrors = {};
        result.error.errors.forEach((error) => {
          const path = error.path.join('.');
          if (error.path.length > 1) {
            // Nested path like players.0.firstName
            const parts = path.split('.');
            let current: any = newErrors;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) {
                current[parts[i]] = {};
              }
              current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = error.message;
          } else {
            newErrors[path] = error.message;
          }
        });
        setErrors(newErrors);
        return false;
      }
      setErrors({});
      return true;
    } catch (error) {
      console.error('Full form validation error:', error);
      return false;
    }
  }, []);

  const getFieldError = useCallback((fieldPath: string): string | undefined => {
    const parts = fieldPath.split('.');
    let current: any = errors;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Check if current is an object and has the part
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
      
      // If we've reached the last part and it's a string, return it
      if (i === parts.length - 1 && typeof current === 'string') {
        return current;
      }
    }
    
    return undefined;
  }, [errors]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateStep,
    validateFullForm,
    getFieldError,
    clearErrors,
  };
}

