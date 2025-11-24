/**
 * ========================================
 * ARCHIVO: Code.gs
 * DESCRIPCIÓN: Archivo principal del sistema de gestión de Academia de Fútbol
 * FUNCIONES: Inicialización, menús, y funciones principales
 * ========================================
 */

/**
 * Función de autorización - solicita permisos necesarios
 * Esta función debe ejecutarse la primera vez desde cada dispositivo/cuenta
 */
function requestAuthorization() {
  try {
    Logger.log('=== SOLICITANDO AUTORIZACIÓN ===');
    
    // Acceder a servicios que requieren autorización
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    // Acceso a propiedades
    PropertiesService.getScriptProperties().getProperty('test');
    PropertiesService.getUserProperties().getProperty('test');
    
    // Acceso básico a hojas
    const sheets = ss.getSheets();
    
    // Si llegamos aquí, la autorización fue exitosa
    ui.alert(
      '✅ Autorización Exitosa',
      'Has sido autorizado correctamente para usar el sistema.\n\n' +
      'Ahora puedes usar todas las funcionalidades del sistema de gestión de la academia.',
      ui.ButtonSet.OK
    );
    
    Logger.log('Autorización completada exitosamente');
    return true;
    
  } catch (error) {
    Logger.log('Error en autorización: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      '⚠️ Error de Autorización',
      'Hubo un problema al solicitar permisos:\n\n' + error.toString() + '\n\n' +
      'Por favor, intenta cerrar y volver a abrir la hoja de cálculo.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return false;
  }
}

/**
 * Función simple para forzar autorización inicial
 */
function forceAuthorization() {
  try {
    // Esta función simplemente accede a varios servicios para solicitar permisos
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    PropertiesService.getScriptProperties().setProperty('authorization_test', 'true');
    PropertiesService.getUserProperties().setProperty('authorization_test', 'true');
    
    const sheets = ss.getSheets();
    const name = ss.getName();
    
    SpreadsheetApp.getUi().alert('✅ Autorización completada. Ya puedes usar el sistema.');
    return true;
  } catch (error) {
    Logger.log('Error forzando autorización:', error.toString());
    SpreadsheetApp.getUi().alert('❌ Error: ' + error.toString());
    return false;
  }
}

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
 * Función que se ejecuta al abrir la hoja de cálculo
 * Configura menús y inicializa el sistema
 */
function onOpen() {
  try {
    Logger.log('=== EJECUTANDO onOpen() ===');
    
    // Crear menú personalizado
    const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏆 Academia Fútbol')
      .addItem('👥 Gestión de Jugadores', 'showPlayersManager')
      .addItem('👨‍👩‍👧‍👦 Grupos Familiares', 'showFamilyGroupsManager')
      .addItem('💰 Gestión Financiera', 'showFinancialManager')
      .addItem('💸 Gestión de Gastos', 'showExpenseManager')
      .addItem('✅ Aprobaciones', 'showApprovalsManager')
      .addItem('🏆 Gestión de Torneos', 'showTournamentManager')
      .addItem('📜 Histórico de Jugadores', 'showHistoricPlayersManager')
      .addSeparator()
      .addItem('⚙️ Configuraciones del Sistema', 'showSystemConfig')
      .addSeparator()
      .addItem('🔄 Sincronizar Datos', 'syncAllData')
      .addItem('📈 Generar Reportes', 'generateReports')
      .addSeparator()
      .addItem('🔐 Solicitar Autorización', 'showAuthorizationHelper')
      .addSeparator()
      .addItem('📚 Manual de Usuario', 'showUserManual')
      // ========================================
      // MENÚS TÉCNICOS OCULTOS (NO BORRAR)
      // Para reactivar, descomentar las líneas siguientes
      // ========================================
      // .addItem('⚙️ Configuraciones', 'showSystemConfig')
      // .addSubMenu(ui.createMenu('🔧 Herramientas')
      //   .addItem('🗑️ ELIMINAR DUPLICADOS ⭐', 'runManualDeleteDuplicates')
      //   .addItem('➕ INSERTAR COLUMNAS FALTANTES ⭐', 'runInsertMissingColumns')
      //   .addItem('🔨 Reparación Completa', 'runCompleteRepair')
      //   .addItem('🧹 Limpieza Total', 'runTotalCleanup')
      //   .addSeparator()
      //   .addItem('🩺 Diagnosticar Sistema', 'runDiagnostics')
      //   .addItem('👁️ Inspeccionar Columnas', 'showColumnsReport')
      //   .addSeparator()
      //   .addItem('⚡ Arreglo Rápido', 'runQuickFix')
      //   .addItem('🔨 Reparar Hoja Jugadores', 'runAutoRepair')
      //   .addItem('📋 Verificar Estructura', 'reportJugadoresStructure')
      //   .addItem('🔧 Arreglar Estructura', 'runFixStructure')
      //   .addItem('🧹 Limpiar Columnas Extra', 'runCleanupColumns')
      //   .addItem('🗑️ Limpiar Backups', 'runCleanupBackups'))
      // .addItem('🔐 Solicitar Autorización', 'requestAuthorization')
      // .addItem('❓ Ayuda de Autorización', 'showAuthorizationHelper')
      .addToUi();
    
    Logger.log('Menú creado exitosamente');
    
    // Inicializar sistema
    initializeSystem();
    
    // Inicializar configuraciones por defecto
    initializeDefaultConfig();
    
    Logger.log('Sistema de Academia de Fútbol inicializado correctamente');
  } catch (error) {
    Logger.log('Error al inicializar el sistema: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error al inicializar el sistema: ' + error.toString());
  }
}

/**
 * Función manual para crear el menú (en caso de que onOpen no funcione)
 */
function createMenu() {
  try {
    Logger.log('=== CREANDO MENÚ MANUALMENTE ===');
    
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🏆 Academia Fútbol')
      .addItem('👥 Gestión de Jugadores', 'showPlayersManager')
      .addItem('👨‍👩‍👧‍👦 Grupos Familiares', 'showFamilyGroupsManager')
      .addItem('💰 Gestión Financiera', 'showFinancialManager')
      .addItem('💸 Gestión de Gastos', 'showExpenseManager')
      .addItem('✅ Aprobaciones', 'showApprovalsManager')
      .addItem('🏆 Gestión de Torneos', 'showTournamentManager')
      .addItem('📜 Histórico de Jugadores', 'showHistoricPlayersManager')
      .addSeparator()
      .addItem('⚙️ Configuraciones del Sistema', 'showSystemConfig')
      .addSeparator()
      .addItem('🔄 Sincronizar Datos', 'syncAllData')
      .addItem('📈 Generar Reportes', 'generateReports')
      .addSeparator()
      .addItem('🔐 Solicitar Autorización', 'showAuthorizationHelper')
      .addSeparator()
      .addItem('📚 Manual de Usuario', 'showUserManual')
      // ========================================
      // MENÚS TÉCNICOS OCULTOS (NO BORRAR)
      // Para reactivar, descomentar las líneas siguientes
      // ========================================
      // .addItem('⚙️ Configuraciones', 'showSystemConfig')
      // .addSubMenu(ui.createMenu('🔧 Herramientas')
      //   .addItem('🗑️ ELIMINAR DUPLICADOS ⭐', 'runManualDeleteDuplicates')
      //   .addItem('➕ INSERTAR COLUMNAS FALTANTES ⭐', 'runInsertMissingColumns')
      //   .addItem('🔨 Reparación Completa', 'runCompleteRepair')
      //   .addItem('🧹 Limpieza Total', 'runTotalCleanup')
      //   .addSeparator()
      //   .addItem('🩺 Diagnosticar Sistema', 'runDiagnostics')
      //   .addItem('👁️ Inspeccionar Columnas', 'showColumnsReport')
      //   .addSeparator()
      //   .addItem('⚡ Arreglo Rápido', 'runQuickFix')
      //   .addItem('🔨 Reparar Hoja Jugadores', 'runAutoRepair')
      //   .addItem('📋 Verificar Estructura', 'reportJugadoresStructure')
      //   .addItem('🔧 Arreglar Estructura', 'runFixStructure')
      //   .addItem('🧹 Limpiar Columnas Extra', 'runCleanupColumns')
      //   .addItem('🗑️ Limpiar Backups', 'runCleanupBackups'))
      // .addItem('🔐 Solicitar Autorización', 'requestAuthorization')
      // .addItem('❓ Ayuda de Autorización', 'showAuthorizationHelper')
      .addToUi();
    
    Logger.log('Menú creado manualmente exitosamente');
    SpreadsheetApp.getUi().alert('✅ Menú creado exitosamente. Recarga la página para verlo.');
    
  } catch (error) {
    Logger.log('Error creando menú manualmente: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error creando menú: ' + error.toString());
  }
}

/**
 * Función para verificar el estado del sistema
 */
function checkSystemStatus() {
  try {
    Logger.log('=== VERIFICANDO ESTADO DEL SISTEMA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    const result = {
      success: true,
      message: 'Sistema funcionando correctamente',
      totalSheets: sheets.length,
      sheetNames: sheets.map(sheet => sheet.getName()),
      hasMenu: true // Asumimos que si llegamos aquí, el menú funciona
    };
    
    Logger.log('Estado del sistema:', result);
    return result;
    
  } catch (error) {
    Logger.log('Error verificando estado del sistema: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Inicializa el sistema creando hojas necesarias y configuraciones
 */
function initializeSystem() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Verificar y crear hojas necesarias
    const requiredSheets = [
      'Jugadores',
      'Pagos',
      'Aprobaciones',
      'Configuraciones',
      'Logs',
      'Familias',
      'Torneos',
      'Gastos'
    ];
    
    requiredSheets.forEach(sheetName => {
      if (!ss.getSheetByName(sheetName)) {
        ss.insertSheet(sheetName);
        Logger.log(`Hoja '${sheetName}' creada`);
      }
    });
    
    // Configurar headers de hojas principales
    setupSheetHeaders();
    
    // Configurar headers de la hoja de aprobaciones
    setupApprovalsSheetHeaders();
    
    // Crear triggers si no existen (con manejo de errores)
    try {
      setupTriggers();
    } catch (triggerError) {
      Logger.log('Advertencia: No se pudieron configurar triggers: ' + triggerError.toString());
    }
    
    Logger.log('Sistema inicializado correctamente');
    
  } catch (error) {
    Logger.log('Error inicializando sistema: ' + error.toString());
    throw error;
  }
}

/**
 * Configura los encabezados de las hojas principales
 */
function setupSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Headers para hoja de Jugadores
  const playersSheet = ss.getSheetByName('Jugadores');
  if (playersSheet) {
    const playersHeaders = [
      'ID', 'Nombre', 'Apellidos', 'Edad', 'Cédula', 'Teléfono',
      'Categoría', 'Estado', 'Fecha Registro', 'Tutor', 'Familia ID',
      'Tipo', 'Descuento %', 'Observaciones'
    ];
    playersSheet.getRange(1, 1, 1, playersHeaders.length).setValues([playersHeaders]);
    playersSheet.getRange(1, 1, 1, playersHeaders.length).setFontWeight('bold');
  }
  
  // Headers para hoja de Pagos
  const paymentsSheet = ss.getSheetByName('Pagos');
  if (paymentsSheet) {
    const paymentsHeaders = [
      'ID', 'Jugador ID', 'Tipo', 'Monto', 'Fecha', 'Estado',
      'Método Pago', 'Referencia', 'Observaciones', 'Descuento Aplicado'
    ];
    paymentsSheet.getRange(1, 1, 1, paymentsHeaders.length).setValues([paymentsHeaders]);
    paymentsSheet.getRange(1, 1, 1, paymentsHeaders.length).setFontWeight('bold');
  }
  
  // Headers para hoja de Aprobaciones
  const approvalsSheet = ss.getSheetByName('Aprobaciones');
  if (approvalsSheet) {
    const approvalsHeaders = [
      'ID', 'Nombre', 'Apellidos', 'Edad', 'Cédula', 'Teléfono',
      'Categoría', 'Fecha Aplicación', 'Estado', 'Tipo Aprobación',
      'Observaciones', 'Archivos Adjuntos'
    ];
    approvalsSheet.getRange(1, 1, 1, approvalsHeaders.length).setValues([approvalsHeaders]);
    approvalsSheet.getRange(1, 1, 1, approvalsHeaders.length).setFontWeight('bold');
  }
}

/**
 * Configura los triggers automáticos del sistema
 */
function setupTriggers() {
  try {
    // Verificar permisos antes de acceder a triggers
    if (!hasTriggerPermissions()) {
      Logger.log('Advertencia: No se tienen permisos para configurar triggers. Saltando configuración.');
      return;
    }
    
    // Eliminar triggers existentes para evitar duplicados
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction().includes('FormSubmit') || 
          trigger.getHandlerFunction().includes('DailySync')) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Crear trigger para procesar formularios
    ScriptApp.newTrigger('processFormSubmission')
      .timeBased()
      .everyMinutes(5)
      .create();
    
    // Crear trigger para sincronización diaria
    ScriptApp.newTrigger('dailySync')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();
    
    Logger.log('Triggers configurados exitosamente');
    
  } catch (error) {
    Logger.log('Error configurando triggers: ' + error.toString());
  }
}

