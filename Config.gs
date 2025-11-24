/**
 * ========================================
 * ARCHIVO: Config.gs
 * DESCRIPCIÓN: Configuraciones del sistema de Academia de Fútbol
 * FUNCIONES: Configuraciones globales, constantes y parámetros del sistema
 * ========================================
 */

/**
 * Configuraciones principales del sistema
 */
const SYSTEM_CONFIG = {
  // Configuraciones financieras
  FINANCIAL: {
    MONTHLY_FEE: 130,           // Costo mensualidad individual
    ENROLLMENT_FEE: 130,        // Costo matrícula
    FAMILY_MONTHLY_FEE: 110.50, // Costo mensualidad familiar (2do en adelante)
    CURRENCY: 'USD',
    DECIMAL_PLACES: 2,
    MONTHLY_FEE_GENERATION_START_DATE: new Date('2026-01-01') // Fecha de inicio para generación de mensualidades
  },
  
  // Configuraciones de categorías
  CATEGORIES: {
    'U-6 M': { minYear: 2021, maxYear: 2020, gender: 'M' },
    'U-8 M': { minYear: 2019, maxYear: 2018, gender: 'M' },
    'U-10 M': { minYear: 2017, maxYear: 2016, gender: 'M' },
    'U-12 M': { minYear: 2015, maxYear: 2014, gender: 'M' },
    'U-14 M': { minYear: 2013, maxYear: 2012, gender: 'M' },
    'U-16 M': { minYear: 2011, maxYear: 2010, gender: 'M' },
    'U-10 F': { minYear: 2017, maxYear: 2016, gender: 'F' },
    'U-12 F': { minYear: 2015, maxYear: 2014, gender: 'F' },
    'U-14 F': { minYear: 2013, maxYear: 2012, gender: 'F' },
    'U-16 F': { minYear: 2011, maxYear: 2010, gender: 'F' },
    'U-18 F': { minYear: 2009, maxYear: 2000, gender: 'F' }
  },
  
  // Estados de jugadores
  PLAYER_STATES: {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    PENDING: 'Pendiente',
    SCHOLARSHIP: 'Becado',
    SUSPENDED: 'Suspendido'
  },
  
  // Tipos de pagos
  PAYMENT_TYPES: {
    MONTHLY: 'Mensualidad',
    ENROLLMENT: 'Matrícula',
    TOURNAMENT: 'Torneo',
    EXPENSE: 'Gasto',
    DISCOUNT: 'Descuento'
  },
  
  // Estados de pagos
  PAYMENT_STATES: {
    PENDING: 'Pendiente',
    PAID: 'Pagado',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado'
  },
  
  // Métodos de pago
  PAYMENT_METHODS: {
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
    CARD: 'Tarjeta',
    CHECK: 'Cheque'
  },
  
  // Configuraciones de formularios
  FORMS: {
    ADMISSION_FORM_ID: '', // Se configurará dinámicamente
    TOURNAMENT_FORM_ID: '', // Se configurará dinámicamente
    MAX_PLAYERS_PER_FORM: 5
  },
  
  // Configuraciones de hojas
  SHEETS: {
    PLAYERS: 'Jugadores',
    PAYMENTS: 'Pagos',
    APPROVALS: 'Aprobaciones',
    CONFIG: 'Configuraciones',
    LOGS: 'Logs',
    FAMILIES: 'Familias',
    TOURNAMENTS: 'Torneos',
    EXPENSES: 'Gastos'
  },
  
  // Configuraciones de UI
  UI: {
    DASHBOARD_WIDTH: 1200,
    DASHBOARD_HEIGHT: 800,
    MODAL_WIDTH: 800,
    MODAL_HEIGHT: 600
  },
  
  // Configuraciones de logs
  LOGS: {
    MAX_LOG_ENTRIES: 1000,
    LOG_RETENTION_DAYS: 30
  }
};

/**
 * Obtiene la configuración financiera actual
 */
