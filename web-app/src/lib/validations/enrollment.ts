import { z } from 'zod';

// Player schema
export const playerSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido').max(100),
  lastName: z.string().min(1, 'El apellido es requerido').max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']),
  cedula: z.string().optional(),
  category: z.string().optional(),
  cedulaFrontFile: z.string().optional(),
  cedulaBackFile: z.string().optional(),
});

// Enrollment form schema
export const enrollmentSchema = z.object({
  tutorName: z.string().min(2, 'El nombre del tutor es requerido').max(100),
  tutorCedula: z.string().min(7, 'La cédula del tutor es requerida').max(20),
  tutorEmail: z.string().email('Email inválido'),
  tutorPhone: z.string().min(8, 'Teléfono inválido').max(20),
  players: z.array(playerSchema).min(1, 'Debe agregar al menos un jugador'),
  cedulaTutorFile: z.string().optional(),
  paymentMethod: z.enum(['Yappy', 'Transferencia', 'Comprobante', 'Efectivo', 'Cheque', 'PagueloFacil']),
  paymentProofFile: z.string().optional(),
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;
export type PlayerFormData = z.infer<typeof playerSchema>;

