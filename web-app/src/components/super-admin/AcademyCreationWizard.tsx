'use client'

import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Building2, CreditCard, Mail, Palette, CheckCircle, Loader2, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react'
import { createAcademyWithSettings, type Academy } from '@/lib/actions/academies'

interface AcademyCreationWizardProps {
  onClose: () => void
  onSuccess?: (academyId: string) => void
}

type WizardStep = 'basic' | 'payments' | 'email' | 'branding' | 'review' | 'success'

export function AcademyCreationWizard({ onClose, onSuccess }: AcademyCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdAcademy, setCreatedAcademy] = useState<Academy | null>(null)
  const [copied, setCopied] = useState(false)

  // Basic Information
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [domain, setDomain] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // Payment Settings
  const [yappyEnabled, setYappyEnabled] = useState(false)
  const [yappyMerchantId, setYappyMerchantId] = useState('')
  const [yappySecretKey, setYappySecretKey] = useState('')
  const [yappyDomainUrl, setYappyDomainUrl] = useState('')
  const [yappyEnvironment, setYappyEnvironment] = useState<'production' | 'testing'>('production')

  const [pagueloEnabled, setPagueloEnabled] = useState(false)
  const [pagueloMerchantId, setPagueloMerchantId] = useState('')
  const [pagueloApiKey, setPagueloApiKey] = useState('')
  const [pagueloEnvironment, setPagueloEnvironment] = useState<'production' | 'testing'>('production')

  // Email Settings
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [brevoFromEmail, setBrevoFromEmail] = useState('')
  const [brevoFromName, setBrevoFromName] = useState('')
  const [brevoWebhookSecret, setBrevoWebhookSecret] = useState('')

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#667eea')
  const [secondaryColor, setSecondaryColor] = useState('#764ba2')

  const steps: { key: WizardStep; label: string; icon: any }[] = [
    { key: 'basic', label: 'Información Básica', icon: Building2 },
    { key: 'payments', label: 'Pagos', icon: CreditCard },
    { key: 'email', label: 'Correo', icon: Mail },
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'review', label: 'Revisar', icon: CheckCircle },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const validateStep = (step: WizardStep): boolean => {
    setError(null)
    
    switch (step) {
      case 'basic':
        if (!name.trim()) {
          setError('El nombre de la academia es requerido')
          return false
        }
        if (!slug.trim()) {
          setError('El slug es requerido')
          return false
        }
        if (!/^[a-z0-9-]+$/.test(slug)) {
          setError('El slug solo puede contener letras minúsculas, números y guiones')
          return false
        }
        return true
      
      case 'payments':
        if (yappyEnabled) {
          if (!yappyMerchantId.trim() || !yappySecretKey.trim() || !yappyDomainUrl.trim()) {
            setError('Yappy: Todos los campos son requeridos cuando está habilitado')
            return false
          }
        }
        if (pagueloEnabled) {
          if (!pagueloMerchantId.trim() || !pagueloApiKey.trim()) {
            setError('PagueloFacil: Todos los campos son requeridos cuando está habilitado')
            return false
          }
        }
        return true
      
      case 'email':
        if (!brevoApiKey.trim()) {
          setError('La API key de Brevo es requerida')
          return false
        }
        if (!brevoFromEmail.trim() || !brevoFromEmail.includes('@')) {
          setError('El email remitente de Brevo es requerido y debe ser válido')
          return false
        }
        return true
      
      case 'branding':
        return true // Branding is optional
      
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return
    }

    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key)
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep('review')) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const settings: Record<string, any> = {
        payments: {
          yappy: {
            enabled: yappyEnabled,
            merchant_id: yappyMerchantId.trim(),
            secret_key: yappySecretKey.trim(),
            domain_url: yappyDomainUrl.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
            environment: yappyEnvironment,
          },
          paguelofacil: {
            enabled: pagueloEnabled,
            merchant_id: pagueloMerchantId.trim(),
            api_key: pagueloApiKey.trim(),
            environment: pagueloEnvironment,
          },
        },
        email: {
          brevo_api_key: brevoApiKey.trim(),
          brevo_from_email: brevoFromEmail.trim(),
          brevo_from_name: brevoFromName.trim(),
          brevo_webhook_secret: brevoWebhookSecret.trim(),
        },
      }

      const result = await createAcademyWithSettings({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        domain: domain.trim() || null,
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        settings,
      })

      if (result.error) {
        setError(result.error)
      } else {
        // Store created academy data for success screen
        setCreatedAcademy(result.data!)
        // Move to success step
        setCurrentStep('success')
        onSuccess?.(result.data!.id)
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la academia')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de la Academia *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Suarez Academy"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Slug (Identificador único) *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: suarez"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dominio Personalizado (Opcional)
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: suarez.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL del Logo (Opcional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
        )

      case 'payments':
        return (
          <div className="space-y-6">
            {/* Yappy */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Yappy Comercial</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wizard-yappy-enabled"
                    checked={yappyEnabled}
                    onChange={(e) => setYappyEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="wizard-yappy-enabled" className="text-sm font-medium text-gray-700">
                    Habilitar Yappy
                  </label>
                </div>
                {yappyEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Merchant ID *
                      </label>
                      <input
                        type="text"
                        value={yappyMerchantId}
                        onChange={(e) => setYappyMerchantId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={yappyEnabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Secret Key *
                      </label>
                      <input
                        type="password"
                        value={yappySecretKey}
                        onChange={(e) => setYappySecretKey(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={yappyEnabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Domain URL *
                      </label>
                      <input
                        type="text"
                        value={yappyDomainUrl}
                        onChange={(e) => setYappyDomainUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="tu-dominio.com"
                        required={yappyEnabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ambiente
                      </label>
                      <select
                        value={yappyEnvironment}
                        onChange={(e) => setYappyEnvironment(e.target.value as 'production' | 'testing')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="production">Producción</option>
                        <option value="testing">Pruebas</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PagueloFacil */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Paguelo Fácil</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wizard-paguelo-enabled"
                    checked={pagueloEnabled}
                    onChange={(e) => setPagueloEnabled(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="wizard-paguelo-enabled" className="text-sm font-medium text-gray-700">
                    Habilitar Paguelo Fácil
                  </label>
                </div>
                {pagueloEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Merchant ID (CCLW) *
                      </label>
                      <input
                        type="text"
                        value={pagueloMerchantId}
                        onChange={(e) => setPagueloMerchantId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required={pagueloEnabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        API Key (Access Token) *
                      </label>
                      <input
                        type="password"
                        value={pagueloApiKey}
                        onChange={(e) => setPagueloApiKey(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required={pagueloEnabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ambiente
                      </label>
                      <select
                        value={pagueloEnvironment}
                        onChange={(e) => setPagueloEnvironment(e.target.value as 'production' | 'testing')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="production">Producción</option>
                        <option value="testing">Pruebas (Sandbox)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )

      case 'email':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Cada academia debe tener su propia cuenta de Brevo con su propia API key.
                Esto permite gestionar múltiples remitentes de correo de forma independiente.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Brevo API Key *
              </label>
              <input
                type="password"
                value={brevoApiKey}
                onChange={(e) => setBrevoApiKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="xkeysib-..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">API key de la cuenta de Brevo para esta academia</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Email (Remitente) *
              </label>
              <input
                type="email"
                value={brevoFromEmail}
                onChange={(e) => setBrevoFromEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="noreply@ejemplo.com"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Email remitente verificado en Brevo</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Name (Nombre del Remitente) *
              </label>
              <input
                type="text"
                value={brevoFromName}
                onChange={(e) => setBrevoFromName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Nombre de la Academia"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Webhook Secret (Opcional)
              </label>
              <input
                type="password"
                value={brevoWebhookSecret}
                onChange={(e) => setBrevoWebhookSecret(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Secret para validar webhooks"
              />
              <p className="text-xs text-gray-500 mt-1">Opcional: para validar webhooks de Brevo</p>
            </div>
          </div>
        )

      case 'branding':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Color Primario
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="#667eea"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Color Secundario
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="#764ba2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL del Logo
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen de Configuración</h3>
              
              <div className="border-b border-gray-200 pb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Información Básica</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Nombre:</strong> {name}</p>
                  <p><strong>Slug:</strong> {slug}</p>
                  {domain && <p><strong>Dominio:</strong> {domain}</p>}
                  {logoUrl && <p><strong>Logo:</strong> {logoUrl}</p>}
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Pagos</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Yappy:</strong> {yappyEnabled ? 'Habilitado' : 'Deshabilitado'}</p>
                  <p><strong>PagueloFacil:</strong> {pagueloEnabled ? 'Habilitado' : 'Deshabilitado'}</p>
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Correo</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Brevo API Key:</strong> {brevoApiKey ? '✓ Configurado' : '✗ No configurado'}</p>
                  <p><strong>From Email:</strong> {brevoFromEmail || 'No configurado'}</p>
                  <p><strong>From Name:</strong> {brevoFromName || 'No configurado'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Branding</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <strong>Color Primario:</strong>
                    <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: primaryColor }} />
                    <span>{primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>Color Secundario:</strong>
                    <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: secondaryColor }} />
                    <span>{secondaryColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'success':
        if (!createdAcademy) return null
        
        const baseVercelDomain = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
          ? window.location.hostname.split('.').slice(-3).join('.')
          : 'sistema-adademia-de-futbol-tura.vercel.app'
        const temporaryUrl = `https://${createdAcademy.slug}.${baseVercelDomain}`
        
        const copyToClipboard = (text: string) => {
          navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
        
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Academia Creada Exitosamente!</h3>
              <p className="text-gray-600">{createdAcademy.name} ha sido creada y configurada.</p>
            </div>

            {createdAcademy.domain && createdAcademy.domain_status === 'pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Configuración de Dominio Pendiente</h4>
                </div>
                <p className="text-sm text-blue-800">
                  El dominio <strong>{createdAcademy.domain}</strong> necesita ser configurado en Vercel antes de poder usarse.
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Acceso Temporal:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                      {temporaryUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(temporaryUrl)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copiar URL"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                    <a
                      href={temporaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-600" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Puedes usar esta URL mientras configuras el dominio personalizado en Vercel.
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-900 mb-2">Próximos Pasos:</h5>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>Ve a Vercel → Tu Proyecto → Settings → Domains</li>
                    <li>Agrega el dominio: <strong>{createdAcademy.domain}</strong></li>
                    <li>Configura los registros DNS según las instrucciones de Vercel</li>
                    <li>Espera la verificación (puede tardar hasta 48 horas)</li>
                    <li>Actualiza el estado del dominio a "Activo" en la configuración de la academia</li>
                  </ol>
                </div>
              </div>
            )}

            {!createdAcademy.domain && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Nota:</strong> Puedes acceder a esta academia usando el slug: <code className="bg-white px-2 py-1 rounded">{createdAcademy.slug}</code>
                </p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Crear Nueva Academia</h2>
            <p className="text-sm text-gray-600 mt-1">Configuración completa paso a paso</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStepIndex === index
              const isCompleted = currentStepIndex > index
              
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-between">
          {currentStep === 'success' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle size={18} />
              Finalizar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={currentStepIndex > 0 ? handleBack : onClose}
                className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={18} />
                {currentStepIndex > 0 ? 'Anterior' : 'Cancelar'}
              </button>
              {currentStep === 'review' ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Crear Academia
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  Siguiente
                  <ChevronRight size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

