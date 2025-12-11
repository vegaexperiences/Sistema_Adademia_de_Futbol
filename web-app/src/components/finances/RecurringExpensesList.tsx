'use client';

import { ExpenseCategory } from '@/lib/actions/expense-categories';
import { Repeat } from 'lucide-react';

interface RecurringExpensesListProps {
  expenses: any[];
  categories: ExpenseCategory[];
}

export default function RecurringExpensesList({ expenses, categories }: RecurringExpensesListProps) {
  const getFrequencyLabel = (freq: string) => {
    const frequencies: Record<string, string> = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      yearly: 'Anual'
    };
    return frequencies[freq] || freq;
  };

  if (expenses.length === 0) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Repeat size={24} />
          Gastos Recurrentes
        </h2>
        <p className="text-center text-gray-500 py-8">
          No hay gastos recurrentes configurados
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Repeat size={24} />
        Gastos Recurrentes
      </h2>

      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {expense.expense_categories && (
                    <span className="text-xl">{expense.expense_categories.icon}</span>
                  )}
                  <h3 className="font-bold text-gray-900">
                    {expense.description}
                  </h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                    {getFrequencyLabel(expense.frequency)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Monto:</span> ${parseFloat(expense.amount).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Inicio:</span> {new Date(expense.start_date).toLocaleDateString('es-ES')}
                  </div>
                  {expense.end_date && (
                    <div>
                      <span className="font-medium">Fin:</span> {new Date(expense.end_date).toLocaleDateString('es-ES')}
                    </div>
                  )}
                  {expense.vendor && (
                    <div>
                      <span className="font-medium">Proveedor:</span> {expense.vendor}
                    </div>
                  )}
                </div>
              </div>

              <span className={`px-2 py-1 text-xs rounded-full ${
                expense.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {expense.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
