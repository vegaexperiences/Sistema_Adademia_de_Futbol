'use client';

import { useState } from 'react';
import { registerTeam } from '@/lib/actions/tournaments';
import { Trophy, User, Mail, Phone, Users, Send, CheckCircle } from 'lucide-react';

interface TournamentRegistrationProps {
  tournament: {
    id: string;
    name: string;
    categories: string[];
  };
}

export default function TournamentRegistration({ tournament }: TournamentRegistrationProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    team_name: '',
    coach_name: '',
    coach_email: '',
    coach_phone: '',
    coach_cedula: '',
    category: tournament.categories[0] || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerTeam({
        tournament_id: tournament.id,
        ...formData
      });
      setSuccess(true);
    } catch (error) {
      alert('Error al registrar el equipo. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card p-8 text-center animate-scale-in max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          ¡Registro Exitoso!
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Hemos recibido la inscripción de tu equipo <strong>{formData.team_name}</strong>.
          <br />
          Te contactaremos pronto al correo <strong>{formData.coach_email}</strong> para confirmar los detalles.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setFormData({
              team_name: '',
              coach_name: '',
              coach_email: '',
              coach_phone: '',
              coach_cedula: '',
              category: tournament.categories[0] || ''
            });
          }}
          className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:scale-105 transition-all"
        >
          Registrar otro equipo
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Inscripción al Torneo
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Completa el formulario para inscribir a tu equipo en <strong>{tournament.name}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Nombre del Equipo
          </label>
          <div className="relative">
            <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              required
              value={formData.team_name}
              onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
              placeholder="Ej: Los Leones FC"
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Coach Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Nombre del Entrenador/Representante
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                value={formData.coach_name}
                onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })}
                placeholder="Nombre completo"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Cédula del Entrenador/Representante
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                value={formData.coach_cedula}
                onChange={(e) => setFormData({ ...formData, coach_cedula: e.target.value })}
                placeholder="Ej. 8-123-456"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Teléfono de Contacto
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                required
                value={formData.coach_phone}
                onChange={(e) => setFormData({ ...formData, coach_phone: e.target.value })}
                placeholder="+507 6000-0000"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={formData.coach_email}
                onChange={(e) => setFormData({ ...formData, coach_email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Categoría
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
              >
                <option value="" disabled>Selecciona una categoría</option>
                {tournament.categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          <Send size={20} />
          {loading ? 'Enviando...' : 'Enviar Inscripción'}
        </button>
      </form>
    </div>
  );
}
