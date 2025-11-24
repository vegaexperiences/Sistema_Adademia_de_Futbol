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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Información del Jugador</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingrese los datos de los jugadores a matricular.
            </p>
          </div>
          <button
            type="button"
            onClick={addPlayer}
            className="flex items-center gap-2 text-sm font-medium text-primary dark:text-blue-400 hover:text-primary/80 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Agregar Otro Jugador
          </button>
        </div>

        {data.players.map((player: any, index: number) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 relative transition-colors">
            {data.players.length > 1 && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jugador {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Eliminar jugador"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 bg-gray-50 dark:bg-gray-800 transition-colors"
                    value={player.firstName || ''}
                    onChange={(e) => updatePlayer(index, { firstName: e.target.value })}
                    placeholder="Ej. Miguel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Apellidos
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 bg-gray-50 dark:bg-gray-800 transition-colors"
                    value={player.lastName || ''}
                    onChange={(e) => updatePlayer(index, { lastName: e.target.value })}
                    placeholder="Ej. González"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Nacimiento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 bg-gray-50 dark:bg-gray-800 transition-colors"
                    value={player.birthDate || ''}
                    onChange={(e) => updatePlayer(index, { birthDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Género
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    required
                    className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 transition-colors appearance-none"
                    value={player.gender || ''}
                    onChange={(e) => updatePlayer(index, { gender: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          Atrás
        </button>
        <button
          type="submit"
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary/90 hover:shadow-lg hover:scale-105 transition-all duration-300"
        >
          Siguiente
        </button>
      </div>
    </form>
  );
}
