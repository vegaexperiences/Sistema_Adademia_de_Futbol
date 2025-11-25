'use client';

import { Upload, Loader2, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';
import { uploadFile } from '@/lib/utils/file-upload';

interface DocumentsStepProps {
  data: any;
  updateData: (data: any) => void;
  updatePlayerFile: (index: number, field: string, fileUrl: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DocumentsStep({ data, updateData, updatePlayerFile, onNext, onBack }: DocumentsStepProps) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const handleFileChange = async (field: string, file: File) => {
    const uploadKey = field;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    setUploadErrors(prev => ({ ...prev, [uploadKey]: '' }));

    try {
      const path = field === 'cedulaTutorFile' 
        ? `tutors/${data.tutorCedula || 'tutor'}` 
        : `players/${field}`;
      
      const result = await uploadFile(file, path);

      if (result.error) {
        setUploadErrors(prev => ({ ...prev, [uploadKey]: result.error || 'Error al subir' }));
        setUploading(prev => ({ ...prev, [uploadKey]: false }));
        return;
      }

      if (result.url) {
        updateData({ [field]: result.url });
      }
    } catch (error: any) {
      setUploadErrors(prev => ({ ...prev, [uploadKey]: error.message || 'Error inesperado' }));
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handlePlayerFileChange = async (index: number, field: string, file: File) => {
    const uploadKey = `player-${index}-${field}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    setUploadErrors(prev => ({ ...prev, [uploadKey]: '' }));

    try {
      const player = data.players[index];
      const playerId = `${player.firstName}-${player.lastName}`.toLowerCase().replace(/\s+/g, '-') || `player-${index}`;
      const path = `players/${playerId}/${field}`;
      
      const result = await uploadFile(file, path);

      if (result.error) {
        setUploadErrors(prev => ({ ...prev, [uploadKey]: result.error || 'Error al subir' }));
        setUploading(prev => ({ ...prev, [uploadKey]: false }));
        return;
      }

      if (result.url) {
        updatePlayerFile(index, field, result.url);
      }
    } catch (error: any) {
      setUploadErrors(prev => ({ ...prev, [uploadKey]: error.message || 'Error inesperado' }));
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const removeFile = (field: string) => {
    updateData({ [field]: '' });
  };

  const removePlayerFile = (index: number, field: string) => {
    const newPlayers = [...data.players];
    newPlayers[index] = { ...newPlayers[index], [field]: '' };
    updateData({ players: newPlayers });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Documentación</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Por favor adjunte los documentos requeridos. Los archivos se subirán automáticamente.
        </p>

        <div className="space-y-8">
          {/* Tutor Documents */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Documentos del Tutor</h3>
            {data.cedulaTutorFile ? (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Documento subido correctamente
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile('cedulaTutorFile')}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800">
                {uploading['cedulaTutorFile'] ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subiendo archivo...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <label htmlFor="cedulaTutor" className="cursor-pointer w-full text-center">
                      <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                        Cédula del Tutor (Frente)
                      </span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        Click para subir o arrastrar archivo
                      </span>
                      <input
                        id="cedulaTutor"
                        name="cedulaTutor"
                        type="file"
                        className="sr-only"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange('cedulaTutorFile', e.target.files[0]);
                          }
                        }}
                        required={!data.cedulaTutorFile}
                      />
                    </label>
                  </>
                )}
                {uploadErrors['cedulaTutorFile'] && (
                  <p className="mt-2 text-sm text-red-500">{uploadErrors['cedulaTutorFile']}</p>
                )}
              </div>
            )}
          </div>

          {/* Players Documents */}
          {data.players.map((player: any, index: number) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Documentos de {player.firstName || `Jugador ${index + 1}`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Side */}
                <div>
                  {player.cedulaFrontFile ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                          Subido
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlayerFile(index, 'cedulaFrontFile')}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded text-gray-500 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800">
                      {uploading[`player-${index}-cedulaFrontFile`] ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">Subiendo...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <label htmlFor={`cedulaJugadorFront_${index}`} className="cursor-pointer w-full text-center">
                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                              Cédula (Frente)
                            </span>
                            <input
                              id={`cedulaJugadorFront_${index}`}
                              name={`cedulaJugadorFront_${index}`}
                              type="file"
                              className="sr-only"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handlePlayerFileChange(index, 'cedulaFrontFile', e.target.files[0]);
                                }
                              }}
                              required={!player.cedulaFrontFile}
                            />
                          </label>
                        </>
                      )}
                      {uploadErrors[`player-${index}-cedulaFrontFile`] && (
                        <p className="mt-1 text-xs text-red-500">{uploadErrors[`player-${index}-cedulaFrontFile`]}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Back Side */}
                <div>
                  {player.cedulaBackFile ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                          Subido
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlayerFile(index, 'cedulaBackFile')}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded text-gray-500 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800">
                      {uploading[`player-${index}-cedulaBackFile`] ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">Subiendo...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <label htmlFor={`cedulaJugadorBack_${index}`} className="cursor-pointer w-full text-center">
                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                              Cédula (Dorso)
                            </span>
                            <input
                              id={`cedulaJugadorBack_${index}`}
                              name={`cedulaJugadorBack_${index}`}
                              type="file"
                              className="sr-only"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handlePlayerFileChange(index, 'cedulaBackFile', e.target.files[0]);
                                }
                              }}
                              required={!player.cedulaBackFile}
                            />
                          </label>
                        </>
                      )}
                      {uploadErrors[`player-${index}-cedulaBackFile`] && (
                        <p className="mt-1 text-xs text-red-500">{uploadErrors[`player-${index}-cedulaBackFile`]}</p>
                      )}
                    </div>
                  )}
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
