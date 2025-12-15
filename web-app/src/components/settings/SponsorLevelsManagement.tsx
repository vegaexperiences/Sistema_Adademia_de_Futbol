'use client';

import { useState, useEffect } from 'react';
import { Heart, Plus, Edit, Trash2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { getAllSponsors, createSponsor, updateSponsor, deleteSponsor, toggleSponsorActive } from '@/lib/actions/sponsors';
import { SponsorLevelForm } from './SponsorLevelForm';
import type { Sponsor } from '@/lib/actions/sponsors';

export function SponsorLevelsManagement() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllSponsors(true); // Include inactive sponsors for management
      if (result.error) {
        setError(result.error);
      } else {
        // Show all sponsors (active and inactive) for management
        // We need to fetch all, not just active ones
        setSponsors(result.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar niveles de padrinazgo');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSponsor(null);
    setShowForm(true);
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSponsor(null);
  };

  const handleSubmit = async (data: {
    name: string;
    description?: string;
    amount: number;
    benefits: string[];
    display_order: number;
    image_url?: string;
    is_active: boolean;
  }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingSponsor) {
        const result = await updateSponsor(editingSponsor.id, data);
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createSponsor(data);
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      await loadSponsors();
      setShowForm(false);
      setEditingSponsor(null);
    } catch (err: any) {
      setError(err.message || 'Error al guardar nivel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este nivel? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const result = await deleteSponsor(id);
      if (result.error) {
        setError(result.error);
        alert(result.error);
      } else {
        await loadSponsors();
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar nivel');
      alert(err.message || 'Error al eliminar nivel');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    setError(null);

    try {
      const result = await toggleSponsorActive(id, !currentStatus);
      if (result.error) {
        setError(result.error);
        alert(result.error);
      } else {
        await loadSponsors();
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
      alert(err.message || 'Error al cambiar estado');
    } finally {
      setTogglingId(null);
    }
  };

  // Sort sponsors by display_order, then by amount
  const sortedSponsors = [...sponsors].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.amount - b.amount;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {editingSponsor ? 'Editar Nivel de Padrinazgo' : 'Crear Nuevo Nivel de Padrinazgo'}
          </h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        <SponsorLevelForm
          initialData={editingSponsor || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Niveles de Padrinazgo</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona los niveles de padrinazgo disponibles para los padrinos
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all font-medium flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Crear Nivel
        </button>
      </div>

      {/* Sponsors List */}
      {sortedSponsors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Heart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No hay niveles de padrinazgo creados</p>
          <p className="text-sm mt-2">Haz clic en "Crear Nivel" para agregar el primero</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedSponsors.map((sponsor) => (
            <div
              key={sponsor.id}
              className={`p-6 rounded-lg border-2 transition-all ${
                sponsor.is_active
                  ? 'border-pink-200 bg-pink-50'
                  : 'border-gray-200 bg-gray-50 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-bold text-gray-900">{sponsor.name}</h4>
                    {sponsor.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-pink-600 mb-2">
                    ${sponsor.amount.toFixed(2)}
                  </p>
                  {sponsor.description && (
                    <p className="text-sm text-gray-600 mb-3">{sponsor.description}</p>
                  )}
                  {sponsor.benefits && sponsor.benefits.length > 0 && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {sponsor.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-pink-500 mt-1">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleToggleActive(sponsor.id, sponsor.is_active)}
                  disabled={togglingId === sponsor.id}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    sponsor.is_active
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } disabled:opacity-50`}
                  title={sponsor.is_active ? 'Desactivar' : 'Activar'}
                >
                  {togglingId === sponsor.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : sponsor.is_active ? (
                    <>
                      <EyeOff className="h-4 w-4 inline mr-1" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 inline mr-1" />
                      Activar
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleEdit(sponsor)}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(sponsor.id)}
                  disabled={deletingId === sponsor.id}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm disabled:opacity-50"
                  title="Eliminar"
                >
                  {deletingId === sponsor.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

