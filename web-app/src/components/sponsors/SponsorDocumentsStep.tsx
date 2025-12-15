'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';
import { uploadFile } from '@/lib/utils/file-upload';

interface SponsorDocumentsStepProps {
  data: {
    cedulaFrontFile: string;
    cedulaBackFile: string;
  };
  updateData: (data: any) => void;
}

export function SponsorDocumentsStep({ data, updateData }: SponsorDocumentsStepProps) {
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'cedulaFrontFile' | 'cedulaBackFile',
    setUploading: (value: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const path = `sponsors/documents/${field}`;
      const result = await uploadFile(file, path);

      if (result.error) {
        setUploadError(result.error);
        setUploading(false);
        return;
      }

      if (result.url) {
        updateData({ [field]: result.url });
      }
    } catch (error: any) {
      setUploadError(error.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (field: 'cedulaFrontFile' | 'cedulaBackFile', inputRef: React.RefObject<HTMLInputElement | null>) => {
    updateData({ [field]: '' });
    setUploadError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Documentos (Opcional)</h2>
        <p className="text-sm text-gray-500">
          Puedes subir documentos de identificación si lo deseas. Este paso es opcional.
        </p>
      </div>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{uploadError}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Cédula Frente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula - Frente
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-pink-400 transition-colors">
            {!data.cedulaFrontFile ? (
              <div className="text-center">
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, 'cedulaFrontFile', setUploadingFront)}
                  className="hidden"
                  id="cedula-front"
                />
                <label
                  htmlFor="cedula-front"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {uploadingFront ? (
                    <Loader2 className="h-8 w-8 text-pink-500 animate-spin mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  )}
                  <span className="text-sm text-gray-600">
                    {uploadingFront ? 'Subiendo...' : 'Haz clic para subir o arrastra aquí'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, PDF hasta 5MB</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Archivo subido</span>
                </div>
                <button
                  onClick={() => removeFile('cedulaFrontFile', frontInputRef)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cédula Reverso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula - Reverso
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-pink-400 transition-colors">
            {!data.cedulaBackFile ? (
              <div className="text-center">
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, 'cedulaBackFile', setUploadingBack)}
                  className="hidden"
                  id="cedula-back"
                />
                <label
                  htmlFor="cedula-back"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {uploadingBack ? (
                    <Loader2 className="h-8 w-8 text-pink-500 animate-spin mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  )}
                  <span className="text-sm text-gray-600">
                    {uploadingBack ? 'Subiendo...' : 'Haz clic para subir o arrastra aquí'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, PDF hasta 5MB</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Archivo subido</span>
                </div>
                <button
                  onClick={() => removeFile('cedulaBackFile', backInputRef)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> La subida de documentos es opcional. Puedes continuar sin subir documentos.
        </p>
      </div>
    </div>
  );
}

