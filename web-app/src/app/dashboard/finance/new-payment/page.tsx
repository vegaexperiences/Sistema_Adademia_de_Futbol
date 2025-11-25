'use client';

import { recordPayment } from '@/lib/actions/finance';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase.from('players').select('id, first_name, last_name');
      if (data) setPlayers(data);
    };
    fetchPlayers();
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    const result = await recordPayment(formData);
    setLoading(false);

    if (result?.success) {
      router.push('/dashboard/finance');
    } else {
      alert('Error al registrar pago');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrar Nuevo Pago</h1>
      
      <form action={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Jugador</label>
            <select name="playerId" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2">
              <option value="">Seleccionar Jugador...</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Monto</label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="amount"
                step="0.01"
                required
                className="block w-full rounded-md border-gray-300 pl-7 focus:border-primary focus:ring-primary sm:text-sm border p-2"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Pago</label>
            <select name="type" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2">
              <option value="Mensualidad">Mensualidad</option>
              <option value="Matrícula">Matrícula</option>
              <option value="Torneo">Torneo</option>
              <option value="Uniforme">Uniforme</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
            <select name="method" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2">
              <option value="Transferencia">Transferencia</option>
              <option value="Yappy">Yappy</option>
              <option value="PagueloFacil">Paguelo Fácil</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Referencia / Comprobante</label>
            <input name="reference" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Notas</label>
            <textarea name="notes" rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="animate-spin h-4 w-4" />}
            Registrar Pago
          </button>
        </div>
      </form>
    </div>
  );
}
