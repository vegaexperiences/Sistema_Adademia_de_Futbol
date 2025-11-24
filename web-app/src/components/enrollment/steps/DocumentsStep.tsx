import { Upload } from 'lucide-react';

interface DocumentsStepProps {
  data: any;
  updateData: (data: any) => void;
  updatePlayerFile: (index: number, field: string, fileName: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DocumentsStep({ data, updateData, updatePlayerFile, onNext, onBack }: DocumentsStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  // Mock upload handler for now
  const handleFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // In a real app, we would upload to Supabase Storage here
      // For now, we just store the file name to simulate
      updateData({ [field]: e.target.files[0].name });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Documentación</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Por favor adjunte los documentos requeridos.
        </p>

        <div className="space-y-8">
          {/* Tutor Documents */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Documentos del Tutor</h3>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800 cursor-pointer group">
              <Upload className="h-10 w-10 text-gray-400 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors mb-2" />
              <label htmlFor="cedulaTutor" className="cursor-pointer w-full text-center">
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                  Cédula del Tutor (Frente)
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  {data.cedulaTutorFile ? `Archivo: ${data.cedulaTutorFile}` : 'Click para subir o arrastrar archivo'}
                </span>
                <input
                  id="cedulaTutor"
                  name="cedulaTutor"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange('cedulaTutorFile')}
                  required={!data.cedulaTutorFile}
                />
              </label>
            </div>
          </div>

          {/* Players Documents */}
          {data.players.map((player: any, index: number) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Documentos de {player.firstName || `Jugador ${index + 1}`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Side */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800 cursor-pointer group">
                  <Upload className="h-10 w-10 text-gray-400 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors mb-2" />
                  <label htmlFor={`cedulaJugadorFront_${index}`} className="cursor-pointer w-full text-center">
                    <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                      Cédula del Jugador (Frente)
                    </span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      {player.cedulaFrontFile ? `Archivo: ${player.cedulaFrontFile}` : 'Click para subir'}
                    </span>
                    <input
                      id={`cedulaJugadorFront_${index}`}
                      name={`cedulaJugadorFront_${index}`}
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          updatePlayerFile(index, 'cedulaFrontFile', e.target.files[0].name);
                        }
                      }}
                      required={!player.cedulaFrontFile}
                    />
                  </label>
                </div>

                {/* Back Side */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800 cursor-pointer group">
                  <Upload className="h-10 w-10 text-gray-400 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors mb-2" />
                  <label htmlFor={`cedulaJugadorBack_${index}`} className="cursor-pointer w-full text-center">
                    <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                      Cédula del Jugador (Dorso)
                    </span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      {player.cedulaBackFile ? `Archivo: ${player.cedulaBackFile}` : 'Click para subir'}
                    </span>
                    <input
                      id={`cedulaJugadorBack_${index}`}
                      name={`cedulaJugadorBack_${index}`}
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          updatePlayerFile(index, 'cedulaBackFile', e.target.files[0].name);
                        }
                      }}
                      required={!player.cedulaBackFile}
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
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
