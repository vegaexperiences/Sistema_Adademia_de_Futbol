'use client';

import { useState } from 'react';
import { User, Mail, Phone, Search, Users } from 'lucide-react';
import Link from 'next/link';

interface Tutor {
  name: string | null;
  email: string | null;
  secondary_email?: string | null;
  phone: string | null;
  cedula: string | null;
  cedula_url?: string | null;
  playerCount?: number;
  type?: 'Family' | 'Individual';
}

export default function TutorsList({ tutors }: { tutors: Tutor[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter tutors based on search
  const filteredTutors = tutors?.filter(tutor => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tutor.name?.toLowerCase().includes(search) ||
      tutor.email?.toLowerCase().includes(search) ||
      tutor.phone?.toLowerCase().includes(search) ||
      tutor.cedula?.toLowerCase().includes(search)
    );
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}>
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            👨‍👩‍👧‍👦 Tutores
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Información de contacto de los tutores
        </p>
      </div>

      {/* Stats */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-xl" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}>
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Tutores</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{tutors.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, email, teléfono, cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        {searchTerm && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Mostrando {filteredTutors.length} de {tutors.length} tutores
          </p>
        )}
      </div>

      {/* Tutors Grid */}
      <div className="grid gap-6">
        {filteredTutors.length > 0 ? (
          filteredTutors.map((tutor, index) => {
            // Use cedula as identifier, fallback to email or name
            const identifier = tutor.cedula || tutor.email || tutor.name || `tutor-${index}`;
            return (
            <Link
              key={identifier}
              href={`/dashboard/tutors/${encodeURIComponent(identifier)}`}
              className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] animate-slide-up cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl" style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}>
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {tutor.name || 'Sin nombre'}
                    </h3>
                    {tutor.playerCount && tutor.playerCount > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                        color: '#1e3a8a'
                      }}>
                        ⚽ {tutor.playerCount} {tutor.playerCount === 1 ? 'jugador' : 'jugadores'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Email</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{tutor.email || 'Sin email'}</p>
                      {tutor.secondary_email && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          📧 Secundario: {tutor.secondary_email}
                        </p>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Teléfono</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{tutor.phone || 'Sin teléfono'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-l-4 border-purple-500">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🆔 Cédula</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{tutor.cedula || 'Sin cédula'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            );
          })
        ) : (
          <div className="glass-card p-12 text-center">
            <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron tutores' : 'No hay tutores'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Aún no hay tutores registrados.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