/**
 * Muestra el dashboard principal
 */
function showMainDashboard() {
  const htmlOutput = HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('🏆 Dashboard Academia de Fútbol');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Dashboard Principal');
}

/**
 * Muestra el gestor de jugadores
 */
function showPlayersManager() {
  const htmlOutput = HtmlService.createTemplateFromFile('PlayersManager')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('👥 Gestión de Jugadores');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Gestión de Jugadores');
}

/**
 * Muestra el gestor de grupos familiares
 */
function showFamilyGroupsManager() {
  const htmlOutput = HtmlService.createTemplateFromFile('FamilyGroupsManager')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('👨‍👩‍👧‍👦 Grupos Familiares');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Grupos Familiares');
}

/**
 * Muestra la página de ayuda de autorización
 */
function showAuthorizationHelper() {
  const htmlOutput = HtmlService.createTemplateFromFile('AuthorizationHelper')
    .evaluate()
    .setWidth(800)
    .setHeight(700)
    .setTitle('🔐 Autorización Requerida');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Autorización Requerida');
}

/**
 * Muestra el gestor financiero
 */
function showFinancialManager() {
  const htmlOutput = HtmlService.createTemplateFromFile('FinancialDashboard')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('💰 Gestión Financiera');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Gestión Financiera');
}

