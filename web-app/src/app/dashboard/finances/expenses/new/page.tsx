import { getExpenseCategories } from '@/lib/actions/expense-categories';
import { createRecurringExpense } from '@/lib/actions/expense-recurrence';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NewExpensePage() {
  const categories = await getExpenseCategories();

  async function handleSubmit(formData: FormData) {
    'use server';

    const isRecurring = formData.get('is_recurring') === 'on';

    if (isRecurring) {
      // Create recurring expense
      const data = {
        category_id: formData.get('category_id') || null,
        amount: parseFloat(formData.get('amount') as string),
        frequency: formData.get('frequency'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date') || null,
        description: formData.get('description'),
        vendor: formData.get('vendor') || null,
      };

      await createRecurringExpense(data);
      redirect('/dashboard/finances/expenses');
    } else {
      // Redirect to expenses page with data in query
      const expenseData = {
        category_id: formData.get('category_id'),
        amount: formData.get('amount'),
        description: formData.get('description'),
        vendor: formData.get('vendor'),
        date: formData.get('date'),
      };

      // Store in localStorage and redirect (will be handled client-side)
      redirect('/dashboard/finances/expenses?action=add');
    }
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <Link 
            href="/dashboard/finances/expenses"
            className="text-blue-600 hover:underline text-sm mb-4 flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Volver a Gastos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Agregar Gasto
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Registra un nuevo gasto operativo
          </p>
        </div>

        {/* Form */}
        <form action={handleSubmit} className="glass-card p-6 space-y-6">
          {/* Recurring toggle */}
          <div className="flex items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <input
              type="checkbox"
              id="is_recurring"
              name="is_recurring"
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="is_recurring" className="text-sm font-medium text-purple-900 dark:text-purple-100 cursor-pointer">
              🔄 Gasto Recurrente (se repetirá automáticamente)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoría
            </label>
            <select
              name="category_id"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción *
            </label>
            <input
              type="text"
              name="description"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ej: Pago de alquiler mensual"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monto *
              </label>
              <input
                type="number"
                name="amount"
                step="0.01"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proveedor
              </label>
              <input
                type="text"
                name="vendor"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Nombre del proveedor"
              />
            </div>
          </div>

          {/* Conditional fields based on recurring */}
          <div id="one-time-fields">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha *
            </label>
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div id="recurring-fields" className="hidden space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frecuencia *
              </label>
              <select
                name="frequency"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Inicio *
                </label>
                <input
                  type="date"
                  name="start_date"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Fin (opcional)
                </label>
                <input
                  type="date"
                  name="end_date"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          <script dangerouslySetInnerHTML={{__html: `
            document.getElementById('is_recurring').addEventListener('change', function(e) {
              const oneTime = document.getElementById('one-time-fields');
              const recurring = document.getElementById('recurring-fields');
              if (e.target.checked) {
                oneTime.classList.add('hidden');
                recurring.classList.remove('hidden');
              } else {
                oneTime.classList.remove('hidden');
                recurring.classList.add('hidden');
              }
            });
          `}} />

          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/dashboard/finances/expenses"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              Agregar Gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
