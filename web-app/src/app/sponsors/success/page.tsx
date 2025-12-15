import Link from 'next/link';
import { CheckCircle2, Heart } from 'lucide-react';

export default function SponsorSuccessPage() {
  return (
    <div className="min-h-screen py-12 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          ¡Padrinazgo Registrado Exitosamente!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Gracias por tu apoyo. Tu padrinazgo ha sido registrado y será procesado pronto.
          Recibirás una confirmación por correo electrónico.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sponsors"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all font-semibold"
          >
            <Heart className="h-5 w-5" />
            Ver Otros Niveles
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

