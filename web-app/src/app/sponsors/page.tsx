import { getAllSponsors } from '@/lib/actions/sponsors';
import { SponsorLevelsGrid } from '@/components/sponsors/SponsorLevelsGrid';
import { Heart } from 'lucide-react';

export default async function SponsorsPage() {
  const result = await getAllSponsors();

  if (result.error) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600">Error al cargar los niveles de padrinazgo: {result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white border-2 border-gray-200 rounded-full mb-6 shadow-sm">
            <Heart className="h-10 w-10 text-gray-700" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Sé Padrino de Suarez Academy
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Apoya el crecimiento de nuestros jugadores y forma parte de nuestra familia futbolística.
            Elige el nivel de padrinazgo que mejor se adapte a ti.
          </p>
        </div>

        {/* Sponsor Levels Grid */}
        <SponsorLevelsGrid sponsors={result.data || []} />
      </div>
    </div>
  );
}

