/**
 * ========================================
 * ARCHIVO: Triggers.gs
 * DESCRIPCIÓN: Configuración y manejo de triggers automáticos
 * FUNCIONES: Creación, eliminación y gestión de triggers del sistema
 * ========================================
 */

/**
 * Verifica si se tienen permisos para acceder a triggers
 */
function hasTriggerPermissions() {
  try {
    ScriptApp.getProjectTriggers();
    return true;
  } catch (error) {
    if (error.toString().includes('script.scriptapp')) {
      Logger.log('Advertencia: Permisos insuficientes para acceder a triggers');
      return false;
    }
    throw error;
  }
}

/**
 * Configura todos los triggers del sistema
 */
function setupAllTriggers() {
  try {
    Logger.log('Configurando triggers del sistema...');
    
    // Eliminar triggers existentes para evitar duplicados
    deleteAllTriggers();
    
    // Crear triggers necesarios
    createFormProcessingTrigger();
    createDailySyncTrigger();
    createMonthlyPaymentsTrigger();
    createDataValidationTrigger();
    createTournamentExpirationTrigger();
    
    Logger.log('Triggers configurados exitosamente');
    return true;
    
  } catch (error) {
    Logger.log('Error configurando triggers: ' + error.toString());
    return false;
  }
}

/**
 * Elimina todos los triggers existentes
 */
function deleteAllTriggers() {
  try {
    // Verificar permisos antes de acceder a triggers
    if (!hasTriggerPermissions()) {
      Logger.log('Advertencia: No se tienen permisos para acceder a triggers. Saltando eliminación.');
      return;
    }
    
    const triggers = ScriptApp.getProjectTriggers();
    
    triggers.forEach(trigger => {
      const functionName = trigger.getHandlerFunction();
      
      // Solo eliminar triggers del sistema (no los del usuario)
      if (functionName.includes('FormSubmit') || 
          functionName.includes('DailySync') ||
          functionName.includes('MonthlyPayments') ||
          functionName.includes('DataValidation') ||
          functionName.includes('processFormSubmission') ||
          functionName.includes('dailySync') ||
          functionName.includes('generateMonthlyPaymentsIfNeeded') ||
          functionName.includes('validateDataIntegrity')) {
        
        ScriptApp.deleteTrigger(trigger);
        Logger.log(`Trigger eliminado: ${functionName}`);
      }
    });
    
  } catch (error) {
    Logger.log('Error eliminando triggers: ' + error.toString());
  }
}

/**
 * Crea trigger para procesamiento de formularios
 */
function createFormProcessingTrigger() {
  try {
    // Trigger que se ejecuta cada 5 minutos para procesar formularios
    ScriptApp.newTrigger('processFormSubmission')
      .timeBased()
      .everyMinutes(5)
      .create();
    
    Logger.log('Trigger de procesamiento de formularios creado');
    
  } catch (error) {
    Logger.log('Error creando trigger de formularios: ' + error.toString());
  }
}

/**
 * Crea trigger para sincronización diaria
 */
function createDailySyncTrigger() {
  try {
    // Trigger que se ejecuta diariamente a las 6:00 AM
    ScriptApp.newTrigger('dailySync')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();
    
    Logger.log('Trigger de sincronización diaria creado');
    
  } catch (error) {
    Logger.log('Error creando trigger de sincronización diaria: ' + error.toString());
  }
}

/**
 * Crea trigger para generación de pagos mensuales
 */
function createMonthlyPaymentsTrigger() {
  try {
    // Trigger que se ejecuta el día 1 de cada mes a las 8:00 AM
    ScriptApp.newTrigger('processMonthlyBilling')
      .timeBased()
      .everyDays(1)
      .atHour(8)
      .create();
    
    Logger.log('Trigger de cobro mensual automático creado');
    
  } catch (error) {
    Logger.log('Error creando trigger de cobro mensual: ' + error.toString());
  }
}

