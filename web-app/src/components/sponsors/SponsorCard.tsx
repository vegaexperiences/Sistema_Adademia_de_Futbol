'use client';

import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { Sponsor } from '@/lib/actions/sponsors';
import Image from 'next/image';

interface SponsorCardProps {
  sponsor: Sponsor;
}

export function SponsorCard({ sponsor }: SponsorCardProps) {
  return (
    <div className="glass-card p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col h-full">
      {/* Image */}
      {sponsor.image_url && (
        <div className="relative w-full h-48 mb-6 rounded-lg overflow-hidden">
          <Image
            src={sponsor.image_url}
            alt={sponsor.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Icon if no image */}
      {!sponsor.image_url && (
        <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl flex items-center justify-center text-pink-600 mb-6">
          <Heart size={32} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{sponsor.name}</h3>
        
        {sponsor.description && (
          <p className="text-gray-600 mb-4 text-sm lg:text-base flex-1">
            {sponsor.description}
          </p>
        )}

        {/* Price */}
        <div className="mb-4">
          <span className="text-3xl font-extrabold text-pink-600">
            ${sponsor.amount.toFixed(2)}
          </span>
        </div>

        {/* Benefits */}
        {sponsor.benefits && sponsor.benefits.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Beneficios incluidos:</h4>
            <ul className="space-y-2">
              {sponsor.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-pink-500 mt-1">✓</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Button */}
        <Link
          href={`/sponsors/checkout/${sponsor.id}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-pink-500 via-pink-600 to-rose-600 hover:from-pink-600 hover:to-rose-700 transition-all duration-300 hover:scale-110 hover:shadow-lg mt-auto"
        >
          Ser Padrino
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