function getFinancialConfig() {
  try {
    const properties = PropertiesService.getScriptProperties();
    
    // Obtener valores de PropertiesService
    const monthlyFee = properties.getProperty('MONTHLY_FEE');
    const enrollmentFee = properties.getProperty('ENROLLMENT_FEE');
    const familyMonthlyFee = properties.getProperty('FAMILY_MONTHLY_FEE');
    const currency = properties.getProperty('CURRENCY');
    
    const config = {
      MONTHLY_FEE: monthlyFee ? parseFloat(monthlyFee) : SYSTEM_CONFIG.FINANCIAL.MONTHLY_FEE,
      ENROLLMENT_FEE: enrollmentFee ? parseFloat(enrollmentFee) : SYSTEM_CONFIG.FINANCIAL.ENROLLMENT_FEE,
      FAMILY_MONTHLY_FEE: familyMonthlyFee ? parseFloat(familyMonthlyFee) : SYSTEM_CONFIG.FINANCIAL.FAMILY_MONTHLY_FEE,
      CURRENCY: currency || SYSTEM_CONFIG.FINANCIAL.CURRENCY
    };
    
    Logger.log('Configuración financiera cargada:', config);
    return config;
    
  } catch (error) {
    Logger.log('Error obteniendo configuración financiera: ' + error.toString());
    return SYSTEM_CONFIG.FINANCIAL;
  }
}

/**
 * Obtiene la fecha de inicio para la generación de mensualidades
 * @returns {Date} Fecha de inicio configurada o fecha por defecto (2026-01-01)
 */
function getMonthlyFeeGenerationStartDate() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const startDateStr = properties.getProperty('MONTHLY_FEE_GENERATION_START_DATE');
    
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        Logger.log('Fecha de inicio inválida, usando fecha por defecto');
        return SYSTEM_CONFIG.FINANCIAL.MONTHLY_FEE_GENERATION_START_DATE;
      }
      Logger.log('Fecha de inicio de generación de mensualidades:', startDate.toISOString());
      return startDate;
    }
    
    // Si no existe configuración, retornar fecha por defecto
    Logger.log('Usando fecha de inicio por defecto: 2026-01-01');
    return SYSTEM_CONFIG.FINANCIAL.MONTHLY_FEE_GENERATION_START_DATE;
    
  } catch (error) {
    Logger.log('Error obteniendo fecha de inicio: ' + error.toString());
    return SYSTEM_CONFIG.FINANCIAL.MONTHLY_FEE_GENERATION_START_DATE;
  }
}

/**
 * Obtiene la fecha de inicio para la generación de mensualidades como string ISO
 * (Versión para llamadas desde HTML)
 * @returns {string} Fecha de inicio en formato ISO string (YYYY-MM-DD)
 */
function getMonthlyFeeGenerationStartDateString() {
  try {
    const startDate = getMonthlyFeeGenerationStartDate();
    return startDate.toISOString();
  } catch (error) {
    Logger.log('Error obteniendo fecha de inicio como string: ' + error.toString());
    return SYSTEM_CONFIG.FINANCIAL.MONTHLY_FEE_GENERATION_START_DATE.toISOString();
  }
}

/**
 * Establece la fecha de inicio para la generación de mensualidades
 * @param {string} dateString - Fecha en formato ISO (YYYY-MM-DD) o string de fecha válida
 * @returns {Object} Resultado de la operación
 */
function setMonthlyFeeGenerationStartDate(dateString) {
  try {
    if (!dateString) {
      throw new Error('Se requiere una fecha válida');
    }
    
    const startDate = new Date(dateString);
    if (isNaN(startDate.getTime())) {
      throw new Error('Formato de fecha inválido. Use formato YYYY-MM-DD');
    }
    
    // Validar que la fecha sea en el futuro (opcional, pero recomendado)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToSet = new Date(startDate);
    dateToSet.setHours(0, 0, 0, 0);
    
    if (dateToSet < today) {
      Logger.log('Advertencia: La fecha de inicio está en el pasado. Permitiendo configuración de todas formas.');
    }
    
    // Guardar en PropertiesService
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('MONTHLY_FEE_GENERATION_START_DATE', startDate.toISOString());
    
    // También guardar en hoja de configuración como backup
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.CONFIG);
    
    if (!configSheet) {
      configSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.CONFIG);
      configSheet.getRange(1, 1, 1, 2).setValues([['Configuración', 'Valor']]);
    }
    
    // Buscar y actualizar o agregar fila
    const data = configSheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[0] === 'MONTHLY_FEE_GENERATION_START_DATE');
    
    if (rowIndex >= 0) {
      configSheet.getRange(rowIndex + 1, 2).setValue(startDate.toISOString());
    } else {
      configSheet.appendRow(['MONTHLY_FEE_GENERATION_START_DATE', startDate.toISOString()]);
    }
    
    Logger.log('✅ Fecha de inicio de generación de mensualidades actualizada:', startDate.toISOString());
    return {
      success: true,
      message: 'Fecha de inicio actualizada exitosamente',
      startDate: startDate.toISOString()
    };
    
  } catch (error) {
    Logger.log('❌ Error estableciendo fecha de inicio: ' + error.toString());
    throw error;
  }
}

