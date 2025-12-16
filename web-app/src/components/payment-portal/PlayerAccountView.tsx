'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, DollarSign, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getPlayerAccountForPayment, type PlayerAccountInfo } from '@/lib/actions/payment-portal';
import { PublicPaymentForm } from './PublicPaymentForm';

interface PlayerAccountViewProps {
  playerId: string;
}

export function PlayerAccountView({ playerId }: PlayerAccountViewProps) {
  const [accountInfo, setAccountInfo] = useState<PlayerAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lateFees, setLateFees] = useState<Array<{ monthYear: string; amount: number }>>([]);
  const [loadingLateFees, setLoadingLateFees] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setError(null);
      try {
        const result = await getPlayerAccountForPayment(playerId);
        if (result.error) {
          setError(result.error);
        } else {
          setAccountInfo(result.data);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar la información de la cuenta');
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [playerId]);

  useEffect(() => {
    async function loadLateFees() {
      try {
        const { getPlayerLateFees } = await import('@/lib/actions/late-fees');
        const fees = await getPlayerLateFees(playerId);
        const feesByMonth = fees
          .filter(fee => fee.late_fee_amount > 0)
          .map(fee => ({
            monthYear: fee.month_year || '',
            amount: fee.late_fee_amount,
          }));
        setLateFees(feesByMonth);
      } catch (error) {
        console.error('Error loading late fees:', error);
      } finally {
        setLoadingLateFees(false);
      }
    }
    if (playerId) {
      loadLateFees();
    }
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información de la cuenta...</p>
        </div>
      </div>
    );
  }

  if (error || !accountInfo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-bold text-red-900">Error</h2>
        </div>
        <p className="text-red-800 mb-4">{error || 'No se pudo cargar la información de la cuenta'}</p>
        <Link
          href="/pay"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a buscar
        </Link>
      </div>
    );
  }

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/pay"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Buscar otra cuenta
      </Link>

      {/* Player Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {accountInfo.player.first_name} {accountInfo.player.last_name}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {accountInfo.player.cedula && (
            <span>Cédula: {accountInfo.player.cedula}</span>
          )}
          {accountInfo.player.category && (
            <span>Categoría: {accountInfo.player.category}</span>
          )}
        </div>
      </div>

      {/* Account Status */}
      <div className={`rounded-lg p-6 border-l-4 ${
        accountInfo.isUpToDate
          ? 'bg-green-50 border-green-500'
          : 'bg-red-50 border-red-500'
      }`}>
        <div className="flex items-start gap-4">
          {accountInfo.isUpToDate ? (
            <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 className={`text-xl font-bold mb-2 ${
              accountInfo.isUpToDate ? 'text-green-900' : 'text-red-900'
            }`}>
              {accountInfo.isUpToDate ? 'Cuenta al Día' : 'Cuenta Morosa'}
            </h2>
            {!accountInfo.isUpToDate && (
              <div className="space-y-2">
                {accountInfo.overdueMonths.length > 0 && (
                  <p className="text-red-800">
                    <strong>Meses vencidos:</strong> {accountInfo.overdueMonths.map(formatMonthYear).join(', ')}
                  </p>
                )}
                {accountInfo.pendingCharges.length > 0 && (
                  <p className="text-red-800">
                    <strong>Cargos pendientes:</strong> {accountInfo.pendingCharges.length}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <h3 className="font-semibold text-gray-700">Balance</h3>
          </div>
          <p className={`text-2xl font-bold ${
            accountInfo.balance > 0 ? 'text-red-600' : accountInfo.balance < 0 ? 'text-green-600' : 'text-gray-900'
          }`}>
            ${Math.abs(accountInfo.balance).toFixed(2)}
          </p>
          {accountInfo.balance > 0 && (
            <p className="text-sm text-gray-600 mt-1">Monto pendiente</p>
          )}
          {accountInfo.balance < 0 && (
            <div className="mt-1">
              <p className="text-sm font-semibold text-green-600">Crédito disponible</p>
              <p className="text-xs text-gray-500 mt-1">Este crédito se aplicará automáticamente a futuros cargos</p>
            </div>
          )}
          {accountInfo.balance === 0 && (
            <p className="text-sm text-gray-600 mt-1">Sin balance pendiente</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-6 w-6 text-orange-600" />
            <h3 className="font-semibold text-gray-700">Total Cargos</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${accountInfo.totalCharges.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">Generados</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="font-semibold text-gray-700">Total Pagado</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">
            ${accountInfo.totalPayments.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">Acreditado</p>
        </div>
      </div>

      {/* Pending Charges */}
      {accountInfo.pendingCharges.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cargos Pendientes</h2>
          <div className="space-y-3">
            {accountInfo.pendingCharges.map((charge) => (
              <div
                key={charge.id}
                className={`p-4 rounded-lg border ${
                  charge.status === 'Overdue'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {charge.month_year ? formatMonthYear(charge.month_year) : 'Cargo pendiente'}
                    </p>
                    <p className={`text-sm font-medium ${
                      charge.status === 'Overdue' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {charge.status === 'Overdue' ? 'Vencido' : 'Pendiente'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    ${charge.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Late Fees Section */}
      {!loadingLateFees && lateFees.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Recargos por Pagos Atrasados</h2>
          </div>
          <div className="space-y-3">
            {lateFees.map((fee, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-red-50 border-red-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {fee.monthYear ? formatMonthYear(fee.monthYear) : 'Recargo aplicado'}
                    </p>
                    <p className="text-sm text-red-700">Recargo por pago atrasado</p>
                  </div>
                  <p className="text-lg font-bold text-red-600">
                    ${fee.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-red-200">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">Total de Recargos:</p>
                <p className="text-xl font-bold text-red-600">
                  ${lateFees.reduce((sum, fee) => sum + fee.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advance Payment Section */}
      {accountInfo.balance < 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-green-900 mb-2">Crédito Disponible</h2>
              <p className="text-sm text-green-800">
                Tienes un crédito de <strong>${Math.abs(accountInfo.balance).toFixed(2)}</strong> que se aplicará automáticamente 
                cuando se generen nuevos cargos mensuales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <PublicPaymentForm
        playerId={playerId}
        playerName={`${accountInfo.player.first_name} ${accountInfo.player.last_name}`}
        balance={accountInfo.balance}
        pendingCharges={accountInfo.pendingCharges}
      />
    </div>
  );
}

