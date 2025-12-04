import { User, Mail, Phone, CreditCard } from 'lucide-react';

interface TutorStepProps {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
}

export function TutorStep({ data, updateData, onNext }: TutorStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Información del Tutor</h2>
        <p className="text-sm text-gray-500">
          Datos del padre, madre o acudiente responsable.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="tutorName" className="block text-sm font-medium text-gray-700">
              Nombre Completo
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="tutorName"
                required
                className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors touch-manipulation"
                placeholder="Juan Pérez"
                value={data.tutorName || ''}
                onChange={(e) => updateData({ tutorName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tutorCedula" className="block text-sm font-medium text-gray-700">
              Cédula / Pasaporte
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="tutorCedula"
                required
                className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors touch-manipulation"
                placeholder="8-888-8888"
                value={data.tutorCedula || ''}
                onChange={(e) => updateData({ tutorCedula: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tutorEmail" className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="tutorEmail"
                required
                className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors touch-manipulation"
                placeholder="juan@ejemplo.com"
                value={data.tutorEmail || ''}
                onChange={(e) => updateData({ tutorEmail: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tutorPhone" className="block text-sm font-medium text-gray-700">
              Teléfono / WhatsApp
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="tutorPhone"
                required
                className="focus:ring-primary focus:border-primary block w-full pl-10 text-base py-3.5 min-h-[48px] border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors touch-manipulation"
                placeholder="6000-0000"
                value={data.tutorPhone || ''}
                onChange={(e) => updateData({ tutorPhone: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 sm:py-3.5 min-h-[48px] rounded-lg font-bold text-base hover:bg-blue-700 hover:shadow-lg active:scale-95 hover:scale-105 transition-all duration-300 touch-manipulation w-full sm:w-auto"
        >
          Siguiente
        </button>
      </div>
    </form>
  );
}