/**
 * Crea trigger para validación de datos
 */
function createDataValidationTrigger() {
  try {
    // Trigger que se ejecuta semanalmente los domingos a las 10:00 AM
    ScriptApp.newTrigger('weeklyDataValidation')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.SUNDAY)
      .atHour(10)
      .create();
    
    Logger.log('Trigger de validación de datos creado');
    
  } catch (error) {
    Logger.log('Error creando trigger de validación: ' + error.toString());
  }
}

/**
 * Validación semanal de datos
 */
function weeklyDataValidation() {
  try {
    Logger.log('Iniciando validación semanal de datos...');
    
    const integrityCheck = validateDataIntegrity();
    
    if (integrityCheck) {
      if (integrityCheck.isValid) {
        Logger.log('Validación de datos exitosa - No se encontraron problemas');
      } else {
        const errorCount = integrityCheck.issues.filter(i => i.type === 'error').length;
        const warningCount = integrityCheck.issues.filter(i => i.type === 'warning').length;
        
        Logger.log(`Validación completada: ${errorCount} errores, ${warningCount} advertencias`);
        
        // Log de problemas encontrados
        integrityCheck.issues.forEach(issue => {
          Logger.log(`${issue.type.toUpperCase()}: ${issue.message}`);
        });
      }
    }
    
    // Limpiar logs antiguos semanalmente
    cleanOldLogs();
    
    Logger.log('Validación semanal completada');
    
  } catch (error) {
    Logger.log('Error en validación semanal: ' + error.toString());
  }
}

/**
 * Crea trigger para respaldo de datos
 */
function createBackupTrigger() {
  try {
    // Trigger que se ejecuta mensualmente el día 15 a las 2:00 AM
    ScriptApp.newTrigger('monthlyBackup')
      .timeBased()
      .everyDays(1)
      .atHour(2)
      .create();
    
    Logger.log('Trigger de respaldo mensual creado');
    
  } catch (error) {
    Logger.log('Error creando trigger de respaldo: ' + error.toString());
  }
}

/**
 * Respaldo mensual de datos
 */
function monthlyBackup() {
  try {
    Logger.log('Iniciando respaldo mensual...');
    
    const currentDate = new Date();
    
    // Solo ejecutar el día 15 del mes
    if (currentDate.getDate() !== 15) {
      return;
    }
    
    // Exportar todos los datos
    const exportResult = exportAllData();
    
    if (exportResult) {
      Logger.log('Respaldo mensual completado exitosamente');
    } else {
      Logger.log('Error en respaldo mensual');
    }
    
  } catch (error) {
    Logger.log('Error en respaldo mensual: ' + error.toString());
  }
}

/**
 * Crea trigger personalizado
 */
function createCustomTrigger(functionName, triggerType, frequency, options = {}) {
  try {
    let trigger;
    
    switch (triggerType) {
      case 'time':
        trigger = ScriptApp.newTrigger(functionName).timeBased();
        
        switch (frequency) {
          case 'minutes':
            trigger.everyMinutes(options.interval || 5);
            break;
          case 'hours':
            trigger.everyHours(options.interval || 1);
            break;
          case 'days':
            trigger.everyDays(options.interval || 1);
            if (options.hour !== undefined) {
              trigger.atHour(options.hour);
            }
            break;
          case 'weeks':
            trigger.everyWeeks(options.interval || 1);
            if (options.weekDay !== undefined) {
              trigger.onWeekDay(options.weekDay);
            }
            if (options.hour !== undefined) {
              trigger.atHour(options.hour);
            }
            break;
          default:
            throw new Error('Frecuencia no válida para trigger de tiempo');
        }
        break;
        
      case 'form':
        if (!options.formId) {
          throw new Error('Se requiere formId para trigger de formulario');
        }
        trigger = ScriptApp.newTrigger(functionName)
          .for(FormApp.openById(options.formId))
          .onFormSubmit();
        break;
        
      case 'sheet':
        if (!options.sheetId) {
          throw new Error('Se requiere sheetId para trigger de hoja');
        }
        trigger = ScriptApp.newTrigger(functionName)
          .for(SpreadsheetApp.openById(options.sheetId))
          .onEdit();
        break;
        
      default:
        throw new Error('Tipo de trigger no válido');
    }
    
    const createdTrigger = trigger.create();
    Logger.log(`Trigger personalizado creado: ${functionName} (${triggerType})`);
    
    return createdTrigger;
    
  } catch (error) {
    Logger.log('Error creando trigger personalizado: ' + error.toString());
    return null;
  }
}

