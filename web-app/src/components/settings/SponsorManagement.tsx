'use client';

import { useState } from 'react';
import { Heart, Users } from 'lucide-react';
import { SponsorLevelsManagement } from './SponsorLevelsManagement';
import { SponsorRegistrationsManagement } from './SponsorRegistrationsManagement';

export function SponsorManagement() {
  const [activeTab, setActiveTab] = useState<'levels' | 'registrations'>('levels');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('levels')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'levels'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Niveles de Padrinazgo
          </div>
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'registrations'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registros de Padrinos
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'levels' ? (
        <SponsorLevelsManagement />
      ) : (
        <SponsorRegistrationsManagement />
      )}
    </div>
  );
}

