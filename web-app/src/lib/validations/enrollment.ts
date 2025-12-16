import { z } from 'zod';

// Player schema
export const playerSchema = z.object({
  firstName: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .refine((val) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(val.trim()), {
      message: 'El nombre solo puede contener letras y espacios'
    })
    .transform((val) => val.trim()),
  lastName: z.string()
    .min(1, 'El apellido es requerido')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .refine((val) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(val.trim()), {
      message: 'El apellido solo puede contener letras y espacios'
    })
    .transform((val) => val.trim()),
  birthDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida. Use el formato YYYY-MM-DD')
    .refine((date) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      const maxAge = new Date();
      maxAge.setFullYear(today.getFullYear() - 100);
      maxAge.setHours(0, 0, 0, 0);
      return d <= today && d >= maxAge;
    }, {
      message: 'La fecha de nacimiento debe ser válida, no puede ser futura ni mayor a 100 años'
    }),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']),
  cedula: z.string()
    .optional()
    .refine((val) => !val || val.trim().length >= 7, {
      message: 'La cédula debe tener al menos 7 caracteres'
    })
    .refine((val) => !val || /^[\d-]+$/.test(val.trim()), {
      message: 'La cédula solo puede contener números y guiones'
    })
    .refine((val) => {
      if (!val) return true;
      const digitsOnly = val.replace(/-/g, '').trim();
      return digitsOnly.length >= 7;
    }, {
      message: 'La cédula debe tener al menos 7 dígitos'
    })
    .transform((val) => val ? val.trim() : val),
  category: z.string().optional(),
  cedulaFrontFile: z.string().optional(),
  cedulaBackFile: z.string().optional(),
});

// Enrollment form schema
export const enrollmentSchema = z.object({
  tutorName: z.string()
    .min(2, 'El nombre del tutor es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .refine((val) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(val.trim()), {
      message: 'El nombre solo puede contener letras y espacios'
    })
    .transform((val) => val.trim()),
  tutorCedula: z.string()
    .min(5, 'El documento de identidad debe tener al menos 5 caracteres')
    .max(30, 'El documento de identidad no puede exceder 30 caracteres')
    .refine((val) => {
      // Aceptar letras, números, guiones y espacios
      // Permitir formatos como: 8-888-8888, ABC123456, 123456789, etc.
      const cleaned = val.trim();
      return /^[A-Za-z0-9\s\-]+$/.test(cleaned) && cleaned.length >= 5;
    }, {
      message: 'El documento puede contener letras, números, guiones y espacios (mínimo 5 caracteres)'
    })
    .transform((val) => val.trim()),
  tutorEmail: z.string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .transform((val) => val.trim().toLowerCase()),
  tutorPhone: z.string()
    .min(7, 'El teléfono debe tener al menos 7 dígitos')
    .max(15, 'El teléfono no puede exceder 15 dígitos')
    .refine((val) => {
      const cleaned = val.replace(/[\s\-\(\)\.]/g, '');
      return /^\d+$/.test(cleaned) && cleaned.length >= 7;
    }, {
      message: 'El teléfono solo puede contener números (mínimo 7 dígitos)'
    })
    .transform((val) => val.replace(/[\s\-\(\)\.]/g, '')),
  players: z.array(playerSchema).min(1, 'Debe agregar al menos un jugador'),
  cedulaTutorFile: z.string().optional(),
  paymentMethod: z.enum(['Yappy', 'Transferencia', 'Comprobante', 'Efectivo', 'Cheque', 'PagueloFacil']),
  paymentProofFile: z.string().optional(),
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;
export type PlayerFormData = z.infer<typeof playerSchema>;