/**
 * Actualiza la configuración financiera
 */
function updateFinancialConfig(newConfig) {
  try {
    // Validar configuración
    if (!newConfig || typeof newConfig !== 'object') {
      throw new Error('Configuración inválida');
    }
    
    if (newConfig.monthlyFee < 0 || newConfig.enrollmentFee < 0 || newConfig.familyMonthlyFee < 0) {
      throw new Error('Los valores no pueden ser negativos');
    }
    
    if (newConfig.familyMonthlyFee >= newConfig.monthlyFee) {
      throw new Error('La mensualidad familiar debe ser menor que la mensualidad individual');
    }
    
    // Guardar en PropertiesService (método principal)
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'MONTHLY_FEE': newConfig.monthlyFee.toString(),
      'ENROLLMENT_FEE': newConfig.enrollmentFee.toString(),
      'FAMILY_MONTHLY_FEE': newConfig.familyMonthlyFee.toString(),
      'CURRENCY': newConfig.currency
    });
    
    // También guardar en hoja de configuración como backup
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.CONFIG);
    
    if (!configSheet) {
      configSheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.CONFIG);
      configSheet.getRange(1, 1, 1, 2).setValues([['Configuración', 'Valor']]);
    }
    
    const configData = [
      ['MONTHLY_FEE', newConfig.monthlyFee],
      ['ENROLLMENT_FEE', newConfig.enrollmentFee],
      ['FAMILY_MONTHLY_FEE', newConfig.familyMonthlyFee],
      ['CURRENCY', newConfig.currency]
    ];
    
    // Limpiar hoja y escribir nueva configuración
    configSheet.clear();
    configSheet.getRange(1, 1, 1, 2).setValues([['Configuración', 'Valor']]);
    configSheet.getRange(2, 1, configData.length, 2).setValues(configData);
    
    Logger.log('✅ Configuración financiera actualizada exitosamente:', newConfig);
    return { success: true, message: 'Configuración financiera actualizada exitosamente' };
    
  } catch (error) {
    Logger.log('❌ Error actualizando configuración financiera: ' + error.toString());
    throw error;
  }
}

/**
 * Obtiene la categoría de un jugador basada en su edad y género
 */
function getPlayerCategory(birthYear, gender) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  for (const [category, config] of Object.entries(SYSTEM_CONFIG.CATEGORIES)) {
    if (config.gender === gender.toUpperCase()) {
      const minAge = currentYear - config.maxYear;
      const maxAge = currentYear - config.minYear;
      
      if (age >= minAge && age <= maxAge) {
        return category;
      }
    }
  }
  
  return 'U-18 F'; // Categoría por defecto
}

/**
 * Obtiene todas las categorías disponibles
 */
function getAllCategories() {
  return Object.keys(SYSTEM_CONFIG.CATEGORIES);
}

/**
 * Obtiene los estados de jugadores disponibles
 */
function getPlayerStates() {
  return Object.values(SYSTEM_CONFIG.PLAYER_STATES);
}

/**
 * Obtiene los tipos de pago disponibles
 */
function getPaymentTypes() {
  return Object.values(SYSTEM_CONFIG.PAYMENT_TYPES);
}

/**
 * Obtiene los métodos de pago disponibles
 */
function getPaymentMethods() {
  return Object.values(SYSTEM_CONFIG.PAYMENT_METHODS);
}

/**
 * Valida si una configuración es válida
 */
