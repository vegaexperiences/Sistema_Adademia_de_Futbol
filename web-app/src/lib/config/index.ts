/**
 * Configuration Module Exports
 * 
 * Central export point for all configuration-related functionality
 */

export {
  getClientConfig,
  clearConfigCache,
  getDatabaseConfig,
  getYappyConfig,
  getPagueloFacilConfig,
  getBrevoConfig,
  getApplicationConfig,
  isFeatureEnabled,
  getFeatureFlags,
  validateConfig,
  type ClientConfig,
  type DatabaseConfig,
  type YappyConfig,
  type PagueloFacilConfig,
  type BrevoConfig,
  type ApplicationConfig,
  type FeatureFlags,
} from './client-config';
