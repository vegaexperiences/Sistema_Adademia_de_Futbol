/**
 * Academy Payment Configuration Utilities
 * Handles loading payment provider configurations from academy settings
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentAcademyId } from '@/lib/supabase/server'

export interface YappyPaymentConfig {
  enabled: boolean
  merchant_id: string
  secret_key: string
  domain_url: string
  environment: 'production' | 'testing'
}

export interface PagueloFacilPaymentConfig {
  enabled: boolean
  merchant_id: string
  api_key: string
  environment: 'production' | 'testing'
}

export interface AcademyPaymentConfigs {
  yappy?: YappyPaymentConfig
  paguelofacil?: PagueloFacilPaymentConfig
}

/**
 * Get payment configuration for a specific academy
 * Falls back to environment variables if academy config not found
 */
export async function getAcademyPaymentConfig(
  academyId?: string | null
): Promise<AcademyPaymentConfigs> {
  const configs: AcademyPaymentConfigs = {}

  // Get academy ID if not provided
  if (!academyId) {
    academyId = await getCurrentAcademyId()
  }

  if (!academyId) {
    // No academy context, return empty configs (will fallback to env vars)
    return configs
  }

  // Fetch academy with settings
  const supabase = await createClient()
  const { data: academy, error } = await supabase
    .from('academies')
    .select('settings')
    .eq('id', academyId)
    .single()

  if (error || !academy) {
    console.warn(`[AcademyPayments] Could not load academy ${academyId}, will use env vars`)
    return configs
  }

  const settings = academy.settings || {}
  const payments = settings.payments || {}

  // Load Yappy config
  if (payments.yappy) {
    const yappyConfig = payments.yappy
    if (yappyConfig.enabled && yappyConfig.merchant_id && yappyConfig.secret_key) {
      configs.yappy = {
        enabled: yappyConfig.enabled,
        merchant_id: yappyConfig.merchant_id.trim().replace(/[\r\n\t]/g, ''),
        secret_key: yappyConfig.secret_key.trim().replace(/[\r\n\t]/g, ''),
        domain_url: yappyConfig.domain_url?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
        environment: yappyConfig.environment || 'production',
      }
    }
  }

  // Load PagueloFacil config
  if (payments.paguelofacil) {
    const pagueloConfig = payments.paguelofacil
    if (pagueloConfig.enabled && pagueloConfig.merchant_id && pagueloConfig.api_key) {
      configs.paguelofacil = {
        enabled: pagueloConfig.enabled,
        merchant_id: pagueloConfig.merchant_id.trim().replace(/[\r\n\t]/g, ''),
        api_key: pagueloConfig.api_key.trim().replace(/[\r\n\t]/g, ''),
        environment: pagueloConfig.environment || 'production',
      }
    }
  }

  return configs
}

/**
 * Get Yappy configuration for academy, with fallback to environment variables
 */
export async function getYappyConfig(academyId?: string | null): Promise<YappyPaymentConfig | null> {
  const configs = await getAcademyPaymentConfig(academyId)

  if (configs.yappy) {
    return configs.yappy
  }

  // Fallback to environment variables
  const rawMerchantId = process.env.YAPPY_MERCHANT_ID || ''
  const rawSecretKey = process.env.YAPPY_SECRET_KEY || ''
  const merchantId = rawMerchantId.trim().replace(/[\r\n\t]/g, '')
  const secretKey = rawSecretKey.trim().replace(/[\r\n\t]/g, '')
  let domainUrl = process.env.YAPPY_DOMAIN_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  domainUrl = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
  const environment = (process.env.YAPPY_ENVIRONMENT || 'production') as 'production' | 'testing'

  if (!merchantId || !secretKey || !domainUrl) {
    return null
  }

  return {
    enabled: true,
    merchant_id: merchantId,
    secret_key: secretKey,
    domain_url: domainUrl,
    environment,
  }
}

/**
 * Get PagueloFacil configuration for academy, with fallback to environment variables
 */
export async function getPagueloFacilConfig(academyId?: string | null): Promise<PagueloFacilPaymentConfig | null> {
  const configs = await getAcademyPaymentConfig(academyId)

  if (configs.paguelofacil) {
    return configs.paguelofacil
  }

  // Fallback to environment variables
  const rawMerchantId = process.env.PAGUELOFACIL_MERCHANT_ID || ''
  const rawApiKey = process.env.PAGUELOFACIL_API_KEY || ''
  const merchantId = rawMerchantId.trim().replace(/[\r\n\t]/g, '')
  const apiKey = rawApiKey.trim().replace(/[\r\n\t]/g, '')
  const environment = (process.env.PAGUELOFACIL_ENVIRONMENT || 'production') as 'production' | 'testing'

  if (!merchantId || !apiKey) {
    return null
  }

  return {
    enabled: true,
    merchant_id: merchantId,
    api_key: apiKey,
    environment,
  }
}

/**
 * Validate payment configuration structure
 */
export function validatePaymentConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config) {
    errors.push('Configuration is required')
    return { valid: false, errors }
  }

  if (config.yappy) {
    if (config.yappy.enabled && !config.yappy.merchant_id) {
      errors.push('Yappy merchant_id is required when enabled')
    }
    if (config.yappy.enabled && !config.yappy.secret_key) {
      errors.push('Yappy secret_key is required when enabled')
    }
    if (config.yappy.enabled && !config.yappy.domain_url) {
      errors.push('Yappy domain_url is required when enabled')
    }
  }

  if (config.paguelofacil) {
    if (config.paguelofacil.enabled && !config.paguelofacil.merchant_id) {
      errors.push('PagueloFacil merchant_id is required when enabled')
    }
    if (config.paguelofacil.enabled && !config.paguelofacil.api_key) {
      errors.push('PagueloFacil api_key is required when enabled')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

