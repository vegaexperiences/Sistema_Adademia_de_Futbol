import { getPublicSystemConfig } from '@/lib/actions/config';
import { OpenSponsorDonationForm } from '@/components/sponsors/OpenSponsorDonationForm';
import { Heart } from 'lucide-react';

export default async function SponsorsPage() {
  const config = await getPublicSystemConfig();

  return (
    <div className="min-h-screen py-12 bg-white transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Tu contribución, sin importar el monto, hace una diferencia significativa en el desarrollo
            de nuestros talentos. Cada donación nos ayuda a seguir creciendo y mejorando.
          </p>
        </div>

        {/* Open Donation Form */}
        <div className="glass-card overflow-visible p-0">
          <OpenSponsorDonationForm config={config} />
        </div>
      </div>
    </div>
  );
}