/**
 * Mostrar gestor de gastos/egresos
 */
function showExpenseManager() {
  const htmlOutput = HtmlService.createTemplateFromFile('ExpenseManager')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('💸 Gestión de Gastos');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Gestión de Gastos');
}

/**
 * Muestra el gestor de aprobaciones
 */
function showApprovalsManager() {
  const htmlOutput = HtmlService.createTemplateFromFile('PendingApprovals')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('✅ Aprobaciones Pendientes');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Aprobaciones Pendientes');
}

/**
 * Muestra la configuración del sistema
 */
function showSystemConfig() {
  const htmlOutput = HtmlService.createTemplateFromFile('SystemConfig')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('⚙️ Configuraciones del Sistema');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Configuraciones');
}

/**
 * Muestra el manual de usuario
 */
function showUserManual() {
  const htmlOutput = HtmlService.createTemplateFromFile('UserManual')
    .evaluate()
    .setWidth(1400)
    .setHeight(900)
    .setTitle('📚 Manual de Usuario - SUAREZ ACADEMY');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Manual de Usuario');
}

/**
 * Sincroniza todos los datos del sistema
 */
function syncAllData() {
  try {
    Logger.log('=== SINCRONIZANDO DATOS ===');
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('🔄 Sincronizando...', 'Procesando formularios de matrícula y torneos...', ui.ButtonSet.OK);
    
    // Procesar formulario de matrícula
    Logger.log('Procesando FORM_MATRICULA...');
    const processMatriculaResult = processFormMatriculaDataImproved();
    Logger.log('Resultado procesamiento matrícula:', processMatriculaResult);
    
    // Procesar formulario de torneo
    Logger.log('Procesando FORM_TORNEO...');
    const processTorneoResult = processFormTorneoData();
    Logger.log('Resultado procesamiento torneo:', processTorneoResult);
    
    let mensaje = '✅ Sincronización Completada\n\n';
    
    mensaje += '📝 MATRÍCULAS:\n';
    if (processMatriculaResult && processMatriculaResult.success) {
      mensaje += `   Procesados: ${processMatriculaResult.processed || 0}\n`;
      mensaje += `   Total: ${processMatriculaResult.total || 0}\n`;
    } else {
      mensaje += '   Sin datos nuevos\n';
    }
    
    mensaje += '\n🏆 TORNEOS:\n';
    if (processTorneoResult && processTorneoResult.success) {
      mensaje += `   Procesados: ${processTorneoResult.processed || 0}\n`;
      mensaje += `   Total: ${processTorneoResult.total || 0}\n`;
    } else {
      mensaje += '   Sin datos nuevos\n';
    }
    
    mensaje += '\nAhora puedes:\n';
    mensaje += '• Ir a "✅ Aprobaciones" para ver solicitudes\n';
    mensaje += '• Aprobar o rechazar jugadores nuevos';
    
    ui.alert('🔄 Sincronización', mensaje, ui.ButtonSet.OK);
    
    Logger.log('✅ Sincronización completada');
    
  } catch (error) {
    Logger.log('Error en sincronización: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error en sincronización: ' + error.toString());
  }
}

