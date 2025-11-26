'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, DollarSign, Calendar, CreditCard, FileText, User } from 'lucide-react';
import { createPayment } from '@/lib/actions/payments';
import { PagueloFacilCheckoutInline } from '@/components/payments/PagueloFacilCheckoutInline';
import Link from 'next/link';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  category?: string | null;
  tutor_email?: string | null;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;
  
  const [familyData, setFamilyData] = useState<{
    familyId: string;
    familyName: string;
    tutorEmail?: string | null;
    players: Player[];
  } | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [formData, setFormData] = useState({
    amount: '',
    payment_type: 'monthly' as 'enrollment' | 'monthly' | 'custom',
    payment_method: 'cash' as 'cash' | 'transfer' | 'yappy' | 'card' | 'paguelofacil' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    month_year: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPagueloFacilCheckout, setShowPagueloFacilCheckout] = useState(false);
  const [pagueloFacilConfig, setPagueloFacilConfig] = useState<{ apiKey: string; cclw: string; sandbox: boolean } | null>(null);

  useEffect(() => {
    // Get family data from sessionStorage
    const stored = sessionStorage.getItem('paymentFamilyData');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setFamilyData(data);
        // Clear sessionStorage after reading
        sessionStorage.removeItem('paymentFamilyData');
      } catch (e) {
        console.error('Error parsing family data:', e);
        router.push(`/dashboard/families/${familyId}`);
      }
    } else {
      // If no data, redirect back
      router.push(`/dashboard/families/${familyId}`);
    }
  }, [familyId, router]);

  if (!familyData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Filter to only show Active and Scholarship players
  const eligiblePlayers = familyData.players.filter(p => 
    p.status === 'Active' || p.status === 'Scholarship'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedPlayerId) {
      setError('Debes seleccionar un jugador');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    // If PagueloFacil is selected, open checkout
    if (formData.payment_method === 'paguelofacil') {
      try {
        // Get PagueloFacil config
        const response = await fetch('/api/payments/paguelofacil');
        const data = await response.json();
        
        if (data.success && data.config) {
          setPagueloFacilConfig(data.config);
          setShowPagueloFacilCheckout(true);
        } else {
          setError('Error al inicializar Paguelo Fácil. Por favor intenta con otro método de pago.');
        }
      } catch (err: any) {
        setError('Error al inicializar Paguelo Fácil: ' + (err.message || 'Error desconocido'));
      }
      return;
    }

    // For other payment methods, proceed directly
    startTransition(async () => {
      try {
        await createPayment({
          player_id: selectedPlayerId,
          amount: parseFloat(formData.amount),
          payment_type: formData.payment_type,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          month_year: formData.payment_type === 'monthly' ? formData.month_year : undefined,
          notes: formData.notes || undefined,
        });

        setSuccess(true);
        setTimeout(() => {
          router.push(`/dashboard/families/${familyId}`);
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Error al crear el pago');
      }
    });
  };

  const handlePagueloFacilSuccess = async (transactionId: string, response: any) => {
    try {
      await createPayment({
        player_id: selectedPlayerId,
        amount: parseFloat(formData.amount),
        payment_type: formData.payment_type,
        payment_method: 'paguelofacil',
        payment_date: new Date().toISOString().split('T')[0],
        month_year: formData.payment_type === 'monthly' ? formData.month_year : undefined,
        notes: `Pago procesado con Paguelo Fácil. Transaction ID: ${transactionId}. ${formData.notes || ''}`,
      });

      setShowPagueloFacilCheckout(false);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/families/${familyId}`);
      }, 1500);
    } catch (err: any) {
      setError('Error al registrar el pago: ' + (err.message || 'Error desconocido'));
      setShowPagueloFacilCheckout(false);
    }
  };

  const handlePagueloFacilError = (errorMsg: string) => {
    setError('Error en Paguelo Fácil: ' + errorMsg);
    setShowPagueloFacilCheckout(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back Button */}
      <Link 
        href={`/dashboard/families/${familyId}`}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        Volver a Familia
      </Link>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            Registrar Pago - Familia {familyData.familyName}
          </h2>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card p-6">
        {showPagueloFacilCheckout && pagueloFacilConfig ? (
          <PagueloFacilCheckoutInline
            amount={parseFloat(formData.amount)}
            description={`${formData.payment_type === 'monthly' ? 'Mensualidad' : formData.payment_type === 'enrollment' ? 'Matrícula' : 'Pago'} - ${eligiblePlayers.find(p => p.id === selectedPlayerId)?.first_name || ''} ${eligiblePlayers.find(p => p.id === selectedPlayerId)?.last_name || ''}`}
            email={familyData.tutorEmail || eligiblePlayers.find(p => p.id === selectedPlayerId)?.tutor_email || ''}
            orderId={`payment-${selectedPlayerId}-${Date.now()}`}
            apiKey={pagueloFacilConfig.apiKey}
            cclw={pagueloFacilConfig.cclw}
            sandbox={pagueloFacilConfig.sandbox}
            onSuccess={handlePagueloFacilSuccess}
            onError={handlePagueloFacilError}
            onBack={() => setShowPagueloFacilCheckout(false)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Jugador
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">Selecciona un jugador</option>
                {eligiblePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                    {player.category ? ` - ${player.category}` : ''}
                    {player.status === 'Scholarship' ? ' (Becado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Pago
              </label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="monthly">Mensualidad</option>
                <option value="enrollment">Matrícula</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Month/Year for monthly payments */}
            {formData.payment_type === 'monthly' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Mes y Año
                </label>
                <input
                  type="month"
                  value={formData.month_year}
                  onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Monto
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <CreditCard className="inline h-4 w-4 mr-1" />
                Método de Pago
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="yappy">Yappy</option>
                <option value="paguelofacil">Paguelo Fácil</option>
                <option value="card">Tarjeta</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Fecha de Pago
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Notas (Opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Notas adicionales sobre el pago..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Pago registrado exitosamente
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link
                href={`/dashboard/families/${familyId}`}
                className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isPending || success}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Registrando...
                  </>
                ) : success ? (
                  '✓ Registrado'
                ) : (
                  <>
                    <DollarSign size={20} />
                    Registrar Pago
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