function validateConfig(config) {
  const errors = [];
  
  if (config.monthlyFee && (config.monthlyFee < 0 || config.monthlyFee > 1000)) {
    errors.push('La mensualidad debe estar entre 0 y 1000');
  }
  
  if (config.enrollmentFee && (config.enrollmentFee < 0 || config.enrollmentFee > 1000)) {
    errors.push('La matrícula debe estar entre 0 y 1000');
  }
  
  if (config.familyMonthlyFee && (config.familyMonthlyFee < 0 || config.familyMonthlyFee > 1000)) {
    errors.push('La mensualidad familiar debe estar entre 0 y 1000');
  }
  
  if (config.familyMonthlyFee && config.monthlyFee && config.familyMonthlyFee >= config.monthlyFee) {
    errors.push('La mensualidad familiar debe ser menor que la mensualidad individual');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Obtiene la configuración de formularios
 */
function getFormsConfig() {
  try {
    const properties = PropertiesService.getScriptProperties();

    // Obtener valores de PropertiesService
    const admissionFormId = properties.getProperty('ADMISSION_FORM_ID');
    const tournamentFormId = properties.getProperty('TOURNAMENT_FORM_ID');

    const config = {
      ADMISSION_FORM_ID: admissionFormId || SYSTEM_CONFIG.FORMS.ADMISSION_FORM_ID,
      TOURNAMENT_FORM_ID: tournamentFormId || SYSTEM_CONFIG.FORMS.TOURNAMENT_FORM_ID,
      ADMISSION_SHEET_NAME: 'FORM_MATRICULA',
      TOURNAMENT_SHEET_NAME: 'FORM_TORNEO'
    };

    Logger.log('Configuración de formularios cargada:', config);
    return config;

  } catch (error) {
    Logger.log('Error obteniendo configuración de formularios: ' + error.toString());
    return {
      ...SYSTEM_CONFIG.FORMS,
      ADMISSION_SHEET_NAME: 'FORM_MATRICULA',
      TOURNAMENT_SHEET_NAME: 'FORM_TORNEO'
    };
  }
}

/**
 * Actualiza la configuración de formularios
 */
function updateFormsConfig(admissionFormId, tournamentFormId) {
  try {
    // Validar IDs de formularios
    if (admissionFormId && admissionFormId.length !== 44) {
      throw new Error('El ID del formulario de admisión debe tener 44 caracteres');
    }
    
    if (tournamentFormId && tournamentFormId.length !== 44) {
      throw new Error('El ID del formulario de torneos debe tener 44 caracteres');
    }
    
    // Actualizar configuración
    SYSTEM_CONFIG.FORMS.ADMISSION_FORM_ID = admissionFormId || '';
    SYSTEM_CONFIG.FORMS.TOURNAMENT_FORM_ID = tournamentFormId || '';
    
    // Guardar en PropertiesService
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'ADMISSION_FORM_ID': admissionFormId || '',
      'TOURNAMENT_FORM_ID': tournamentFormId || ''
    });
    
    Logger.log('Configuración de formularios actualizada:', { admissionFormId, tournamentFormId });
    return { success: true, message: 'Configuración de formularios actualizada exitosamente' };
    
  } catch (error) {
    Logger.log('Error actualizando configuración de formularios: ' + error.toString());
    throw error;
  }
}

/**
 * Inicializa las configuraciones por defecto en PropertiesService
 */
function initializeDefaultConfig() {
  try {
    const properties = PropertiesService.getScriptProperties();

    // Verificar si ya existen configuraciones
    const existingConfig = properties.getProperties();

    if (Object.keys(existingConfig).length === 0) {
      Logger.log('Inicializando configuraciones por defecto...');

      // Configuración financiera por defecto
      properties.setProperties({
        'MONTHLY_FEE': SYSTEM_CONFIG.FINANCIAL.MONTHLY_FEE.toString(),
        'ENROLLMENT_FEE': SYSTEM_CONFIG.FINANCIAL.ENROLLMENT_FEE.toString(),
        'FAMILY_MONTHLY_FEE': SYSTEM_CONFIG.FINANCIAL.FAMILY_MONTHLY_FEE.toString(),
        'CURRENCY': SYSTEM_CONFIG.FINANCIAL.CURRENCY,
        'ADMISSION_FORM_ID': SYSTEM_CONFIG.FORMS.ADMISSION_FORM_ID,
        'TOURNAMENT_FORM_ID': SYSTEM_CONFIG.FORMS.TOURNAMENT_FORM_ID,
        // Configuración del logo
        'LOGO_ACADEMY_NAME': 'SUAREZ',
        'LOGO_ACADEMY_SUBTITLE': 'ACADEMY',
        'LOGO_ACADEMY_YEAR': '2018',
        'LOGO_PRIMARY_COLOR': '#1e3a8a',
        'LOGO_SECONDARY_COLOR': '#3b82f6',
        'LOGO_ACCENT_COLOR': '#fbbf24'
      });

      Logger.log('Configuraciones por defecto inicializadas');
    }

    return true;

  } catch (error) {
    Logger.log('Error inicializando configuraciones por defecto: ' + error.toString());
    return false;
  }
}

