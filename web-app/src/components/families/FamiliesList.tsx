'use client';

import { useState } from 'react';
import { Users, Search, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';

interface Family {
  id: string;
  tutor_name: string;
  tutor_email: string;
  tutor_phone: string;
  tutor_cedula: string | null;
  players?: any[];
}

export default function FamiliesList({ families }: { families: Family[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter families based on search
  const filteredFamilies = families?.filter(family => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      family.tutor_name?.toLowerCase().includes(search) ||
      family.tutor_email?.toLowerCase().includes(search) ||
      family.tutor_phone?.toLowerCase().includes(search) ||
      family.tutor_cedula?.toLowerCase().includes(search)
    );
  }) || [];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="p-2 sm:p-3 rounded-xl icon-bg-orange">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            👨‍👩‍👧‍👦 Familias
          </h1>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          Familias con múltiples jugadores
        </p>
      </div>

      {/* Stats */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl icon-bg-purple">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-gray-600">Total Familias</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{families?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 sm:p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, email, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 min-h-[48px] rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all touch-manipulation text-base"
          />
        </div>
        {searchTerm && (
          <p className="mt-3 text-sm text-gray-600">
            Mostrando {filteredFamilies.length} de {families.length} familias
          </p>
        )}
      </div>

      {/* Families Grid */}
      <div className="grid gap-6">
        {filteredFamilies && filteredFamilies.length > 0 ? (
          filteredFamilies.map((family) => (
            <Link 
              key={family.id} 
              href={`/dashboard/families/${family.id}`}
              className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] animate-slide-up cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl icon-bg-orange">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Familia {family.tutor_name}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-semibold text-gray-600">Email</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{family.tutor_email}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="h-4 w-4 text-green-600" />
                        <p className="text-xs font-semibold text-gray-600">Teléfono</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{family.tutor_phone}</p>
                    </div>
                  </div>

                  {family.players && family.players.length > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-500">
                      <p className="text-xs font-semibold text-gray-600 mb-2">⚽ Jugadores ({family.players.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {family.players.map((player: any) => (
                          <span key={player.id} className="px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-900">
                            {player.first_name} {player.last_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron familias' : 'No hay familias'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Aún no hay familias con múltiples jugadores.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
