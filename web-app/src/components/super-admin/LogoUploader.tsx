'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Image as ImageIcon, Check, AlertCircle, Sparkles } from 'lucide-react'
import { updateAcademy, type Academy } from '@/lib/actions/academies'

interface LogoUploaderProps {
  academy: Academy
}

type LogoType = 'main' | 'small' | 'medium' | 'large' | 'favicon16' | 'favicon32' | 'appleTouch'

interface LogoField {
  key: LogoType
  label: string
  size: string
  description: string
  currentUrl: string | null
}

export function LogoUploader({ academy }: LogoUploaderProps) {
  const router = useRouter()
  const [logos, setLogos] = useState<Record<LogoType, string>>({
    main: academy.logo_url || '',
    small: academy.logo_small_url || '',
    medium: academy.logo_medium_url || '',
    large: academy.logo_large_url || '',
    favicon16: academy.favicon_16_url || '',
    favicon32: academy.favicon_32_url || '',
    appleTouch: academy.apple_touch_icon_url || '',
  })
  
  const [previews, setPreviews] = useState<Record<LogoType, string | null>>({
    main: academy.logo_url || null,
    small: academy.logo_small_url || null,
    medium: academy.logo_medium_url || null,
    large: academy.logo_large_url || null,
    favicon16: academy.favicon_16_url || null,
    favicon32: academy.favicon_32_url || null,
    appleTouch: academy.apple_touch_icon_url || null,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null)
  const mainImageInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRefs = useRef<Record<LogoType, HTMLInputElement | null>>({
    main: null,
    small: null,
    medium: null,
    large: null,
    favicon16: null,
    favicon32: null,
    appleTouch: null,
  })

  const logoFields: LogoField[] = [
    {
      key: 'main',
      label: 'Logo Principal',
      size: 'Flexible (recomendado 512x512+)',
      description: 'Logo principal usado en la mayoría de lugares',
      currentUrl: academy.logo_url,
    },
    {
      key: 'small',
      label: 'Logo Pequeño',
      size: '32x32px',
      description: 'Para iconos y badges',
      currentUrl: academy.logo_small_url,
    },
    {
      key: 'medium',
      label: 'Logo Mediano',
      size: '128x128px',
      description: 'Para tarjetas y encabezados',
      currentUrl: academy.logo_medium_url,
    },
    {
      key: 'large',
      label: 'Logo Grande',
      size: '512x512px',
      description: 'Para secciones hero y emails',
      currentUrl: academy.logo_large_url,
    },
    {
      key: 'favicon16',
      label: 'Favicon 16x16',
      size: '16x16px',
      description: 'Favicon pequeño para navegadores',
      currentUrl: academy.favicon_16_url,
    },
    {
      key: 'favicon32',
      label: 'Favicon 32x32',
      size: '32x32px',
      description: 'Favicon estándar para navegadores',
      currentUrl: academy.favicon_32_url,
    },
    {
      key: 'appleTouch',
      label: 'Apple Touch Icon',
      size: '180x180px',
      description: 'Icono para iOS home screen',
      currentUrl: academy.apple_touch_icon_url,
    },
  ]

  const handleUrlChange = (type: LogoType, value: string) => {
    setLogos(prev => ({ ...prev, [type]: value }))
    // Update preview if it's a valid URL
    if (value && (value.startsWith('http') || value.startsWith('/'))) {
      setPreviews(prev => ({ ...prev, [type]: value }))
    } else {
      setPreviews(prev => ({ ...prev, [type]: null }))
    }
  }

  const handleFileSelect = (type: LogoType, file: File | null) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(`El archivo debe ser una imagen`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreviews(prev => ({ ...prev, [type]: result }))
      // For now, we'll use the data URL as the URL (in production, upload to Supabase Storage)
      setLogos(prev => ({ ...prev, [type]: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = (type: LogoType) => {
    setLogos(prev => ({ ...prev, [type]: '' }))
    setPreviews(prev => ({ ...prev, [type]: null }))
  }

  const handleMainImageSelect = (file: File | null) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setMainImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerateVersions = async () => {
    if (!mainImageInputRef.current?.files?.[0]) {
      setError('Por favor selecciona una imagen primero')
      return
    }

    const file = mainImageInputRef.current.files[0]
    setIsProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('image', file)

      // Send to API
      const response = await fetch('/api/academy/logos/process', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Error al procesar la imagen')
        setIsProcessing(false)
        return
      }

      // Update all logo fields with generated URLs
      if (data.urls) {
        setLogos({
          main: data.urls.logo_url || '',
          small: data.urls.logo_small_url || '',
          medium: data.urls.logo_medium_url || '',
          large: data.urls.logo_large_url || '',
          favicon16: data.urls.favicon_16_url || '',
          favicon32: data.urls.favicon_32_url || '',
          appleTouch: data.urls.apple_touch_icon_url || '',
        })

        // Update previews
        setPreviews({
          main: data.urls.logo_url || null,
          small: data.urls.logo_small_url || null,
          medium: data.urls.logo_medium_url || null,
          large: data.urls.logo_large_url || null,
          favicon16: data.urls.favicon_16_url || null,
          favicon32: data.urls.favicon_32_url || null,
          appleTouch: data.urls.apple_touch_icon_url || null,
        })

        setSuccess('¡Versiones generadas exitosamente! Revisa los resultados abajo y haz clic en "Guardar Logos" para aplicar los cambios.')
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la imagen')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateAcademy(academy.id, {
        logo_url: logos.main || null,
        logo_small_url: logos.small || null,
        logo_medium_url: logos.medium || null,
        logo_large_url: logos.large || null,
        favicon_16_url: logos.favicon16 || null,
        favicon_32_url: logos.favicon32 || null,
        apple_touch_icon_url: logos.appleTouch || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Logos actualizados exitosamente')
        setTimeout(() => {
          router.refresh()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar logos')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Auto-generate section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Generar Versiones Automáticamente
            </h3>
            <p className="text-sm text-gray-600">
              Sube una imagen principal y el sistema generará automáticamente todas las versiones necesarias (logos, favicons, etc.)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Main image input */}
          <div>
            <input
              ref={mainImageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleMainImageSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => mainImageInputRef.current?.click()}
              className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {mainImagePreview ? 'Cambiar Imagen Principal' : 'Seleccionar Imagen Principal'}
            </button>
          </div>

          {/* Preview */}
          {mainImagePreview && (
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-gray-200">
              <img
                src={mainImagePreview}
                alt="Preview"
                className="max-w-full max-h-48 object-contain"
              />
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerateVersions}
            disabled={!mainImagePreview || isProcessing}
            className="w-full px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generar Todas las Versiones
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Edición Manual:</p>
            <p>También puedes editar manualmente las URLs de cada versión abajo, o subir archivos individuales si prefieres.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logoFields.map((field) => (
          <div key={field.key} className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{field.label}</h4>
                <p className="text-xs text-gray-500">{field.size}</p>
              </div>
              {previews[field.key] && (
                <button
                  type="button"
                  onClick={() => handleRemove(field.key)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-600">{field.description}</p>

            {/* Preview */}
            {previews[field.key] && (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <img
                  src={previews[field.key]!}
                  alt={`${field.label} preview`}
                  className="max-w-full max-h-32 object-contain"
                />
              </div>
            )}

            {/* URL Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                URL de la Imagen
              </label>
              <input
                type="url"
                value={logos[field.key]}
                onChange={(e) => handleUrlChange(field.key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            {/* File Upload */}
            <div>
              <input
                ref={(el) => {
                  fileInputRefs.current[field.key] = el
                }}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(field.key, e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current[field.key]?.click()}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                Subir Archivo
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
          }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check size={18} />
              Guardar Logos
            </>
          )}
        </button>
      </div>
    </div>
  )
}