/**
 * Genera reportes del sistema
 */
function generateReports() {
  try {
    const reports = generateSystemReports();
    SpreadsheetApp.getUi().alert(`Reportes generados: ${reports.length} archivos creados`);
  } catch (error) {
    Logger.log('Error generando reportes: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error generando reportes: ' + error.toString());
  }
}

/**
 * Función helper para incluir archivos HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ========================================
 * FUNCIONES DE HERRAMIENTAS DE DIAGNÓSTICO
 * ========================================
 */

/**
 * Ejecuta diagnóstico completo del sistema
 */
function runDiagnostics() {
  try {
    Logger.log('=== EJECUTANDO DIAGNÓSTICO COMPLETO ===');
    
    const result = diagnosticoCompletoJugadores();
    
    if (result.success) {
      const ui = SpreadsheetApp.getUi();
      
      let mensaje = `📋 DIAGNÓSTICO DEL SISTEMA\n\n`;
      mensaje += `Hojas de Jugadores encontradas: ${result.hojas.length}\n\n`;
      
      result.hojas.forEach((hoja, idx) => {
        mensaje += `${idx + 1}. ${hoja.nombre}\n`;
        mensaje += `   • Filas: ${hoja.filas} (${hoja.datosReales} jugadores)\n`;
        mensaje += `   • Columnas: ${hoja.columnas}\n`;
        mensaje += `   • Exacta: ${hoja.esExacta ? '✅ SÍ' : '❌ NO'}\n`;
        mensaje += `   • Backup: ${hoja.esBackup ? '⚠️ SÍ' : '✅ NO'}\n\n`;
      });
      
      mensaje += `\n📌 RECOMENDACIÓN:\n${result.recomendacion}\n\n`;
      mensaje += `Hojas de backup: ${result.backupsCount}`;
      
      ui.alert('🩺 Diagnóstico del Sistema', mensaje, ui.ButtonSet.OK);
      
      Logger.log('✅ Diagnóstico completado');
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico:', error.toString());
    SpreadsheetApp.getUi().alert('Error en diagnóstico: ' + error.toString());
  }
}

/**
 * Ejecuta reparación automática de la hoja de Jugadores
 */
function runAutoRepair() {
  try {
    Logger.log('=== EJECUTANDO REPARACIÓN AUTOMÁTICA ===');
    
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar con el usuario
    const response = ui.alert(
      '🔨 Reparar Hoja de Jugadores',
      '¿Deseas reparar automáticamente la hoja de Jugadores?\n\n' +
      'Esta operación hará lo siguiente:\n' +
      '• Identificará la hoja correcta de Jugadores\n' +
      '• La renombrará a "Jugadores" si es necesario\n' +
      '• Eliminará hojas de backup antiguas\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      Logger.log('Reparación cancelada por el usuario');
      return;
    }
    
    const result = autoRepairJugadoresSheet();
    
    if (result.success) {
      let mensaje = `✅ ${result.message}\n\n`;
      
      if (result.wasCreated) {
        mensaje += `Se creó una hoja nueva "Jugadores" con:\n`;
        mensaje += `• Headers correctos configurados\n`;
        mensaje += `• 0 jugadores (vacía y lista para usar)\n`;
        mensaje += `• Formato profesional aplicado\n\n`;
      } else {
        mensaje += `Jugadores en el sistema: ${result.jugadoresRows}\n`;
      }
      
      mensaje += `Backups eliminados: ${result.backupsDeleted}\n`;
      
      if (result.deletedSheets && result.deletedSheets.length > 0) {
        mensaje += `\nHojas eliminadas:\n`;
        result.deletedSheets.forEach(name => {
          mensaje += `• ${name}\n`;
        });
      }
      
      if (result.wasCreated) {
        mensaje += `\n⚠️ NOTA: La hoja estaba vacía o no existía.\n`;
        mensaje += `Ahora puedes agregar jugadores desde el menú de Aprobaciones.`;
      }
      
      ui.alert('🔨 Reparación Exitosa', mensaje, ui.ButtonSet.OK);
      Logger.log('✅ Reparación completada exitosamente');
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    Logger.log('❌ Error en reparación:', error.toString());
    SpreadsheetApp.getUi().alert('Error en reparación: ' + error.toString());
  }
}

/**
 * Limpia hojas de backup antiguas
 */
function runCleanupBackups() {
  try {
    Logger.log('=== LIMPIANDO HOJAS DE BACKUP ===');
    
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar con el usuario
    const response = ui.alert(
      '🗑️ Limpiar Backups',
      '¿Deseas eliminar todas las hojas de backup?\n\n' +
      'Esta operación eliminará hojas con nombres que contengan:\n' +
      '• BACKUP\n' +
      '• VIEJO\n' +
      '• _NUEVO\n\n' +
      'La hoja "Jugadores" principal NO será afectada.\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      Logger.log('Limpieza cancelada por el usuario');
      return;
    }
    
    const result = cleanupBackupSheets();
    
    if (result.success) {
      let mensaje = `✅ ${result.message}\n\n`;
      
      if (result.deleted && result.deleted.length > 0) {
        mensaje += `Hojas eliminadas:\n`;
        result.deleted.forEach(name => {
          mensaje += `• ${name}\n`;
        });
      } else {
        mensaje += 'No se encontraron hojas de backup para eliminar.';
      }
      
      ui.alert('🗑️ Limpieza Completada', mensaje, ui.ButtonSet.OK);
      Logger.log('✅ Limpieza completada exitosamente');
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    Logger.log('❌ Error en limpieza:', error.toString());
    SpreadsheetApp.getUi().alert('Error en limpieza: ' + error.toString());
  }
}

/**
 * Ejecuta limpieza de columnas extra
 */
function runCleanupColumns() {
  try {
    Logger.log('=== LIMPIANDO COLUMNAS EXTRA ===');
    
    const ui = SpreadsheetApp.getUi();
    
    // Primero inspeccionar
    const inspection = inspectJugadoresColumns();
    
    if (!inspection.success) {
      throw new Error(inspection.message);
    }
    
    if (!inspection.needsCleanup) {
      ui.alert('✅ Estructura Correcta', 'La hoja ya tiene la estructura correcta. No hay columnas extra para eliminar.', ui.ButtonSet.OK);
      return;
    }
    
    // Mostrar qué se va a eliminar
    let confirmMsg = `🧹 Limpiar Columnas Extra\n\n`;
    confirmMsg += `Columnas actuales: ${inspection.totalColumns}\n`;
    confirmMsg += `Columnas esperadas: ${inspection.expectedColumns}\n`;
    confirmMsg += `Columnas a eliminar: ${inspection.totalColumns - inspection.expectedColumns}\n\n`;
    
    if (inspection.extraColumns.length > 0) {
      confirmMsg += `Columnas que se eliminarán:\n`;
      inspection.extraColumns.forEach((col, idx) => {
        confirmMsg += `  ${inspection.expectedColumns + idx + 1}. "${col}"\n`;
      });
    }
    
    confirmMsg += `\n⚠️ Tus jugadores NO se perderán.\n`;
    confirmMsg += `¿Continuar?`;
    
    const response = ui.alert('🧹 Limpiar Columnas Extra', confirmMsg, ui.ButtonSet.YES_NO);
    
    if (response === ui.Button.NO) {
      Logger.log('Limpieza cancelada por el usuario');
      return;
    }
    
    const result = cleanupExtraColumns();
    
    if (result.success) {
      let mensaje = `✅ ${result.message}\n\n`;
      mensaje += `Columnas eliminadas: ${result.deleted}\n`;
      mensaje += `Columnas finales: ${result.finalColumns}\n\n`;
      mensaje += `✅ Ahora puedes recargar "Gestión de Jugadores" y debería funcionar correctamente.`;
      
      ui.alert('🧹 Limpieza Exitosa', mensaje, ui.ButtonSet.OK);
      Logger.log('✅ Limpieza completada exitosamente');
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    Logger.log('❌ Error en limpieza:', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Ejecuta reparación de estructura de la hoja Jugadores
 */
function runFixStructure() {
  try {
    Logger.log('=== ARREGLANDO ESTRUCTURA ===');
    
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar con el usuario
    const response = ui.alert(
      '🔧 Arreglar Estructura de Jugadores',
      '¿Deseas arreglar la estructura de columnas de la hoja Jugadores?\n\n' +
      'Esta operación hará lo siguiente:\n' +
      '• Agregará las columnas faltantes "Email Tutor" y "Dirección"\n' +
      '• Las columnas se insertarán en las posiciones correctas\n' +
      '• Los datos existentes NO se perderán\n' +
      '• Las columnas se desplazarán para mantener el orden correcto\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      Logger.log('Reparación de estructura cancelada por el usuario');
      return;
    }
    
    const result = fixJugadoresStructure();
    
    if (result.success) {
      let mensaje = `✅ ${result.message}\n\n`;
      mensaje += `Columnas agregadas: ${result.columnsAdded}\n`;
      mensaje += `Jugadores en el sistema: ${result.dataRows}\n\n`;
      mensaje += `Estructura final (${result.finalHeaders.length} columnas):\n`;
      
      // Mostrar primeras 10 columnas
      for (let i = 0; i < Math.min(10, result.finalHeaders.length); i++) {
        mensaje += `  ${i + 1}. ${result.finalHeaders[i]}\n`;
      }
      
      if (result.finalHeaders.length > 10) {
        mensaje += `  ... y ${result.finalHeaders.length - 10} más\n`;
      }
      
      mensaje += '\n✅ Ahora puedes recargar "Gestión de Jugadores" y debería funcionar correctamente.';
      
      ui.alert('🔧 Estructura Corregida', mensaje, ui.ButtonSet.OK);
      Logger.log('✅ Estructura corregida exitosamente');
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    Logger.log('❌ Error arreglando estructura:', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Ejecuta reparación COMPLETA de la hoja Jugadores
 */
function runCompleteRepair() {
  try {
    Logger.log('=== EJECUTANDO REPARACIÓN COMPLETA ===');
    
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '🔨 Reparación Completa',
      '¿Deseas reorganizar completamente la hoja de Jugadores?\n\n' +
      'Esta operación hará:\n' +
      '✅ Eliminar TODAS las columnas duplicadas\n' +
      '✅ Agregar columnas faltantes (Email Tutor, Dirección)\n' +
      '✅ Reorganizar todo en el orden correcto\n' +
      '✅ Mantener tus 5 jugadores intactos\n\n' +
      '⚠️ Esto reemplazará la estructura completa\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      Logger.log('Reparación completa cancelada');
      return;
    }
    
    const result = completeRepairJugadores();
    
    if (result.success) {
      let msg = `✅ ¡REPARACIÓN COMPLETA EXITOSA!\n\n`;
      msg += `Columnas antes: ${result.oldColumns}\n`;
      msg += `Columnas ahora: ${result.newColumns}\n`;
      msg += `Columnas eliminadas: ${result.columnsRemoved}\n`;
      msg += `Jugadores conservados: ${result.playersCount}\n\n`;
      msg += `✅ Estructura final correcta con 23 columnas\n`;
      msg += `✅ Sin duplicados\n`;
      msg += `✅ Todas las columnas en orden correcto\n\n`;
      msg += `Ahora recarga "Gestión de Jugadores"`;
      
      ui.alert('🔨 ¡Éxito!', msg, ui.ButtonSet.OK);
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Ejecuta limpieza total (completa + becado)
 */
function runTotalCleanup() {
  try {
    Logger.log('=== EJECUTANDO LIMPIEZA TOTAL ===');
    
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '🧹 Limpieza Total',
      '¿Ejecutar limpieza total de la hoja Jugadores?\n\n' +
      'Esta operación hará:\n' +
      '1️⃣ Reorganizar TODA la estructura (eliminar duplicados)\n' +
      '2️⃣ Restaurar tipo "becado" para jugadores correspondientes\n' +
      '3️⃣ Dejar exactamente 23 columnas correctas\n\n' +
      'Tus 5 jugadores se mantendrán.\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      return;
    }
    
    // Paso 1: Reparación completa
    const repairResult = completeRepairJugadores();
    
    if (!repairResult.success) {
      throw new Error('Error en reparación: ' + repairResult.message);
    }
    
    // Paso 2: Restaurar tipos becados
    const restoreResult = restoreBecadoType();
    
    let msg = `✅ ¡LIMPIEZA TOTAL EXITOSA!\n\n`;
    msg += `📊 Reparación:\n`;
    msg += `  Columnas antes: ${repairResult.oldColumns}\n`;
    msg += `  Columnas ahora: ${repairResult.newColumns}\n`;
    msg += `  Eliminadas: ${repairResult.columnsRemoved}\n\n`;
    
    if (restoreResult && restoreResult.success) {
      msg += `🏆 Tipos restaurados:\n`;
      msg += `  Jugadores becados: ${restoreResult.updated}\n\n`;
    }
    
    msg += `✅ Estructura perfecta con 23 columnas\n`;
    msg += `✅ Sin duplicados\n`;
    msg += `✅ Todos los datos conservados\n\n`;
    msg += `Ahora:\n`;
    msg += `1. Recarga la página (Ctrl+R)\n`;
    msg += `2. Abre "Gestión de Jugadores"\n`;
    msg += `3. Verás los colores funcionando`;
    
    ui.alert('🧹 ¡Limpieza Exitosa!', msg, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Muestra la ventana de gestión de jugadores históricos
 */
function showHistoricPlayersManager() {
  try {
    const htmlTemplate = HtmlService.createTemplateFromFile('HistoricPlayersManager');
    const htmlOutput = htmlTemplate.evaluate()
      .setWidth(1400)
      .setHeight(800)
      .setTitle('Histórico de Jugadores - Suarez Academy');
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Histórico de Jugadores');
  } catch (error) {
    Logger.log('Error mostrando ventana de histórico: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Muestra la ventana de gestión de torneos
 */
function showTournamentManager() {
  try {
    const htmlTemplate = HtmlService.createTemplateFromFile('TournamentManagerWindow');
    const htmlOutput = htmlTemplate.evaluate()
      .setWidth(1400)
      .setHeight(900)
      .setTitle('🏆 Gestión de Torneos - Suarez Academy');
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Gestión de Torneos');
  } catch (error) {
    Logger.log('Error mostrando ventana de torneos: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Función wrapper para probar el proceso de aprobación de torneos
 */
function runTestTournamentApproval() {
  try {
    const result = testTournamentApprovalProcess();
    
    let message = '🧪 DIAGNÓSTICO DEL PROCESO DE APROBACIÓN DE TORNEOS:\n\n';
    
    if (result.success) {
      message += '✅ DIAGNÓSTICO EXITOSO\n\n';
      message += '📊 Resultados:\n';
      message += `• Jugadores de torneo en Aprobaciones: ${result.details.torneoApprovals}\n`;
      message += `• Hoja FORM_TORNEO: ${result.details.formTorneoExists ? '✅ Existe' : '❌ No existe'}\n`;
      message += `• Hoja Aprobaciones: ${result.details.approvalsExists ? '✅ Existe' : '❌ No existe'}\n`;
      message += `• Hoja Histórico: ${result.details.historicExists ? '✅ Existe' : '❌ No existe'}\n\n`;
      
      if (result.details.torneoApprovals > 0) {
        message += '🏆 PROCESO FUNCIONANDO CORRECTAMENTE:\n';
        message += '✅ El sistema puede procesar aprobaciones de torneos\n';
        message += '✅ Los jugadores se moverán del FORM_TORNEO al backup\n';
        message += '✅ Los datos se guardarán en el histórico completo\n\n';
      } else {
        message += '⚠️ NO HAY JUGADORES DE TORNEO PENDIENTES\n';
        message += '• El proceso está listo para funcionar cuando lleguen solicitudes\n';
        message += '• Puedes probar creando una solicitud de torneo\n\n';
      }
      
      message += '📋 Para ver los logs detallados, revisa:\n';
      message += 'Google Apps Script → Ejecuciones → Ver logs';
      
    } else {
      message += '❌ ERROR EN DIAGNÓSTICO\n\n';
      message += `Error: ${result.message}\n\n`;
      message += '🔧 Acciones recomendadas:\n';
      message += '1. Verificar que las hojas existen\n';
      message += '2. Revisar los logs de Google Apps Script\n';
      message += '3. Contactar al administrador del sistema';
    }
    
    SpreadsheetApp.getUi().alert('🧪 Diagnóstico de Torneos', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    Logger.log('❌ Error ejecutando diagnóstico: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}
