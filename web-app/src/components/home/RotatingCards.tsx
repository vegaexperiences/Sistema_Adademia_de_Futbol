'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Trophy, Users, Calendar, Heart, GraduationCap } from 'lucide-react';

interface CardData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  bgColor: string;
  textColor: string;
}

const cards: CardData[] = [
  {
    id: 'enrollment',
    title: 'Matrícula',
    description: 'Inscribe a tu hijo/a en Suarez Academy y forma parte de nuestra familia futbolística.',
    icon: <GraduationCap size={32} />,
    href: '/enrollment',
    gradient: 'from-yellow-400 via-yellow-500 to-orange-500',
    bgColor: 'bg-gradient-to-br from-yellow-50 to-orange-50',
    textColor: 'text-blue-900',
  },
  {
    id: 'tournaments',
    title: 'Torneos',
    description: 'Participa en las mejores ligas y torneos para poner a prueba lo aprendido.',
    icon: <Trophy size={32} />,
    href: '/tournaments',
    gradient: 'from-amber-400 via-amber-500 to-amber-600',
    bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    textColor: 'text-amber-900',
  },
  {
    id: 'sponsors',
    title: 'Padrinos',
    description: 'Apoya a nuestros jugadores y sé parte del crecimiento de Suarez Academy.',
    icon: <Heart size={32} />,
    href: '/sponsors',
    gradient: 'from-pink-400 via-pink-500 to-rose-500',
    bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50',
    textColor: 'text-pink-900',
  },
  {
    id: 'coaches',
    title: 'Entrenadores Expertos',
    description: 'Nuestro cuerpo técnico cuenta con amplia experiencia en formación de jugadores jóvenes.',
    icon: <Users size={32} />,
    href: '#',
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    textColor: 'text-blue-900',
  },
  {
    id: 'schedule',
    title: 'Horarios Flexibles',
    description: 'Entrenamientos diseñados para no interferir con las actividades escolares.',
    icon: <Calendar size={32} />,
    href: '#',
    gradient: 'from-green-400 via-green-500 to-green-600',
    bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
    textColor: 'text-green-900',
  },
];

export function RotatingCards() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rotación automática cada 5 segundos
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Mostrar 3 cards a la vez (o menos en mobile)
  const getVisibleCards = () => {
    const visible: CardData[] = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % cards.length;
      visible.push(cards[index]);
    }
    return visible;
  };

  const visibleCards = getVisibleCards();

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Por qué elegirnos?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Ofrecemos una formación integral que va más allá del campo de juego.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-8">
          {visibleCards.map((card, idx) => (
            <div
              key={card.id}
              className={`glass-card p-6 lg:p-8 transition-all duration-500 transform ${
                idx === 0 ? 'scale-105 z-10 shadow-2xl' : 'scale-100 opacity-90'
              } hover:shadow-xl hover:scale-105`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${card.bgColor} ${card.textColor}`}>
                {card.icon}
              </div>
              <h3 className={`text-xl font-bold mb-3 ${card.textColor}`}>{card.title}</h3>
              <p className="text-gray-600 mb-6 text-sm lg:text-base">
                {card.description}
              </p>
              {card.href !== '#' ? (
                <Link
                  href={card.href}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all duration-300 hover:scale-110 hover:shadow-lg bg-gradient-to-r ${card.gradient}`}
                >
                  {card.id === 'enrollment' && 'MATRICÚLATE AHORA'}
                  {card.id === 'tournaments' && 'Ver Torneos'}
                  {card.id === 'sponsors' && 'Ser Padrino'}
                  {card.href === '#' && 'Más Información'}
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r ${card.gradient} opacity-75 cursor-default`}>
                  Más Información
                  <ArrowRight size={18} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Indicadores de navegación */}
        <div className="flex justify-center gap-2 mt-8">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 3000);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Ir a card ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

