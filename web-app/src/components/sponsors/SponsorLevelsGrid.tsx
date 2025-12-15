'use client';

import { Sponsor } from '@/lib/actions/sponsors';
import { SponsorCard } from './SponsorCard';

interface SponsorLevelsGridProps {
  sponsors: Sponsor[];
}

export function SponsorLevelsGrid({ sponsors }: SponsorLevelsGridProps) {
  if (!sponsors || sponsors.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 p-8">
        <p className="text-gray-600 text-lg">
          No hay niveles de padrinazgo disponibles en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {sponsors.map((sponsor) => (
        <SponsorCard key={sponsor.id} sponsor={sponsor} />
      ))}
    </div>
  );
}

