import { getTransactions, getBalanceSummary } from '@/lib/actions/transactions';
import { TransactionsList } from '@/components/finances/TransactionsList';
import { BalanceCard } from '@/components/finances/BalanceCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AdvancePaymentButton } from '@/components/finances/AdvancePaymentButton';

export default async function TransactionsPage() {
  // Get current month transactions and balance
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

  const [transactions, balanceSummary] = await Promise.all([
    getTransactions({
      startDate: startOfMonth,
      endDate: endOfMonth,
    }),
    getBalanceSummary(),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-6">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/finances"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                📋 Transacciones
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Historial completo de ingresos y gastos
              </p>
            </div>
          </div>
          <AdvancePaymentButton />
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <BalanceCard
          balance={balanceSummary.monthly}
          title="Balance Mensual"
          periodLabel="Este mes"
        />
        <BalanceCard
          balance={balanceSummary.quarterly}
          title="Balance Trimestral"
          periodLabel="Este trimestre"
        />
        <BalanceCard
          balance={balanceSummary.annual}
          title="Balance Anual"
          periodLabel="Este año"
        />
      </div>

      {/* Transactions List */}
      <TransactionsList transactions={transactions} />
    </div>
  );
}


