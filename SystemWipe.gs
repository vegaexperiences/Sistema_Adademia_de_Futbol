/**
 * ========================================
 * ARCHIVO: SystemWipe.gs
 * DESCRIPCIÓN: Función para realizar wipe completo del sistema
 * ADVERTENCIA: Esta función elimina TODOS los datos del sistema
 * ========================================
 */

/**
 * ⚠️ WIPE COMPLETO DEL SISTEMA ⚠️
 * 
 * Esta función elimina:
 * - Todos los jugadores del sistema (excepto FORM_MATRICULA)
 * - Todas las transacciones financieras
 * - Todos los grupos familiares
 * - Todos los gastos
 * - Todas las aprobaciones
 * - Todo el histórico
 * - Todos los torneos y jugadores de torneo
 * 
 * MANTIENE:
 * - FORM_MATRICULA (jugadores pendientes de matrícula)
 * - Estructura de hojas
 * - Configuraciones del sistema
 */
function performCompleteSystemWipe() {
  try {
    Logger.log('=== ⚠️ INICIANDO WIPE COMPLETO DEL SISTEMA ⚠️ ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Confirmar antes de proceder
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '⚠️ ADVERTENCIA CRÍTICA',
      'Esta operación eliminará TODOS los datos del sistema excepto los jugadores de FORM_MATRICULA.\n\n' +
      '¿Estás seguro de que quieres continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      Logger.log('❌ Wipe cancelado por el usuario');
      ui.alert('Operación cancelada', 'El wipe del sistema ha sido cancelado.', ui.ButtonSet.OK);
      return false;
    }
    
    Logger.log('✅ Usuario confirmó el wipe. Procediendo...');
    
    // 1. Limpiar hoja de Jugadores
    Logger.log('🗑️ Limpiando hoja de Jugadores...');
    const playersSheet = ss.getSheetByName('Jugadores');
    if (playersSheet) {
      const lastRow = playersSheet.getLastRow();
      if (lastRow > 1) {
        playersSheet.getRange(2, 1, lastRow - 1, playersSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Jugadores eliminados: ${lastRow - 1} filas`);
      }
    }
    
    // 2. Limpiar transacciones financieras
    Logger.log('🗑️ Limpiando transacciones financieras...');
    const transactionsSheet = ss.getSheetByName('Transacciones');
    if (transactionsSheet) {
      const lastRow = transactionsSheet.getLastRow();
      if (lastRow > 1) {
        transactionsSheet.getRange(2, 1, lastRow - 1, transactionsSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Transacciones eliminadas: ${lastRow - 1} filas`);
      }
    }
    
    // 3. Limpiar grupos familiares
    Logger.log('🗑️ Limpiando grupos familiares...');
    const familiesSheet = ss.getSheetByName('GruposFamiliares');
    if (familiesSheet) {
      const lastRow = familiesSheet.getLastRow();
      if (lastRow > 1) {
        familiesSheet.getRange(2, 1, lastRow - 1, familiesSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Grupos familiares eliminados: ${lastRow - 1} filas`);
      }
    }
    
    // 4. Limpiar gastos
    Logger.log('🗑️ Limpiando gastos...');
    const expensesSheet = ss.getSheetByName('Gastos');
    if (expensesSheet) {
      const lastRow = expensesSheet.getLastRow();
      if (lastRow > 1) {
        expensesSheet.getRange(2, 1, lastRow - 1, expensesSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Gastos eliminados: ${lastRow - 1} filas`);
      }
    }
    
    // 5. Limpiar aprobaciones
    Logger.log('🗑️ Limpiando aprobaciones...');
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (approvalsSheet) {
      const lastRow = approvalsSheet.getLastRow();
      if (lastRow > 1) {
        approvalsSheet.getRange(2, 1, lastRow - 1, approvalsSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Aprobaciones eliminadas: ${lastRow - 1} filas`);
      }
    }
    
    // 6. Limpiar histórico completo
    Logger.log('🗑️ Limpiando histórico completo...');
    const historicSheet = ss.getSheetByName('Historico_Completo');
    if (historicSheet) {
      const lastRow = historicSheet.getLastRow();
      if (lastRow > 1) {
        historicSheet.getRange(2, 1, lastRow - 1, historicSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Histórico eliminado: ${lastRow - 1} filas`);
      }
    }
    
    // 7. Limpiar torneos
    Logger.log('🗑️ Limpiando torneos...');
    const tournamentsSheet = ss.getSheetByName('Torneos');
    if (tournamentsSheet) {
      const lastRow = tournamentsSheet.getLastRow();
      if (lastRow > 1) {
        tournamentsSheet.getRange(2, 1, lastRow - 1, tournamentsSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Torneos eliminados: ${lastRow - 1} filas`);
      }
    }
    
    // 8. Limpiar FORM_TORNEO
    Logger.log('🗑️ Limpiando FORM_TORNEO...');
    const formTorneoSheet = ss.getSheetByName('FORM_TORNEO');
    if (formTorneoSheet) {
      const lastRow = formTorneoSheet.getLastRow();
      if (lastRow > 1) {
        formTorneoSheet.getRange(2, 1, lastRow - 1, formTorneoSheet.getLastColumn()).clearContent();
        Logger.log(`✅ FORM_TORNEO limpiado: ${lastRow - 1} filas`);
      }
    }
    
    // 9. Limpiar pagos
    Logger.log('🗑️ Limpiando pagos...');
    const paymentsSheet = ss.getSheetByName('Pagos');
    if (paymentsSheet) {
      const lastRow = paymentsSheet.getLastRow();
      if (lastRow > 1) {
        paymentsSheet.getRange(2, 1, lastRow - 1, paymentsSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Pagos eliminados: ${lastRow - 1} filas`);
      }
    }
    
    // 10. Limpiar métricas
    Logger.log('🗑️ Limpiando métricas...');
    const metricsSheet = ss.getSheetByName('Metricas');
    if (metricsSheet) {
      const lastRow = metricsSheet.getLastRow();
      if (lastRow > 1) {
        metricsSheet.getRange(2, 1, lastRow - 1, metricsSheet.getLastColumn()).clearContent();
        Logger.log(`✅ Métricas eliminadas: ${lastRow - 1} filas`);
      }
    }
    
    // 11. Verificar que FORM_MATRICULA se mantiene
    Logger.log('✅ Verificando que FORM_MATRICULA se mantiene...');
    const formMatriculaSheet = ss.getSheetByName('FORM_MATRICULA');
    if (formMatriculaSheet) {
      const lastRow = formMatriculaSheet.getLastRow();
      Logger.log(`✅ FORM_MATRICULA preservado: ${lastRow - 1} jugadores pendientes`);
    }
    
    // 12. Limpiar propiedades del script
    Logger.log('🗑️ Limpiando propiedades del script...');
    PropertiesService.getScriptProperties().deleteAllProperties();
    PropertiesService.getUserProperties().deleteAllProperties();
    Logger.log('✅ Propiedades del script limpiadas');
    
    Logger.log('=== ✅ WIPE COMPLETO FINALIZADO ✅ ===');
    
    // Mostrar resumen final
    ui.alert(
      '✅ Wipe Completado',
      'El wipe completo del sistema se ha realizado exitosamente.\n\n' +
      'Datos eliminados:\n' +
      '• Todos los jugadores\n' +
      '• Todas las transacciones\n' +
      '• Todos los grupos familiares\n' +
      '• Todos los gastos\n' +
      '• Todas las aprobaciones\n' +
      '• Todo el histórico\n' +
      '• Todos los torneos\n\n' +
      'Datos preservados:\n' +
      '• FORM_MATRICULA (jugadores pendientes)\n' +
      '• Estructura de hojas\n' +
      '• Configuraciones del sistema',
      ui.ButtonSet.OK
    );
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Error durante el wipe:', error.toString());
    Logger.log('❌ Stack trace:', error.stack);
    
    SpreadsheetApp.getUi().alert(
      '❌ Error durante el Wipe',
      'Hubo un error durante el proceso de wipe:\n\n' + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return false;
  }
}

/**
 * Función de seguridad para verificar el estado del sistema después del wipe
 */
function verifySystemWipe() {
  try {
    Logger.log('=== VERIFICANDO ESTADO DEL SISTEMA DESPUÉS DEL WIPE ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const results = [];
    
    // Verificar hojas principales
    const sheetsToCheck = [
      'Jugadores',
      'Transacciones', 
      'GruposFamiliares',
      'Gastos',
      'Aprobaciones',
      'Historico_Completo',
      'Torneos',
      'FORM_TORNEO',
      'Pagos',
      'Metricas',
      'FORM_MATRICULA'
    ];
    
    sheetsToCheck.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        const dataRows = lastRow > 1 ? lastRow - 1 : 0;
        results.push(`${sheetName}: ${dataRows} filas de datos`);
        Logger.log(`📊 ${sheetName}: ${dataRows} filas de datos`);
      } else {
        results.push(`${sheetName}: Hoja no encontrada`);
        Logger.log(`⚠️ ${sheetName}: Hoja no encontrada`);
      }
    });
    
    Logger.log('=== RESUMEN DE VERIFICACIÓN ===');
    results.forEach(result => Logger.log(result));
    
    return results;
    
  } catch (error) {
    Logger.log('❌ Error verificando el wipe:', error.toString());
    return ['Error: ' + error.toString()];
  }
}