/**
 * Obtiene la configuración del logo
 */
function getLogoConfig() {
  try {
    const properties = PropertiesService.getScriptProperties();

    const config = {
      academyName: properties.getProperty('LOGO_ACADEMY_NAME') || 'SUAREZ',
      academySubtitle: properties.getProperty('LOGO_ACADEMY_SUBTITLE') || 'ACADEMY',
      academyYear: properties.getProperty('LOGO_ACADEMY_YEAR') || '2018',
      primaryColor: properties.getProperty('LOGO_PRIMARY_COLOR') || '#1e3a8a',
      secondaryColor: properties.getProperty('LOGO_SECONDARY_COLOR') || '#3b82f6',
      accentColor: properties.getProperty('LOGO_ACCENT_COLOR') || '#fbbf24'
    };

    Logger.log('Configuración del logo cargada:', config);
    return config;

  } catch (error) {
    Logger.log('Error obteniendo configuración del logo: ' + error.toString());
    return {
      academyName: 'SUAREZ',
      academySubtitle: 'ACADEMY',
      academyYear: '2018',
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      accentColor: '#fbbf24'
    };
  }
}

/**
 * Actualiza la configuración del logo
 */
function updateLogoConfig(config) {
  try {
    // Validar configuración
    if (!config.academyName || !config.academySubtitle || !config.academyYear) {
      throw new Error('Nombre de academia, subtítulo y año son requeridos');
    }

    // Validar colores (formato hexadecimal)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(config.primaryColor) || 
        !colorRegex.test(config.secondaryColor) || 
        !colorRegex.test(config.accentColor)) {
      throw new Error('Los colores deben estar en formato hexadecimal válido (#RRGGBB)');
    }

    // Guardar en PropertiesService
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'LOGO_ACADEMY_NAME': config.academyName,
      'LOGO_ACADEMY_SUBTITLE': config.academySubtitle,
      'LOGO_ACADEMY_YEAR': config.academyYear,
      'LOGO_PRIMARY_COLOR': config.primaryColor,
      'LOGO_SECONDARY_COLOR': config.secondaryColor,
      'LOGO_ACCENT_COLOR': config.accentColor
    });

    console.log('Configuración del logo actualizada:', config);
    return { success: true, message: 'Configuración del logo actualizada exitosamente' };

  } catch (error) {
    console.error('Error actualizando configuración del logo:', error);
    throw error;
  }
}

/**
 * Guarda un logo personalizado subido por el usuario
 */
function saveCustomLogo(logoData) {
  try {
    if (!logoData || !logoData.data) {
      throw new Error('No se proporcionaron datos del logo');
    }

    // Guardar en PropertiesService
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('CUSTOM_LOGO_DATA', logoData.data);
    properties.setProperty('CUSTOM_LOGO_TYPE', logoData.type || 'image/png');
    properties.setProperty('CUSTOM_LOGO_NAME', logoData.name || 'custom_logo.png');

    Logger.log('Logo personalizado guardado exitosamente');
    return { success: true, message: 'Logo personalizado guardado exitosamente' };

  } catch (error) {
    Logger.log('Error guardando logo personalizado: ' + error.toString());
    return { success: false, message: 'Error guardando logo: ' + error.toString() };
  }
}

/**
 * Obtiene el logo personalizado guardado
 */
function getCustomLogo() {
  try {
    const properties = PropertiesService.getScriptProperties();
    
    const logoData = properties.getProperty('CUSTOM_LOGO_DATA');
    const logoType = properties.getProperty('CUSTOM_LOGO_TYPE');
    const logoName = properties.getProperty('CUSTOM_LOGO_NAME');

    if (!logoData) {
      return { success: false, message: 'No hay logo personalizado guardado' };
    }

    return {
      success: true,
      data: logoData,
      type: logoType || 'image/png',
      name: logoName || 'custom_logo.png'
    };

  } catch (error) {
    Logger.log('Error obteniendo logo personalizado: ' + error.toString());
    return { success: false, message: 'Error obteniendo logo: ' + error.toString() };
  }
}