/**
 * Elimina un trigger específico
 */
function deleteTrigger(triggerId) {
  try {
    if (!hasTriggerPermissions()) {
      Logger.log('Advertencia: No se tienen permisos para acceder a triggers');
      return false;
    }
    
    const triggers = ScriptApp.getProjectTriggers();
    const trigger = triggers.find(t => t.getUniqueId() === triggerId);
    
    if (trigger) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log(`Trigger eliminado: ${triggerId}`);
      return true;
    } else {
      Logger.log(`Trigger no encontrado: ${triggerId}`);
      return false;
    }
    
  } catch (error) {
    Logger.log('Error eliminando trigger: ' + error.toString());
    return false;
  }
}

/**
 * Obtiene información de todos los triggers
 */
function getTriggersInfo() {
  try {
    if (!hasTriggerPermissions()) {
      Logger.log('Advertencia: No se tienen permisos para acceder a triggers');
      return [];
    }
    
    const triggers = ScriptApp.getProjectTriggers();
    
    return triggers.map(trigger => ({
      id: trigger.getUniqueId(),
      functionName: trigger.getHandlerFunction(),
      eventType: trigger.getEventType().toString(),
      source: trigger.getTriggerSource().toString(),
      created: trigger.getCreatedDate()
    }));
    
  } catch (error) {
    Logger.log('Error obteniendo información de triggers: ' + error.toString());
    return [];
  }
}

/**
 * Verifica el estado de los triggers del sistema
 */
function checkTriggersStatus() {
  try {
    const triggers = getTriggersInfo();
    const systemTriggers = [
      'processFormSubmission',
      'dailySync',
      'generateMonthlyPaymentsIfNeeded',
      'weeklyDataValidation'
    ];
    
    const status = {
      total: triggers.length,
      system: 0,
      custom: 0,
      missing: [],
      details: triggers
    };
    
    triggers.forEach(trigger => {
      if (systemTriggers.includes(trigger.functionName)) {
        status.system++;
      } else {
        status.custom++;
      }
    });
    
    // Verificar triggers faltantes
    systemTriggers.forEach(functionName => {
      const exists = triggers.some(t => t.functionName === functionName);
      if (!exists) {
        status.missing.push(functionName);
      }
    });
    
    return status;
    
  } catch (error) {
    Logger.log('Error verificando estado de triggers: ' + error.toString());
    return null;
  }
}

/**
 * Repara triggers faltantes
 */
function repairTriggers() {
  try {
    Logger.log('Iniciando reparación de triggers...');
    
    const status = checkTriggersStatus();
    
    if (status && status.missing.length > 0) {
      Logger.log(`Triggers faltantes encontrados: ${status.missing.join(', ')}`);
      
      // Recrear triggers faltantes
      if (status.missing.includes('processFormSubmission')) {
        createFormProcessingTrigger();
      }
      
      if (status.missing.includes('dailySync')) {
        createDailySyncTrigger();
      }
      
      if (status.missing.includes('generateMonthlyPaymentsIfNeeded')) {
        createMonthlyPaymentsTrigger();
      }
      
      if (status.missing.includes('weeklyDataValidation')) {
        createDataValidationTrigger();
      }
      
      Logger.log('Triggers reparados exitosamente');
      return true;
    } else {
      Logger.log('No se encontraron triggers faltantes');
      return true;
    }
    
  } catch (error) {
    Logger.log('Error reparando triggers: ' + error.toString());
    return false;
  }
}

