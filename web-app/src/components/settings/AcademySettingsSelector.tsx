'use client'

import { useState, useEffect } from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import { getAllAcademies, type Academy } from '@/lib/actions/academies'
import { getAcademyIdFromCookies } from '@/lib/utils/academy-client'

interface AcademySettingsSelectorProps {
  onAcademyChange?: (academyId: string | null) => void
}

export function AcademySettingsSelector({ onAcademyChange }: AcademySettingsSelectorProps) {
  const [academies, setAcademies] = useState<Academy[]>([])
  const [currentAcademy, setCurrentAcademy] = useState<Academy | null>(null)
  const [selectedAcademyId, setSelectedAcademyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadAcademies()
  }, [])

  const loadAcademies = async () => {
    setIsLoading(true)
    try {
      const academiesResult = await getAllAcademies()

      if (academiesResult.data) {
        setAcademies(academiesResult.data)
      }

      // Get current academy from API
      const currentAcademyId = getAcademyIdFromCookies()
      if (currentAcademyId) {
        const current = academiesResult.data?.find(a => a.id === currentAcademyId)
        if (current) {
          setCurrentAcademy(current)
          setSelectedAcademyId(current.id)
        }
      } else if (academiesResult.data && academiesResult.data.length > 0) {
        // Default to first academy if no current academy
        setCurrentAcademy(academiesResult.data[0])
        setSelectedAcademyId(academiesResult.data[0].id)
      }
    } catch (error) {
      console.error('Error loading academies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcademyChange = (academyId: string | null) => {
    setSelectedAcademyId(academyId)
    setIsOpen(false)
    
    // Set cookies so server can detect the academy
    if (academyId) {
      const selectedAcademy = academies.find(a => a.id === academyId)
      if (selectedAcademy) {
        // Set cookies for server-side detection
        document.cookie = `academy-id=${academyId}; path=/; max-age=31536000; SameSite=Lax`
        document.cookie = `academy-slug=${selectedAcademy.slug}; path=/; max-age=31536000; SameSite=Lax`
        
        // Update current academy state
        setCurrentAcademy(selectedAcademy)
      }
    } else {
      // Clear cookies if no academy selected
      document.cookie = 'academy-id=; path=/; max-age=0'
      document.cookie = 'academy-slug=; path=/; max-age=0'
      setCurrentAcademy(null)
    }
    
    // Reload page to apply changes server-side
    window.location.reload()
    
    onAcademyChange?.(academyId)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600">Cargando academias...</p>
      </div>
    )
  }

  // Show selector if there are academies available
  if (academies.length === 0) {
    return null
  }

  const selectedAcademy = academies.find(a => a.id === selectedAcademyId) || currentAcademy

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 relative">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Academia Actual
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">
              {selectedAcademy?.name || 'Seleccionar academia'}
            </span>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {academies.map((academy) => (
                <button
                  key={academy.id}
                  type="button"
                  onClick={() => handleAcademyChange(academy.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                    selectedAcademyId === academy.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{academy.name}</p>
                    <p className="text-xs text-gray-500">Slug: {academy.slug}</p>
                  </div>
                  {selectedAcademyId === academy.id && (
                    <span className="text-blue-600 font-semibold text-sm">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {selectedAcademy && (
        <p className="text-xs text-gray-500 mt-2">
          Nota: Los ajustes actuales son globales. La configuración de pagos por academia se gestiona desde la lista de academias.
        </p>
      )}
    </div>
  )
}

