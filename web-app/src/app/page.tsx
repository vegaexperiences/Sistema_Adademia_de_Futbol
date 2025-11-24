import Link from "next/link";
import { ArrowRight, Trophy, Users, Calendar } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Formando el Futuro del <span className="text-accent">Fútbol</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mb-10">
            Únete a Suarez Academy, donde desarrollamos talento, disciplina y pasión por el deporte rey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/enrollment"
              className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-blue-900 font-extrabold text-lg py-4 px-10 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:shadow-[0_0_50px_rgba(234,179,8,0.8)] hover:scale-110 transition-all duration-300 flex items-center justify-center gap-3 border-2 border-yellow-300"
            >
              MATRICÚLATE AHORA <ArrowRight size={24} strokeWidth={3} />
            </Link>
            <Link
              href="/tournaments"
              className="bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold py-3 px-8 rounded-full hover:bg-white/20 transition-all"
            >
              Ver Torneos
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">¿Por qué elegirnos?</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Ofrecemos una formación integral que va más allá del campo de juego.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="glass-card p-8 hover:shadow-lg transition-all hover:scale-105">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-primary mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Entrenadores Expertos</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Nuestro cuerpo técnico cuenta con amplia experiencia en formación de jugadores jóvenes.
              </p>
            </div>

            <div className="glass-card p-8 hover:shadow-lg transition-all hover:scale-105">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6">
                <Trophy size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Torneos Competitivos</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Participamos en las mejores ligas y torneos para poner a prueba lo aprendido.
              </p>
            </div>

            <div className="glass-card p-8 hover:shadow-lg transition-all hover:scale-105">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-6">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Horarios Flexibles</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Entrenamientos diseñados para no interferir con las actividades escolares.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
