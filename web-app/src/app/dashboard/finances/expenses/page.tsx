import { getExpenseCategories } from '@/lib/actions/expense-categories';
import { getRecurringExpenses } from '@/lib/actions/expense-recurrence';
import { Plus, Repeat } from 'lucide-react';
import Link from 'next/link';
import RecurringExpensesList from '@/components/finances/RecurringExpensesList';

export default async function ExpensesPage() {
  const categories = await getExpenseCategories();
  const recurringExpenses = await getRecurringExpenses();

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/dashboard/finances" className="text-blue-600 hover:underline text-sm mb-2 block">
              ← Volver a Finanzas
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💸 Gestión de Gastos
            </h1>
            <p className="text-gray-600">
              Administra gastos operativos y recurrentes
            </p>
          </div>
          <Link
            href="/dashboard/finances/expenses/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            Agregar Gasto
          </Link>
        </div>
      </div>

      {/* Categories */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          📂 Categorías de Gastos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 border border-gray-200 rounded-lg text-center hover:shadow-md transition-all"
              style={{ borderLeftColor: category.color || '#gray' }}
            >
              <div className="text-2xl mb-2">{category.icon}</div>
              <div className="font-medium text-gray-900">{category.name}</div>
              {category.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {category.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recurring Expenses */}
      <RecurringExpensesList expenses={recurringExpenses} categories={categories} />

      {/* Info */}
      <div className="glass-card p-6 bg-blue-50 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">💡 Gastos Recurrentes</h3>
        <p className="text-sm text-blue-800">
          Los gastos recurrentes se generan automáticamente según su frecuencia configurada.
          Puedes crear gastos mensuales como alquiler, servicios, etc.
        </p>
      </div>
    </div>
  );
}
