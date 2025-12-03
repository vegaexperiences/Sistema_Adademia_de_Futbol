import { getActiveTournament } from '@/lib/actions/tournaments';
import TournamentRegistration from '@/components/tournaments/TournamentRegistration';
import { Trophy, Calendar, MapPin, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
  const activeTournament = await getActiveTournament();

  if (!activeTournament) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="p-6 rounded-full bg-gray-100 mb-6">
          <Trophy className="h-16 w-16 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          No hay torneos activos
        </h1>
        <p className="text-lg text-gray-600 max-w-md">
          Actualmente no tenemos torneos en curso o inscripciones abiertas. 
          ¡Vuelve pronto para más novedades!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-bold text-sm mb-4 animate-scale-in">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          TORNEO ACTIVO
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          {activeTournament.name}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {activeTournament.description}
        </p>

        <div className="flex flex-wrap justify-center gap-6 text-gray-600">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
            <Calendar className="text-blue-500" />
            <span className="font-medium">
              {new Date(activeTournament.start_date).toLocaleDateString()} - {new Date(activeTournament.end_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
            <MapPin className="text-red-500" />
            <span className="font-medium">{activeTournament.location}</span>
          </div>
        </div>
      </div>

      {/* Registration Section */}
      {activeTournament.registration_open ? (
        <div className="max-w-4xl mx-auto">
          <TournamentRegistration tournament={activeTournament} />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto text-center p-8 glass-card border-l-4 border-yellow-500">
          <Info className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Inscripciones Cerradas
          </h3>
          <p className="text-gray-600">
            Las inscripciones para este torneo no están disponibles en este momento.
            Contacta a la administración para más información.
          </p>
        </div>
      )}
    </div>
  );
}
