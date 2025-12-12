'use client';

import { useState } from 'react';
import { Search, Filter, ArrowDownCircle, ArrowUpCircle, Calendar, CreditCard } from 'lucide-react';
import type { Transaction } from '@/lib/actions/transactions';

interface TransactionsListProps {
  transactions: Transaction[];
  onFilterChange?: (filter: {
    type?: 'income' | 'expense' | 'all';
    method?: string;
    status?: string;
    search?: string;
  }) => void;
}

export function TransactionsList({ transactions, onFilterChange }: TransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMethodLabel = (method?: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      yappy: 'Yappy',
      paguelofacil: 'Paguelo Fácil',
      card: 'Tarjeta',
      ach: 'ACH',
      other: 'Otro',
    };
    return method ? labels[method] || method : 'N/A';
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      Approved: 'Aprobado',
      Pending: 'Pendiente',
      Rejected: 'Rechazado',
      Cancelled: 'Cancelado',
    };
    return status ? labels[status] || status : 'N/A';
  };

  const handleFilterChange = () => {
    if (onFilterChange) {
      onFilterChange({
        type: typeFilter === 'all' ? undefined : typeFilter,
        method: methodFilter === 'all' ? undefined : methodFilter,
        search: searchTerm || undefined,
      });
    }
  };

  // Filter transactions client-side if no onFilterChange handler
  const filteredTransactions = onFilterChange 
    ? transactions 
    : transactions.filter(t => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (methodFilter !== 'all' && t.method !== methodFilter) return false;
        if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      });

  const uniqueMethods = Array.from(new Set(transactions.map(t => t.method).filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar transacciones..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!onFilterChange) handleFilterChange();
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  if (!onFilterChange) handleFilterChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
              </select>
            </div>

            {/* Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método</label>
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  if (!onFilterChange) handleFilterChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                {uniqueMethods.map(method => (
                  <option key={method} value={method}>{getMethodLabel(method)}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Transacciones ({filteredTransactions.length})
        </h3>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No se encontraron transacciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`p-4 rounded-lg border-l-4 ${
                  transaction.type === 'income'
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {transaction.type === 'income' ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      )}
                      <h4 className="font-semibold text-gray-900">{transaction.description}</h4>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 ml-7">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(transaction.date)}
                      </span>
                      {transaction.method && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          {getMethodLabel(transaction.method)}
                        </span>
                      )}
                      {transaction.status && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.status === 'Approved' 
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getStatusLabel(transaction.status)}
                        </span>
                      )}
                      {transaction.category && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {transaction.category}
                        </span>
                      )}
                    </div>

                    {transaction.player_name && (
                      <div className="text-xs text-gray-500 ml-7 mt-1 space-y-1">
                        <p>
                          <span className="font-semibold">Jugador:</span> {transaction.player_name}
                          {transaction.player_cedula && ` (Cédula: ${transaction.player_cedula})`}
                        </p>
                        {transaction.family_name && (
                          <p>
                            <span className="font-semibold">Tutor:</span> {transaction.family_name}
                            {transaction.tutor_email && ` (${transaction.tutor_email})`}
                          </p>
                        )}
                        {!transaction.family_name && transaction.tutor_email && (
                          <p>
                            <span className="font-semibold">Email:</span> {transaction.tutor_email}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    {transaction.accumulated_balance !== undefined && (
                      <p className={`text-sm font-semibold mt-1 ${
                        transaction.accumulated_balance >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        Balance: {formatCurrency(transaction.accumulated_balance)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