/**
 * Elimina el logo personalizado
 */
function deleteCustomLogo() {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('CUSTOM_LOGO_DATA');
    properties.deleteProperty('CUSTOM_LOGO_TYPE');
    properties.deleteProperty('CUSTOM_LOGO_NAME');

    Logger.log('Logo personalizado eliminado exitosamente');
    return { success: true, message: 'Logo personalizado eliminado exitosamente' };

  } catch (error) {
    Logger.log('Error eliminando logo personalizado: ' + error.toString());
    return { success: false, message: 'Error eliminando logo: ' + error.toString() };
  }
}

/**
 * Obtiene la configuración completa del sistema
 */
function getSystemConfig() {
  return {
    financial: getFinancialConfig(),
    categories: SYSTEM_CONFIG.CATEGORIES,
    playerStates: SYSTEM_CONFIG.PLAYER_STATES,
    paymentTypes: SYSTEM_CONFIG.PAYMENT_TYPES,
    paymentStates: SYSTEM_CONFIG.PAYMENT_STATES,
    paymentMethods: SYSTEM_CONFIG.PAYMENT_METHODS,
    forms: getFormsConfig(),
    sheets: SYSTEM_CONFIG.SHEETS,
    ui: SYSTEM_CONFIG.UI
  };
}

/**
 * FUNCIÓN DE PRUEBA PARA VERIFICAR CONFIGURACIONES
 */
function testConfigurationSystem() {
  try {
    Logger.log('=== PROBANDO SISTEMA DE CONFIGURACIONES ===');
    
    // 1. Obtener configuración actual
    const currentConfig = getFinancialConfig();
    Logger.log('📊 Configuración actual:', currentConfig);
    
    // 2. Probar actualización
    const testConfig = {
      monthlyFee: 80,
      enrollmentFee: 80,
      familyMonthlyFee: 70,
      currency: 'USD'
    };
    
    Logger.log('🧪 Probando actualización con:', testConfig);
    const updateResult = updateFinancialConfig(testConfig);
    Logger.log('✅ Resultado de actualización:', updateResult);
    
    // 3. Verificar que se guardó
    const newConfig = getFinancialConfig();
    Logger.log('📊 Nueva configuración:', newConfig);
    
    // 4. Restaurar configuración original
    const originalConfig = {
      monthlyFee: 130,
      enrollmentFee: 130,
      familyMonthlyFee: 110.50,
      currency: 'USD'
    };
    
    Logger.log('🔄 Restaurando configuración original:', originalConfig);
    updateFinancialConfig(originalConfig);
    
    const finalConfig = getFinancialConfig();
    Logger.log('📊 Configuración final:', finalConfig);
    
    return {
      success: true,
      message: 'Sistema de configuraciones funcionando correctamente',
      testResults: {
        original: currentConfig,
        test: newConfig,
        restored: finalConfig
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error probando sistema de configuraciones: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Actualiza la configuración de formularios
 */
function updateFormsConfig(admissionFormId, tournamentFormId) {
  try {
    // Validar IDs de formularios
    if (admissionFormId && admissionFormId.length !== 44) {
      throw new Error('El ID del formulario de admisión debe tener 44 caracteres');
    }
    
    if (tournamentFormId && tournamentFormId.length !== 44) {
      throw new Error('El ID del formulario de torneos debe tener 44 caracteres');
    }
    
    // Actualizar configuración
    SYSTEM_CONFIG.FORMS.ADMISSION_FORM_ID = admissionFormId || '';
    SYSTEM_CONFIG.FORMS.TOURNAMENT_FORM_ID = tournamentFormId || '';
    
    // Guardar en PropertiesService
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'ADMISSION_FORM_ID': admissionFormId || '',
      'TOURNAMENT_FORM_ID': tournamentFormId || ''
    });
    
    console.log('Configuración de formularios actualizada:', { admissionFormId, tournamentFormId });
    return { success: true, message: 'Configuración de formularios actualizada exitosamente' };
    
  } catch (error) {
    console.error('Error actualizando configuración de formularios:', error);
    throw error;
  }
}
