'use client'

import { useState, useEffect } from 'react'
import { Settings, CreditCard, Mail, Save, X, AlertCircle, CheckCircle, ExternalLink, Copy, Check, Image, Type } from 'lucide-react'
import { updateAcademySettings, updateAcademy, type Academy } from '@/lib/actions/academies'
import { DomainConfigurationGuide } from './DomainConfigurationGuide'
import { LogoUploader } from './LogoUploader'
import { BrandingConfig } from './BrandingConfig'

interface AcademySettingsFormProps {
  academy: Academy
  onClose: () => void
  onSuccess?: () => void
}

export function AcademySettingsForm({ academy, onClose, onSuccess }: AcademySettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDomainGuide, setShowDomainGuide] = useState(false)
  const [domainStatus, setDomainStatus] = useState<'pending' | 'active' | 'inactive' | null>(academy.domain_status || null)
  const [copied, setCopied] = useState(false)
  const [showLogoUploader, setShowLogoUploader] = useState(false)
  const [showBrandingConfig, setShowBrandingConfig] = useState(false)

  // Payment settings state
  const [yappyEnabled, setYappyEnabled] = useState(false)
  const [yappyMerchantId, setYappyMerchantId] = useState('')
  const [yappySecretKey, setYappySecretKey] = useState('')
  const [yappyDomainUrl, setYappyDomainUrl] = useState('')
  const [yappyEnvironment, setYappyEnvironment] = useState<'production' | 'testing'>('production')

  const [pagueloEnabled, setPagueloEnabled] = useState(false)
  const [pagueloMerchantId, setPagueloMerchantId] = useState('')
  const [pagueloApiKey, setPagueloApiKey] = useState('')
  const [pagueloEnvironment, setPagueloEnvironment] = useState<'production' | 'testing'>('production')

  // Email settings state
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [brevoFromEmail, setBrevoFromEmail] = useState('')
  const [brevoFromName, setBrevoFromName] = useState('')
  const [brevoWebhookSecret, setBrevoWebhookSecret] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')

  // Load existing settings
  useEffect(() => {
    const settings = academy.settings || {}
    const payments = settings.payments || {}
    const email = settings.email || {}

    // Yappy settings
    if (payments.yappy) {
      setYappyEnabled(payments.yappy.enabled || false)
      setYappyMerchantId(payments.yappy.merchant_id || '')
      setYappySecretKey(payments.yappy.secret_key || '')
      setYappyDomainUrl(payments.yappy.domain_url || '')
      setYappyEnvironment(payments.yappy.environment || 'production')
    }

    // PagueloFacil settings
    if (payments.paguelofacil) {
      setPagueloEnabled(payments.paguelofacil.enabled || false)
      setPagueloMerchantId(payments.paguelofacil.merchant_id || '')
      setPagueloApiKey(payments.paguelofacil.api_key || '')
      setPagueloEnvironment(payments.paguelofacil.environment || 'production')
    }

    // Email settings - Brevo
    if (email.brevo_api_key) setBrevoApiKey(email.brevo_api_key)
    if (email.brevo_from_email) setBrevoFromEmail(email.brevo_from_email)
    if (email.brevo_from_name) setBrevoFromName(email.brevo_from_name)
    if (email.brevo_webhook_secret) setBrevoWebhookSecret(email.brevo_webhook_secret)
    // Email settings - SMTP (fallback)
    if (email.smtp_host) setSmtpHost(email.smtp_host)
    if (email.smtp_port) setSmtpPort(email.smtp_port.toString())
    if (email.smtp_user) setSmtpUser(email.smtp_user)
    if (email.smtp_password) setSmtpPassword(email.smtp_password)
    if (email.from_email) setFromEmail(email.from_email)
    if (email.from_name) setFromName(email.from_name)
  }, [academy])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

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
          smtp_host: smtpHost.trim(),
          smtp_port: parseInt(smtpPort) || 587,
          smtp_user: smtpUser.trim(),
          smtp_password: smtpPassword.trim(),
          from_email: fromEmail.trim(),
          from_name: fromName.trim(),
        },
      }

      const result = await updateAcademySettings(academy.id, settings)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Configuración guardada exitosamente')
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Configuración de {academy.name}</h2>
              <p className="text-sm text-gray-600">Configuración de pagos y correo electrónico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
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

          {/* Domain Status Section */}
          {academy.domain && (
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Configuración de Dominio</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDomainGuide(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver Instrucciones
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dominio Personalizado
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono">
                      {academy.domain}
                    </code>
                    {domainStatus === 'pending' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-2">
                        <AlertCircle size={14} />
                        Pendiente
                      </span>
                    )}
                    {domainStatus === 'active' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-2">
                        <CheckCircle size={14} />
                        Activo
                      </span>
                    )}
                    {domainStatus === 'inactive' && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-2">
                        <AlertCircle size={14} />
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
                {domainStatus === 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Acceso Temporal:</p>
                    {(() => {
                      const baseVercelDomain = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
                        ? window.location.hostname.split('.').slice(-3).join('.')
                        : 'sistema-adademia-de-futbol-tura.vercel.app'
                      const tempUrl = `https://${academy.slug}.${baseVercelDomain}`
                      return (
                        <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-blue-200">
                          <code className="flex-1 text-xs font-mono text-gray-900">{tempUrl}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tempUrl)
                              setCopied(true)
                              setTimeout(() => setCopied(false), 2000)
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copiar URL"
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                          <a
                            href={tempUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Abrir"
                          >
                            <ExternalLink className="h-4 w-4 text-gray-600" />
                          </a>
                        </div>
                      )
                    })()}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estado del Dominio
                  </label>
                  <select
                    value={domainStatus || 'pending'}
                    onChange={(e) => setDomainStatus(e.target.value as 'pending' | 'active' | 'inactive')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    onBlur={async () => {
                      // Update domain status when changed
                      const result = await updateAcademy(academy.id, {
                        domain_status: domainStatus,
                        domain_configured_at: domainStatus === 'active' ? new Date().toISOString() : null,
                      })
                      if (result.error) {
                        setError(result.error)
                      } else {
                        setSuccess('Estado del dominio actualizado')
                      }
                    }}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Actualiza el estado cuando hayas configurado el dominio en Vercel
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Branding & Logos Section */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Image className="h-5 w-5 text-pink-600" />
                <h3 className="text-lg font-bold text-gray-900">Branding & Logos</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoUploader(!showLogoUploader)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showLogoUploader ? 'Ocultar' : 'Gestionar Logos'}
              </button>
            </div>
            {showLogoUploader && (
              <LogoUploader
                academy={academy}
              />
            )}
          </div>

          {/* Branding & Personalización Section */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Branding & Personalización</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBrandingConfig(!showBrandingConfig)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showBrandingConfig ? 'Ocultar' : 'Gestionar Branding'}
              </button>
            </div>
            {showBrandingConfig && (
              <BrandingConfig
                academy={academy}
              />
            )}
          </div>

          {/* Yappy Configuration */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Yappy Comercial</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="yappy-enabled"
                  checked={yappyEnabled}
                  onChange={(e) => setYappyEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="yappy-enabled" className="text-sm font-medium text-gray-700">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={yappyEnabled}
                      placeholder="Tu Merchant ID de Yappy"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={yappyEnabled}
                      placeholder="Tu Secret Key de Yappy"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={yappyEnabled}
                      placeholder="tu-dominio.com (sin https://)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ambiente
                    </label>
                    <select
                      value={yappyEnvironment}
                      onChange={(e) => setYappyEnvironment(e.target.value as 'production' | 'testing')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="production">Producción</option>
                      <option value="testing">Pruebas</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* PagueloFacil Configuration */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">Paguelo Fácil</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paguelo-enabled"
                  checked={pagueloEnabled}
                  onChange={(e) => setPagueloEnabled(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="paguelo-enabled" className="text-sm font-medium text-gray-700">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required={pagueloEnabled}
                      placeholder="Tu Código Web (CCLW) de Paguelo Fácil"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required={pagueloEnabled}
                      placeholder="Tu Access Token de Paguelo Fácil"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ambiente
                    </label>
                    <select
                      value={pagueloEnvironment}
                      onChange={(e) => setPagueloEnvironment(e.target.value as 'production' | 'testing')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="production">Producción</option>
                      <option value="testing">Pruebas (Sandbox)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Email Configuration */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Configuración de Correo</h3>
            </div>
            
            {/* Brevo Configuration */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Brevo (Recomendado)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Brevo API Key *
                  </label>
                  <input
                    type="password"
                    value={brevoApiKey}
                    onChange={(e) => setBrevoApiKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="xkeysib-..."
                  />
                  <p className="text-xs text-gray-500 mt-1">API key de tu cuenta de Brevo</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Email (Brevo)
                  </label>
                  <input
                    type="email"
                    value={brevoFromEmail}
                    onChange={(e) => setBrevoFromEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="noreply@ejemplo.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email remitente verificado en Brevo</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Name (Brevo)
                  </label>
                  <input
                    type="text"
                    value={brevoFromName}
                    onChange={(e) => setBrevoFromName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre del Remitente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Webhook Secret
                  </label>
                  <input
                    type="password"
                    value={brevoWebhookSecret}
                    onChange={(e) => setBrevoWebhookSecret(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Secret para validar webhooks"
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional: para validar webhooks de Brevo</p>
                </div>
              </div>
            </div>

            {/* SMTP Configuration (Fallback) */}
            <div>
              <h4 className="text-md font-semibold text-gray-800 mb-4">SMTP (Alternativa)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMTP User
                  </label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMTP Password
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Contraseña SMTP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Email (SMTP)
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="noreply@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Name (SMTP)
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre del Remitente"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <X size={18} />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Save size={18} />
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>

      {/* Domain Configuration Guide */}
      {showDomainGuide && (
        <DomainConfigurationGuide
          academy={academy}
          onClose={() => setShowDomainGuide(false)}
        />
      )}
    </div>
  )
}

