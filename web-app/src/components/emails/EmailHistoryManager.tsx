'use client';

import { useState, useEffect, useTransition } from 'react';
import { Mail, Clock, CheckCircle, XCircle, Eye, MousePointerClick, Search, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { EmailHistoryItem, EmailHistoryFilters, getEmailHistory } from '@/lib/actions/email-history';
import { EmailDetailModal } from './EmailDetailModal';

interface EmailHistoryManagerProps {
  initialEmails?: EmailHistoryItem[];
  initialTotal?: number;
  initialPage?: number;
  initialTotalPages?: number;
}

export function EmailHistoryManager({ 
  initialEmails = [], 
  initialTotal = 0,
  initialPage = 1,
  initialTotalPages = 0
}: EmailHistoryManagerProps) {
  const [emails, setEmails] = useState<EmailHistoryItem[]>(initialEmails);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isPending, startTransition] = useTransition();
  
  const [filters, setFilters] = useState<EmailHistoryFilters>({
    status: undefined,
    search: '',
    templateId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryItem | null>(null);

  const loadEmails = async (newFilters: EmailHistoryFilters, newPage: number) => {
    startTransition(async () => {
      const result = await getEmailHistory(newFilters, { page: newPage, limit: 50 });
      setEmails(result.emails);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    });
  };

  // Initial load is handled by server-side props, client-side filtering happens on user interaction

  const handleFilterChange = (key: keyof EmailHistoryFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    loadEmails(newFilters, 1);
  };

  const handleSearchChange = (searchTerm: string) => {
    handleFilterChange('search', searchTerm || undefined);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadEmails(filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
            Pendiente
          </span>
        );
      case 'sent':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
            Enviado
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
            Fallido
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="text-blue-600" size={28} />
              Historial de Correos
            </h2>
            <p className="text-gray-600 mt-1">
              Gestiona y monitorea todos los correos enviados
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Total: <span className="font-bold text-gray-900">{total}</span> correos
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por email o asunto..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFilterChange('search', filters.search || undefined);
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="sent">Enviado</option>
            <option value="failed">Fallido</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Desde"
          />

          {/* Date To */}
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Hasta"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destinatario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asunto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plantilla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enviado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isPending ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron correos
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr
                    key={email.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {email.to_email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={email.subject}>
                        {email.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {email.template_name ? email.template_name.replace(/_/g, ' ') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(email.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {email.sent_at ? formatDate(email.sent_at) : formatDate(email.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {email.delivered_at && (
                          <span className="p-1 bg-green-100 rounded" title="Entregado">
                            <CheckCircle size={14} className="text-green-600" />
                          </span>
                        )}
                        {email.opened_at && (
                          <span className="p-1 bg-blue-100 rounded" title="Abierto">
                            <Eye size={14} className="text-blue-600" />
                          </span>
                        )}
                        {email.clicked_at && (
                          <span className="p-1 bg-purple-100 rounded" title="Click en enlace">
                            <MousePointerClick size={14} className="text-purple-600" />
                          </span>
                        )}
                        {email.bounced_at && (
                          <span className="p-1 bg-red-100 rounded" title="Rebotado">
                            <XCircle size={14} className="text-red-600" />
                          </span>
                        )}
                        {!email.delivered_at && !email.opened_at && !email.bounced_at && email.status === 'sent' && (
                          <span className="text-xs text-gray-400">Pendiente</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmail(email);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                      >
                        Ver <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {((page - 1) * 50) + 1} a {Math.min(page * 50, total)} de {total} correos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || isPending}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-700 font-medium">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || isPending}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Detail Modal */}
      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
}

