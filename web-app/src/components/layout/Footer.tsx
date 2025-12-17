'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  
  // Get logo URL from academy context, fallback to default
  const logoUrl = academy?.logo_medium_url || academy?.logo_url || academy?.logo_small_url || '/logo.png';
  
  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-8 h-8 bg-transparent">
                <Image 
                  src={logoUrl} 
                  alt="Academy Logo" 
                  fill
                  className="object-contain"
                  style={{ objectFit: 'contain' }}
                  priority
                  unoptimized
                />
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              Formando campeones dentro y fuera de la cancha.
            </p>
          </div>
          <div className="flex space-x-6">
            <Link href="#" className="text-gray-400 hover:text-gray-500 transition-colors">
              <span className="sr-only">Instagram</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465 1.067-.047 1.409-.06 3.809-.06h.63zm1.673 5.378c-.844 0-1.685.006-2.53.006-.845 0-1.688-.006-2.533-.006-2.174 0-3.072.104-3.88.417-.55.213-.952.488-1.354.89-.402.402-.677.804-.89 1.354-.313.808-.417 1.706-.417 3.88 0 2.174.104 3.072.417 3.88.213.55.488.952.89 1.354.402.402.804.677 1.354.89.808.313 1.706.417 3.88.417 2.174 0 3.072-.104 3.88-.417.55-.213.952-.488 1.354-.89.402-.402.677-.804.89-1.354.313-.808.417-1.706.417-3.88 0-2.174-.104-3.072-.417-3.88-.213-.55-.488-.952-.89-1.354-.402-.402-.804-.677-1.354-.89-.808-.313-1.706-.417-3.88-.417zM12 7a5 5 0 110 10 5 5 0 010-10zm0 1.833a3.167 3.167 0 100 6.334 3.167 3.167 0 000-6.334zM17.333 5.333a1.167 1.167 0 110 2.334 1.167 1.167 0 010-2.334z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-100 pt-8 md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            <Link href="#" className="text-gray-400 hover:text-gray-500 text-sm transition-colors">
              Política de Privacidad
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500 text-sm transition-colors">
              Términos de Servicio
            </Link>
          </div>
          <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
            &copy; {new Date().getFullYear()} Suarez Academy. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
