'use client';

import { createClient } from '@/lib/supabase/client'; // We'll use client-side insert for simplicity here or create an action
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Note: Ideally we should use a server action for this too, but showing client-side option for variety/speed
// Actually, let's stick to server actions for consistency. I'll need to add createExpense to actions/finance.ts

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const expense = {
      description: formData.get('description'),
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category'),
      payment_method: formData.get('payment_method'),
      date: new Date().toISOString(),
    };

    const { error } = await supabase.from('expenses').insert(expense);
    setLoading(false);

    if (!error) {
      router.push('/dashboard/finance');
      router.refresh();
    } else {
      alert('Error al registrar gasto');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrar Nuevo Gasto</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <input name="description" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2" />
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
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <select name="category" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2">
              <option value="Equipamiento">Equipamiento</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Salarios">Salarios</option>
              <option value="Alquiler">Alquiler</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
            <select name="payment_method" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm border p-2">
              <option value="Transferencia">Transferencia</option>
              <option value="PagueloFacil">Paguelo Fácil</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="animate-spin h-4 w-4" />}
            Registrar Gasto
          </button>
        </div>
      </form>
    </div>
  );
}
