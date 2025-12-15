'use client';

import { useState } from 'react';
import { User, Mail, Phone, CreditCard, Building } from 'lucide-react';

interface SponsorInfoStepProps {
  data: {
    sponsor_name: string;
    sponsor_email: string;
    sponsor_phone: string;
    sponsor_cedula: string;
    sponsor_company: string;
  };
  updateData: (data: any) => void;
  errors?: Record<string, string>;
}

export function SponsorInfoStep({ data, updateData, errors = {} }: SponsorInfoStepProps) {
  const handleChange = (field: string, value: string) => {
    updateData({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Información del Padrino</h2>
        <p className="text-sm text-gray-500">
          Completa tus datos para procesar tu padrinazgo.
        </p>
      </div>

      <div className="space-y-4">
        {/* Nombre Completo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={data.sponsor_name}
              onChange={(e) => handleChange('sponsor_name', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                errors.sponsor_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Juan Pérez"
              required
            />
          </div>
          {errors.sponsor_name && (
            <p className="mt-1 text-sm text-red-600">{errors.sponsor_name}</p>
          )}
        </div>

        {/* Cédula */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={data.sponsor_cedula}
              onChange={(e) => handleChange('sponsor_cedula', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                errors.sponsor_cedula ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="8-1234-5678"
            />
          </div>
          {errors.sponsor_cedula && (
            <p className="mt-1 text-sm text-red-600">{errors.sponsor_cedula}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="email"
              value={data.sponsor_email}
              onChange={(e) => handleChange('sponsor_email', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                errors.sponsor_email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="juan@ejemplo.com"
            />
          </div>
          {errors.sponsor_email && (
            <p className="mt-1 text-sm text-red-600">{errors.sponsor_email}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="tel"
              value={data.sponsor_phone}
              onChange={(e) => handleChange('sponsor_phone', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                errors.sponsor_phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+507 6123-4567"
            />
          </div>
          {errors.sponsor_phone && (
            <p className="mt-1 text-sm text-red-600">{errors.sponsor_phone}</p>
          )}
        </div>

        {/* Empresa (Opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Empresa <span className="text-gray-400 text-xs">(Opcional)</span>
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={data.sponsor_company}
              onChange={(e) => handleChange('sponsor_company', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Nombre de la empresa"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

