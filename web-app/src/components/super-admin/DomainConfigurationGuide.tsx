'use client'

import { X, ExternalLink, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface DomainConfigurationGuideProps {
  academy: {
    id: string
    name: string
    slug: string
    domain: string | null
    domain_status: 'pending' | 'active' | 'inactive' | null
  }
  onClose: () => void
}

export function DomainConfigurationGuide({ academy, onClose }: DomainConfigurationGuideProps) {
  const [copied, setCopied] = useState(false)
  
  // Get base Vercel domain from environment or use default
  const baseVercelDomain = process.env.NEXT_PUBLIC_APP_URL 
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : 'sistema-adademia-de-futbol-tura.vercel.app'
  
  const temporaryUrl = `https://${academy.slug}.${baseVercelDomain}`
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configuración de Dominio</h2>
            <p className="text-sm text-gray-600 mt-1">{academy.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Estado del Dominio:</span>
            {academy.domain_status === 'pending' && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                Pendiente
              </span>
            )}
            {academy.domain_status === 'active' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-2">
                <CheckCircle size={14} />
                Activo
              </span>
            )}
            {academy.domain_status === 'inactive' && (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-2">
                <AlertCircle size={14} />
                Inactivo
              </span>
            )}
          </div>

          {/* Temporary Access */}
          {academy.domain_status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Acceso Temporal</h3>
              <p className="text-sm text-blue-800 mb-3">
                Mientras configuras el dominio personalizado, puedes acceder a la academia usando:
              </p>
              <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-blue-200">
                <code className="flex-1 text-sm font-mono text-gray-900">{temporaryUrl}</code>
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
            </div>
          )}

          {/* Configuration Steps */}
          {academy.domain && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Pasos para Configurar el Dominio</h3>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Accede a Vercel</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Ve a tu proyecto en Vercel y navega a la sección de dominios.
                      </p>
                      <a
                        href="https://vercel.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Abrir Vercel Dashboard
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Agrega el Dominio</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        En la configuración del proyecto, ve a <strong>Settings → Domains</strong> y agrega:
                      </p>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <code className="flex-1 text-sm font-mono text-gray-900">{academy.domain}</code>
                        <button
                          onClick={() => copyToClipboard(academy.domain!)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copiar dominio"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Configura DNS</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Vercel te mostrará los registros DNS que necesitas configurar. Agrega estos registros en tu proveedor de DNS:
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Nota:</strong> Los cambios de DNS pueden tardar hasta 48 horas en propagarse, aunque generalmente es más rápido.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Verifica la Configuración</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Una vez que Vercel verifique el dominio, actualiza el estado en el sistema marcándolo como "Activo".
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <strong>Tip:</strong> Puedes verificar el estado del dominio en Vercel. Cuando aparezca como "Valid", el dominio está listo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Información Adicional</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>El acceso temporal por slug seguirá funcionando incluso después de configurar el dominio personalizado</li>
              <li>Puedes usar ambos dominios (personalizado y temporal) simultáneamente</li>
              <li>Si tienes problemas con la configuración, contacta al soporte técnico</li>
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