/**
 * Desactiva temporalmente todos los triggers
 */
function disableAllTriggers() {
  try {
    if (!hasTriggerPermissions()) {
      Logger.log('Advertencia: No se tienen permisos para acceder a triggers');
      return [];
    }
    
    const triggers = ScriptApp.getProjectTriggers();
    const disabledTriggers = [];
    
    triggers.forEach(trigger => {
      const functionName = trigger.getHandlerFunction();
      
      // Solo desactivar triggers del sistema
      if (functionName.includes('FormSubmit') || 
          functionName.includes('DailySync') ||
          functionName.includes('MonthlyPayments') ||
          functionName.includes('DataValidation') ||
          functionName.includes('processFormSubmission') ||
          functionName.includes('dailySync') ||
          functionName.includes('generateMonthlyPaymentsIfNeeded') ||
          functionName.includes('weeklyDataValidation')) {
        
        ScriptApp.deleteTrigger(trigger);
        disabledTriggers.push(functionName);
      }
    });
    
    Logger.log(`Triggers desactivados: ${disabledTriggers.join(', ')}`);
    return disabledTriggers;
    
  } catch (error) {
    Logger.log('Error desactivando triggers: ' + error.toString());
    return [];
  }
}

/**
 * Reactiva todos los triggers del sistema
 */
function enableAllTriggers() {
  try {
    Logger.log('Reactivando triggers del sistema...');
    
    setupAllTriggers();
    
    Logger.log('Triggers reactivados exitosamente');
    return true;
    
  } catch (error) {
    Logger.log('Error reactivando triggers: ' + error.toString());
    return false;
  }
}

/**
 * Función de prueba para triggers
 */
function testTrigger() {
  try {
    Logger.log('Trigger de prueba ejecutado exitosamente');
    Logger.log('Fecha y hora: ' + new Date().toLocaleString());
    
    return {
      success: true,
      timestamp: new Date(),
      message: 'Trigger de prueba ejecutado correctamente'
    };
    
  } catch (error) {
    Logger.log('Error en trigger de prueba: ' + error.toString());
    return {
      success: false,
      timestamp: new Date(),
      error: error.toString()
    };
  }
}

/**
 * Crea un trigger de prueba temporal
 */
function createTestTrigger() {
  try {
    // Trigger que se ejecuta una sola vez en 1 minuto
    const trigger = ScriptApp.newTrigger('testTrigger')
      .timeBased()
      .after(60000) // 1 minuto
      .create();
    
    Logger.log('Trigger de prueba creado - se ejecutará en 1 minuto');
    return trigger.getUniqueId();
    
  } catch (error) {
    Logger.log('Error creando trigger de prueba: ' + error.toString());
    return null;
  }
}

/**
 * Crea trigger para verificar torneos expirados
 */
function createTournamentExpirationTrigger() {
  try {
    if (!hasTriggerPermissions()) {
      Logger.log('Advertencia: No se tienen permisos para crear trigger de torneos');
      return null;
    }
    
    // Verificar si ya existe
    const existingTriggers = ScriptApp.getProjectTriggers();
    const tournamentTrigger = existingTriggers.find(trigger => 
      trigger.getHandlerFunction() === 'checkAndCleanupExpiredTournaments'
    );
    
    if (tournamentTrigger) {
      Logger.log('Trigger de torneos ya existe, saltando creación');
      return tournamentTrigger;
    }
    
    // Crear trigger diario a las 6:00 AM
    const trigger = ScriptApp.newTrigger('checkAndCleanupExpiredTournaments')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();
    
    Logger.log('✅ Trigger de torneos expirados creado exitosamente');
    return trigger;
    
  } catch (error) {
    Logger.log('❌ Error creando trigger de torneos: ' + error.toString());
    return null;
  }
}
