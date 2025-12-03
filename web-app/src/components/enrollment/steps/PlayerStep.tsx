import { User, Calendar, Users, Plus, Trash2 } from 'lucide-react';

interface PlayerStepProps {
  data: any;
  updatePlayer: (index: number, data: any) => void;
  addPlayer: () => void;
  removePlayer: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PlayerStep({ data, updatePlayer, addPlayer, removePlayer, onNext, onBack }: PlayerStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Información del Jugador</h2>
            <p className="text-sm text-gray-500">
              Ingrese los datos de los jugadores a matricular.
            </p>
          </div>
          <button
            type="button"
            onClick={addPlayer}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 bg-blue-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Agregar Otro Jugador
          </button>
        </div>

        {data.players.map((player: any, index: number) => (
          <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-200 relative transition-colors">
            {data.players.length > 1 && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jugador {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                  title="Eliminar jugador"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors touch-manipulation"
                    value={player.firstName || ''}
                    onChange={(e) => updatePlayer(index, { firstName: e.target.value })}
                    placeholder="Ej. Miguel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellidos
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors touch-manipulation"
                    value={player.lastName || ''}
                    onChange={(e) => updatePlayer(index, { lastName: e.target.value })}
                    placeholder="Ej. González"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors relative z-20 touch-manipulation"
                    value={player.birthDate || ''}
                    onChange={(e) => updatePlayer(index, { birthDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Género
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 bg-gray-50 transition-colors appearance-none touch-manipulation"
                    value={player.gender || ''}
                    onChange={(e) => updatePlayer(index, { gender: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cédula
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors touch-manipulation"
                    value={player.cedula || ''}
                    onChange={(e) => updatePlayer(index, { cedula: e.target.value })}
                    placeholder="Ej. 8-123-456"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-white text-gray-700 border border-gray-300 px-6 py-3 sm:py-3.5 min-h-[48px] rounded-lg active:bg-gray-50 hover:bg-gray-50 transition-colors font-medium text-base touch-manipulation w-full sm:w-auto"
        >
          Atrás
        </button>
        <button
          type="submit"
          className="bg-primary text-white px-6 py-3 sm:py-3.5 min-h-[48px] rounded-lg font-bold text-base hover:bg-primary/90 hover:shadow-lg active:scale-95 hover:scale-105 transition-all duration-300 touch-manipulation w-full sm:w-auto"
        >
          Siguiente
        </button>
      </div>
    </form>
  );
}
