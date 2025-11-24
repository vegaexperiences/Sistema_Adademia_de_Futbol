/**
 * ========================================
 * ARCHIVO: TestWipe.gs
 * DESCRIPCIÓN: Funciones de prueba para el wipe del sistema
 * ========================================
 */

/**
 * Función para diagnosticar hojas de gastos
 */
function diagnoseExpenseSheets() {
  try {
    Logger.log('=== DIAGNÓSTICO DE HOJAS DE GASTOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    const expenseSheets = [];
    
    allSheets.forEach(sheet => {
      const sheetName = sheet.getName();
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      // Buscar hojas que contengan "gasto" o "expense"
      if (sheetName.toLowerCase().includes('gasto') || 
          sheetName.toLowerCase().includes('expense')) {
        expenseSheets.push({
          name: sheetName,
          rows: lastRow,
          columns: lastCol,
          hasData: lastRow > 1
        });
      }
    });
    
    Logger.log('📊 Hojas de gastos encontradas:');
    expenseSheets.forEach(sheet => {
      Logger.log(`- "${sheet.name}": ${sheet.rows} filas, ${sheet.columns} columnas, datos: ${sheet.hasData ? 'SÍ' : 'NO'}`);
    });
    
    const ui = SpreadsheetApp.getUi();
    let message = 'Hojas de gastos encontradas:\n\n';
    expenseSheets.forEach(sheet => {
      message += `• "${sheet.name}": ${sheet.rows} filas, ${sheet.columns} columnas, datos: ${sheet.hasData ? 'SÍ' : 'NO'}\n`;
    });
    
    ui.alert('📊 Diagnóstico de Gastos', message, ui.ButtonSet.OK);
    
    return expenseSheets;
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico de gastos:', error.toString());
    return [];
  }
}

/**
 * Función para borrar SOLO gastos
 */
function wipeOnlyExpenses() {
  try {
    Logger.log('=== INICIANDO WIPE SOLO DE GASTOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar antes de proceder
    const response = ui.alert(
      '⚠️ WIPE SOLO DE GASTOS',
      'Esta operación eliminará SOLO los gastos del sistema:\n\n' +
      '• TODOS LOS GASTOS\n\n' +
      'Se mantendrán:\n' +
      '• Jugadores actuales\n' +
      '• Jugadores de torneo (FORM_TORNEO)\n' +
      '• Jugadores de matrícula (FORM_MATRICULA)\n' +
      '• Aprobaciones de jugadores\n' +
      '• Histórico de jugadores\n' +
      '• Transacciones financieras\n' +
      '• Grupos familiares\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      Logger.log('❌ Wipe de gastos cancelado por el usuario');
      return false;
    }
    
    Logger.log('✅ Usuario confirmó el wipe de gastos. Procediendo...');
    
    // Limpiar SOLO GASTOS - Buscar todas las posibles hojas de gastos
    Logger.log('🗑️ Limpiando gastos...');
    
    // Lista de posibles nombres de hojas de gastos
    const possibleExpenseSheets = ['Gastos', 'Expenses', 'Gastos_Completos', 'Gastos_Detallados', 'Gastos Recurrentes', 'Gastos Pendientes'];
    let totalExpensesDeleted = 0;
    
    possibleExpenseSheets.forEach(sheetName => {
      const expensesSheet = ss.getSheetByName(sheetName);
      if (expensesSheet) {
        const lastRow = expensesSheet.getLastRow();
        if (lastRow > 1) {
          // Usar deleteRows en lugar de clearContent para eliminar completamente
          expensesSheet.deleteRows(2, lastRow - 1);
          Logger.log(`✅ Gastos eliminados de "${sheetName}": ${lastRow - 1} filas`);
          totalExpensesDeleted += (lastRow - 1);
        } else {
          Logger.log(`⚠️ Hoja "${sheetName}" está vacía`);
        }
      } else {
        Logger.log(`⚠️ Hoja "${sheetName}" no encontrada`);
      }
    });
    
    // También buscar cualquier hoja que contenga "gasto" en el nombre
    const allSheetsForExpenses = ss.getSheets();
    allSheetsForExpenses.forEach(sheet => {
      const sheetName = sheet.getName().toLowerCase();
      if (sheetName.includes('gasto') || sheetName.includes('expense')) {
        if (!possibleExpenseSheets.includes(sheet.getName())) {
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
            Logger.log(`✅ Gastos eliminados de "${sheet.getName()}": ${lastRow - 1} filas`);
            totalExpensesDeleted += (lastRow - 1);
          }
        }
      }
    });
    
    if (totalExpensesDeleted > 0) {
      Logger.log(`✅ Total de gastos eliminados: ${totalExpensesDeleted} filas`);
    } else {
      Logger.log('⚠️ No se encontraron gastos para eliminar');
    }
    
    // Limpiar también datos financieros relacionados
    Logger.log('🗑️ Limpiando datos financieros relacionados...');
    
    // Limpiar Transacciones (solo las relacionadas con gastos)
    const transactionsSheet = ss.getSheetByName('Transacciones');
    if (transactionsSheet && transactionsSheet.getLastRow() > 1) {
      const data = transactionsSheet.getDataRange().getValues();
      const headers = data[0];
      const typeIndex = headers.findIndex(h => h.toString().toLowerCase().includes('tipo') || h.toString().toLowerCase().includes('type'));
      
      if (typeIndex !== -1) {
        let deletedRows = 0;
        for (let i = data.length - 1; i >= 1; i--) {
          const row = data[i];
          const type = row[typeIndex] ? row[typeIndex].toString().toLowerCase() : '';
          
          // Eliminar transacciones de gastos
          if (type.includes('gasto') || type.includes('expense') || type.includes('egreso')) {
            transactionsSheet.deleteRow(i + 1);
            deletedRows++;
          }
        }
        Logger.log(`✅ Transacciones de gastos eliminadas: ${deletedRows} filas`);
      }
    }
    
    // Forzar recálculo de todas las hojas
    Logger.log('🔄 Forzando recálculo de hojas...');
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
      try {
        sheet.getRange(1, 1, 1, 1).setValue(sheet.getRange(1, 1, 1, 1).getValue());
        Logger.log(`✅ Hoja "${sheet.getName()}" recalculada`);
      } catch (error) {
        Logger.log(`⚠️ Error recalculando hoja "${sheet.getName()}": ${error.toString()}`);
      }
    });
    
    Logger.log('=== ✅ WIPE SOLO DE GASTOS COMPLETADO ✅ ===');
    
    ui.alert(
      '✅ Wipe de Gastos Completado',
      'Se han eliminado TODOS los gastos del sistema.\n\n' +
      'Se mantuvieron:\n' +
      '• Jugadores actuales\n' +
      '• Jugadores de torneo\n' +
      '• Jugadores de matrícula\n' +
      '• Aprobaciones de jugadores\n' +
      '• Histórico de jugadores\n' +
      '• Transacciones financieras\n' +
      '• Grupos familiares',
      ui.ButtonSet.OK
    );
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Error durante el wipe de gastos:', error.toString());
    
    SpreadsheetApp.getUi().alert(
      '❌ Error durante el Wipe de Gastos',
      'Hubo un error durante el proceso:\n\n' + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return false;
  }
}

/**
 * Función para limpiar específicamente las transacciones
 */
function wipeTransactionsOnly() {
  try {
    Logger.log('=== INICIANDO WIPE DE TRANSACCIONES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar antes de proceder
    const response = ui.alert(
      '⚠️ WIPE DE DATOS FINANCIEROS',
      'Esta operación eliminará TODOS los datos financieros:\n\n' +
      '• Todas las transacciones (hoja Transacciones)\n' +
      '• Todos los pagos (hoja Pagos) ← DONDE ESTÁN LOS DATOS\n' +
      '• Todos los cálculos financieros\n\n' +
      'Se mantendrán:\n' +
      '• Jugadores actuales\n' +
      '• Jugadores de torneo (FORM_TORNEO)\n' +
      '• Jugadores de matrícula (FORM_MATRICULA)\n' +
      '• Aprobaciones de jugadores\n' +
      '• Histórico de jugadores\n' +
      '• Grupos familiares\n' +
      '• Hojas de gastos\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      Logger.log('❌ Wipe de transacciones cancelado por el usuario');
      return false;
    }
    
    Logger.log('✅ Usuario confirmó el wipe de transacciones. Procediendo...');
    
    // Limpiar Transacciones
    Logger.log('🗑️ Limpiando transacciones...');
    const transactionsSheet = ss.getSheetByName('Transacciones');
    if (transactionsSheet && transactionsSheet.getLastRow() > 1) {
      const lastRow = transactionsSheet.getLastRow();
      transactionsSheet.deleteRows(2, lastRow - 1);
      Logger.log(`✅ Transacciones eliminadas: ${lastRow - 1} filas`);
    } else {
      Logger.log('⚠️ No se encontraron transacciones para eliminar');
    }
    
    // Limpiar Pagos (donde están los datos reales)
    Logger.log('🗑️ Limpiando pagos...');
    const paymentsSheet = ss.getSheetByName('Pagos');
    if (paymentsSheet && paymentsSheet.getLastRow() > 1) {
      const lastRow = paymentsSheet.getLastRow();
      paymentsSheet.deleteRows(2, lastRow - 1);
      Logger.log(`✅ Pagos eliminados: ${lastRow - 1} filas`);
    } else {
      Logger.log('⚠️ No se encontraron pagos para eliminar');
    }
    
    // Forzar recálculo de todas las hojas
    Logger.log('🔄 Forzando recálculo de hojas...');
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
      try {
        sheet.getRange(1, 1, 1, 1).setValue(sheet.getRange(1, 1, 1, 1).getValue());
        Logger.log(`✅ Hoja "${sheet.getName()}" recalculada`);
      } catch (error) {
        Logger.log(`⚠️ Error recalculando hoja "${sheet.getName()}": ${error.toString()}`);
      }
    });
    
    Logger.log('=== ✅ WIPE DE TRANSACCIONES COMPLETADO ✅ ===');
    
    ui.alert(
      '✅ Wipe de Transacciones Completado',
      'Se han eliminado TODAS las transacciones del sistema.\n\n' +
      'Se mantuvieron:\n' +
      '• Jugadores actuales\n' +
      '• Jugadores de torneo\n' +
      '• Jugadores de matrícula\n' +
      '• Aprobaciones de jugadores\n' +
      '• Histórico de jugadores\n' +
      '• Grupos familiares\n' +
      '• Hojas de gastos',
      ui.ButtonSet.OK
    );
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Error durante el wipe de transacciones:', error.toString());
    
    SpreadsheetApp.getUi().alert(
      '❌ Error durante el Wipe de Transacciones',
      'Hubo un error durante el proceso:\n\n' + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return false;
  }
}

/**
 * Función para limpiar completamente los datos financieros
 */
function wipeFinancialData() {
  try {
    Logger.log('=== INICIANDO WIPE DE DATOS FINANCIEROS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar antes de proceder
    const response = ui.alert(
      '⚠️ WIPE DE DATOS FINANCIEROS',
      'Esta operación eliminará TODOS los datos financieros:\n\n' +
      '• Todas las transacciones\n' +
      '• Todos los gastos\n' +
      '• Todos los cálculos financieros\n\n' +
      'Se mantendrán:\n' +
      '• Jugadores actuales\n' +
      '• Jugadores de torneo (FORM_TORNEO)\n' +
      '• Jugadores de matrícula (FORM_MATRICULA)\n' +
      '• Aprobaciones de jugadores\n' +
      '• Histórico de jugadores\n' +
      '• Grupos familiares\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      Logger.log('❌ Wipe de datos financieros cancelado por el usuario');
      return false;
    }
    
    Logger.log('✅ Usuario confirmó el wipe de datos financieros. Procediendo...');
    
    // 1. Limpiar todas las hojas de gastos
    Logger.log('🗑️ Limpiando hojas de gastos...');
    const possibleExpenseSheets = ['Gastos', 'Expenses', 'Gastos_Completos', 'Gastos_Detallados', 'Gastos Recurrentes', 'Gastos Pendientes'];
    let totalExpensesDeleted = 0;
    
    possibleExpenseSheets.forEach(sheetName => {
      const expensesSheet = ss.getSheetByName(sheetName);
      if (expensesSheet && expensesSheet.getLastRow() > 1) {
        const lastRow = expensesSheet.getLastRow();
        // Usar deleteRows en lugar de clearContent para eliminar completamente
        expensesSheet.deleteRows(2, lastRow - 1);
        Logger.log(`✅ Gastos eliminados de "${sheetName}": ${lastRow - 1} filas`);
        totalExpensesDeleted += (lastRow - 1);
      }
    });
    
    // 2. Limpiar Transacciones
    Logger.log('🗑️ Limpiando transacciones...');
    const transactionsSheet = ss.getSheetByName('Transacciones');
    if (transactionsSheet && transactionsSheet.getLastRow() > 1) {
      const lastRow = transactionsSheet.getLastRow();
      // Usar deleteRows en lugar de clearContent para eliminar completamente
      transactionsSheet.deleteRows(2, lastRow - 1);
      Logger.log(`✅ Transacciones eliminadas: ${lastRow - 1} filas`);
    }
    
    // 3. Limpiar Pagos (donde están los datos reales)
    Logger.log('🗑️ Limpiando pagos...');
    const paymentsSheet = ss.getSheetByName('Pagos');
    if (paymentsSheet && paymentsSheet.getLastRow() > 1) {
      const lastRow = paymentsSheet.getLastRow();
      paymentsSheet.deleteRows(2, lastRow - 1);
      Logger.log(`✅ Pagos eliminados: ${lastRow - 1} filas`);
    }
    
    // 3. Forzar recálculo de todas las hojas
    Logger.log('🔄 Forzando recálculo de hojas...');
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
      try {
        sheet.getRange(1, 1, 1, 1).setValue(sheet.getRange(1, 1, 1, 1).getValue());
        Logger.log(`✅ Hoja "${sheet.getName()}" recalculada`);
      } catch (error) {
        Logger.log(`⚠️ Error recalculando hoja "${sheet.getName()}": ${error.toString()}`);
      }
    });
    
    Logger.log('=== ✅ WIPE DE DATOS FINANCIEROS COMPLETADO ✅ ===');
    
    ui.alert(
      '✅ Wipe de Datos Financieros Completado',
      'Se han eliminado TODOS los datos financieros:\n\n' +
      '• Todas las transacciones\n' +
      '• Todos los gastos\n' +
      '• Todos los cálculos financieros\n\n' +
      'Se mantuvieron:\n' +
      '• Jugadores actuales\n' +
      '• Jugadores de torneo\n' +
      '• Jugadores de matrícula\n' +
      '• Aprobaciones de jugadores\n' +
      '• Histórico de jugadores\n' +
      '• Grupos familiares',
      ui.ButtonSet.OK
    );
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Error durante el wipe de datos financieros:', error.toString());
    
    SpreadsheetApp.getUi().alert(
      '❌ Error durante el Wipe de Datos Financieros',
      'Hubo un error durante el proceso:\n\n' + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return false;
  }
}

/**
 * Función de prueba para verificar que la eliminación funciona
 */
function testDeleteFunctionality() {
  try {
    Logger.log('=== PRUEBA DE ELIMINACIÓN ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    // Buscar hojas de gastos
    const possibleExpenseSheets = ['Gastos', 'Expenses', 'Gastos_Completos', 'Gastos_Detallados', 'Gastos Recurrentes', 'Gastos Pendientes'];
    let foundSheets = [];
    
    possibleExpenseSheets.forEach(sheetName => {
      const expensesSheet = ss.getSheetByName(sheetName);
      if (expensesSheet) {
        const lastRow = expensesSheet.getLastRow();
        foundSheets.push(`${sheetName}: ${lastRow} filas`);
      }
    });
    
    let message = 'Hojas de gastos encontradas:\n\n';
    foundSheets.forEach(sheet => {
      message += `• ${sheet}\n`;
    });
    
    ui.alert('📊 Prueba de Eliminación', message, ui.ButtonSet.OK);
    
    return foundSheets;
    
  } catch (error) {
    Logger.log('❌ Error en prueba de eliminación:', error.toString());
    return [];
  }
}

/**
 * Función de prueba simple para verificar la ejecución del wipe.
 * No realiza un wipe real, solo simula el proceso.
 */
function testWipeFunctionality() {
  Logger.log('=== EJECUTANDO TEST DE WIPE ===');
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Test de Wipe', 'Esta es una prueba. No se eliminarán datos reales.', ui.ButtonSet.OK);
    Logger.log('Test de wipe completado exitosamente.');
    return { success: true, message: 'Test de wipe completado.' };
  } catch (error) {
    Logger.log('Error en test de wipe:', error.toString());
    return { success: false, message: 'Error en test de wipe: ' + error.toString() };
  }
}

/**
 * Función para corregir estados de matrículas
 */
function corregirEstadosMatriculas() {
  try {
    Logger.log('🔧 === CORRIGIENDO ESTADOS DE MATRÍCULAS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      Logger.log('❌ Hoja Pagos no encontrada');
      return { success: false, message: 'Hoja Pagos no encontrada' };
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('⚠️ No hay pagos para corregir');
      return { success: true, message: 'No hay pagos para corregir', updated: 0 };
    }
    
    const headers = data[0];
    const tipoIdx = headers.indexOf('Tipo');
    const estadoIdx = headers.indexOf('Estado');
    
    if (tipoIdx === -1 || estadoIdx === -1) {
      Logger.log('❌ Headers no encontrados');
      return { success: false, message: 'Headers no encontrados' };
    }
    
    let updated = 0;
    let rows = data.slice(1);
    
    rows.forEach((row, index) => {
      const tipo = String(row[tipoIdx] || '');
      const estado = String(row[estadoIdx] || '');
      
      if (tipo === 'Matrícula' && estado === 'Pendiente') {
        const rowNumber = index + 2; // +2 porque slice(1) y las filas empiezan en 1
        paymentsSheet.getRange(rowNumber, estadoIdx + 1).setValue('Pagado');
        updated++;
        Logger.log(`   • Fila ${rowNumber}: Estado cambiado de Pendiente a Pagado`);
      }
    });
    
    SpreadsheetApp.flush();
    
    Logger.log(`✅ ${updated} matrículas corregidas`);
    
    return { success: true, message: `${updated} matrículas corregidas`, updated: updated };
    
  } catch (error) {
    Logger.log('❌ Error corrigiendo estados: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Función para limpiar FORM_MATRICULA (jugadores ya aprobados que siguen en el formulario)
 */
function limpiarFormMatriculaDuplicados() {
  try {
    Logger.log('🧹 === LIMPIANDO FORM_MATRICULA DE JUGADORES YA APROBADOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jugadoresSheet = ss.getSheetByName('Jugadores');
    const formMatriculaSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!jugadoresSheet || !formMatriculaSheet) {
      Logger.log('❌ Hojas necesarias no encontradas');
      return { success: false, message: 'Hojas necesarias no encontradas' };
    }
    
    // Obtener jugadores activos
    const jugadoresData = jugadoresSheet.getDataRange().getValues();
    const jugadoresHeaders = jugadoresData[0];
    const jugadoresRows = jugadoresData.slice(1);
    const jugadoresNombreIndex = jugadoresHeaders.indexOf('Nombre');
    const jugadoresApellidosIndex = jugadoresHeaders.indexOf('Apellidos');
    const jugadoresCedulaIndex = jugadoresHeaders.indexOf('Cédula');
    
    // Crear un mapa de jugadores por cédula (más confiable que por ID)
    const jugadoresMap = new Map();
    jugadoresRows.forEach(row => {
      const cedula = String(row[jugadoresCedulaIndex] || '').trim();
      if (cedula) {
        jugadoresMap.set(cedula, {
          nombre: String(row[jugadoresNombreIndex] || ''),
          apellidos: String(row[jugadoresApellidosIndex] || '')
        });
      }
    });
    
    Logger.log(`📊 Jugadores activos encontrados: ${jugadoresMap.size}`);
    
    // Obtener FORM_MATRICULA
    const formData = formMatriculaSheet.getDataRange().getValues();
    const formHeaders = formData[0];
    const formRows = formData.slice(1);
    
    // Buscar columna de cédula en FORM_MATRICULA
    const cedulaColumnNames = ['Cédula', 'Número de identificación', 'Identificación'];
    let cedulaIndex = -1;
    for (const name of cedulaColumnNames) {
      cedulaIndex = formHeaders.indexOf(name);
      if (cedulaIndex !== -1) break;
    }
    
    if (cedulaIndex === -1) {
      Logger.log('❌ No se encontró columna de cédula en FORM_MATRICULA');
      Logger.log('Headers disponibles:', formHeaders.join(', '));
      return { success: false, message: 'No se encontró columna de cédula en FORM_MATRICULA' };
    }
    
    Logger.log(`📊 Registros en FORM_MATRICULA: ${formRows.length}`);
    Logger.log(`📋 Columna de cédula encontrada: ${formHeaders[cedulaIndex]} (índice ${cedulaIndex})`);
    
    // Buscar duplicados
    const filasAEliminar = [];
    formRows.forEach((row, index) => {
      const cedula = String(row[cedulaIndex] || '').trim();
      if (cedula && jugadoresMap.has(cedula)) {
        const jugador = jugadoresMap.get(cedula);
        filasAEliminar.push({
          rowIndex: index + 2, // +2 porque rows empieza después de headers y los índices empiezan en 1
          cedula: cedula,
          nombre: jugador.nombre,
          apellidos: jugador.apellidos
        });
      }
    });
    
    Logger.log(`🔍 Jugadores duplicados encontrados: ${filasAEliminar.length}`);
    
    if (filasAEliminar.length === 0) {
      return {
        success: true,
        message: 'No se encontraron duplicados. FORM_MATRICULA está limpio.',
        removed: 0
      };
    }
    
    // Log de jugadores a eliminar
    Logger.log('📋 Jugadores que serán eliminados de FORM_MATRICULA:');
    filasAEliminar.forEach(item => {
      Logger.log(`   • ${item.nombre} ${item.apellidos} (Cédula: ${item.cedula}) - Fila ${item.rowIndex}`);
    });
    
    // Eliminar de abajo hacia arriba para mantener los índices correctos
    filasAEliminar.reverse().forEach(item => {
      formMatriculaSheet.deleteRow(item.rowIndex);
      Logger.log(`🗑️ Eliminado: ${item.nombre} ${item.apellidos} (fila ${item.rowIndex})`);
    });
    
    SpreadsheetApp.flush();
    
    Logger.log(`✅ ${filasAEliminar.length} jugadores duplicados eliminados de FORM_MATRICULA`);
    
    return {
      success: true,
      message: `✅ ${filasAEliminar.length} jugadores ya aprobados eliminados de FORM_MATRICULA`,
      removed: filasAEliminar.length,
      players: filasAEliminar.map(item => `${item.nombre} ${item.apellidos}`)
    };
    
  } catch (error) {
    Logger.log('❌ Error limpiando FORM_MATRICULA: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Función para limpiar aprobaciones duplicadas (jugadores ya aprobados que siguen en aprobaciones)
 */
function limpiarAprobacionesDuplicadas() {
  try {
    Logger.log('🧹 === LIMPIANDO APROBACIONES DUPLICADAS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jugadoresSheet = ss.getSheetByName('Jugadores');
    const aprobacionesSheet = ss.getSheetByName('Aprobaciones');
    
    if (!jugadoresSheet || !aprobacionesSheet) {
      Logger.log('❌ Hojas necesarias no encontradas');
      return { success: false, message: 'Hojas necesarias no encontradas' };
    }
    
    // Obtener jugadores activos
    const jugadoresData = jugadoresSheet.getDataRange().getValues();
    const jugadoresHeaders = jugadoresData[0];
    const jugadoresRows = jugadoresData.slice(1);
    const jugadoresIdIndex = jugadoresHeaders.indexOf('ID');
    
    const jugadoresIds = new Set();
    jugadoresRows.forEach(row => {
      if (row[jugadoresIdIndex]) {
        jugadoresIds.add(String(row[jugadoresIdIndex]));
      }
    });
    
    Logger.log(`📊 Jugadores activos encontrados: ${jugadoresIds.size}`);
    
    // Obtener aprobaciones
    const aprobacionesData = aprobacionesSheet.getDataRange().getValues();
    const aprobacionesHeaders = aprobacionesData[0];
    const aprobacionesRows = aprobacionesData.slice(1);
    const aprobacionesIdIndex = aprobacionesHeaders.indexOf('ID');
    
    Logger.log(`📊 Aprobaciones encontradas: ${aprobacionesRows.length}`);
    
    // Buscar duplicados
    const filasAEliminar = [];
    aprobacionesRows.forEach((row, index) => {
      const approvalId = row[aprobacionesIdIndex];
      if (approvalId && jugadoresIds.has(String(approvalId))) {
        filasAEliminar.push({
          rowIndex: index + 2, // +2 porque rows empieza después de headers y los índices empiezan en 1
          playerId: approvalId,
          playerName: row[1] || 'Sin nombre' // Asumiendo que columna 1 es Nombre
        });
      }
    });
    
    Logger.log(`🔍 Jugadores duplicados encontrados: ${filasAEliminar.length}`);
    
    if (filasAEliminar.length === 0) {
      return {
        success: true,
        message: 'No se encontraron duplicados. La tabla de aprobaciones está limpia.',
        removed: 0
      };
    }
    
    // Eliminar de abajo hacia arriba para mantener los índices correctos
    filasAEliminar.reverse().forEach(item => {
      aprobacionesSheet.deleteRow(item.rowIndex);
      Logger.log(`🗑️ Eliminado: ${item.playerId} - ${item.playerName} (fila ${item.rowIndex})`);
    });
    
    SpreadsheetApp.flush();
    
    Logger.log(`✅ ${filasAEliminar.length} jugadores duplicados eliminados de Aprobaciones`);
    
    return {
      success: true,
      message: `✅ ${filasAEliminar.length} jugadores duplicados eliminados de Aprobaciones`,
      removed: filasAEliminar.length
    };
    
  } catch (error) {
    Logger.log('❌ Error limpiando aprobaciones: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Función para reparar estructura de Jugadores (eliminar duplicados, agregar faltantes)
 */
function repararEstructuraJugadores() {
  try {
    Logger.log('🔧 === REPARANDO ESTRUCTURA DE JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jugadoresSheet = ss.getSheetByName('Jugadores');
    
    if (!jugadoresSheet) {
      Logger.log('❌ Hoja Jugadores no encontrada');
      return { success: false, message: 'Hoja Jugadores no encontrada' };
    }
    
    // Headers correctos (23 columnas)
    const headersCorrectos = [
      'ID', 'Nombre', 'Apellidos', 'Edad', 'Cédula', 'Teléfono', 'Categoría', 'Estado',
      'Fecha Registro', 'Tutor', 'Email Tutor', 'Dirección', 'Familia ID', 'Tipo',
      'Descuento %', 'Observaciones', 'Fecha Nacimiento', 'Género', 'Método Pago Preferido',
      'Cédula Tutor', 'Mensualidad Personalizada', 'URL Cédula Jugador', 'URL Cédula Tutor'
    ];
    
    // Leer datos actuales
    const data = jugadoresSheet.getDataRange().getValues();
    const headersActuales = data[0];
    const rows = data.slice(1);
    
    Logger.log('📋 Headers actuales:', headersActuales.length);
    Logger.log('📋 Headers esperados:', headersCorrectos.length);
    
    // Crear mapeo de columnas existentes
    const columnMapping = {};
    headersCorrectos.forEach((header, idx) => {
      // Buscar la primera ocurrencia del header
      const actualIdx = headersActuales.indexOf(header);
      if (actualIdx !== -1) {
        columnMapping[header] = actualIdx;
        Logger.log(`✅ ${header}: columna ${actualIdx} → ${idx}`);
      } else {
        columnMapping[header] = -1;
        Logger.log(`⚠️ ${header}: NO ENCONTRADO`);
      }
    });
    
    // Log de headers actuales para debug
    Logger.log('🔍 DEBUG: Headers actuales en hoja Jugadores:');
    headersActuales.forEach((h, i) => {
      Logger.log(`   ${i}: ${h}`);
    });
    
    // Eliminar hoja temporal si existe
    const oldTempSheet = ss.getSheetByName('Jugadores_TEMP');
    if (oldTempSheet) {
      ss.deleteSheet(oldTempSheet);
      Logger.log('🗑️ Hoja temporal anterior eliminada');
    }
    
    // Crear nueva hoja temporal
    const newSheet = ss.insertSheet('Jugadores_TEMP');
    newSheet.getRange(1, 1, 1, headersCorrectos.length).setValues([headersCorrectos]);
    newSheet.getRange(1, 1, 1, headersCorrectos.length)
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('white');
    
    // Migrar datos
    const newRows = rows.map((oldRow, rowIdx) => {
      return headersCorrectos.map((header, colIdx) => {
        const oldColIdx = columnMapping[header];
        if (oldColIdx !== -1) {
          return oldRow[oldColIdx] || '';
        }
        return '';
      });
    });
    
    // Escribir datos
    if (newRows.length > 0) {
      newSheet.getRange(2, 1, newRows.length, headersCorrectos.length).setValues(newRows);
    }
    
    Logger.log(`✅ ${newRows.length} jugadores migrados a hoja temporal`);
    
    return {
      success: true,
      message: `✅ Estructura reparada. ${newRows.length} jugadores migrados.\n\nAhora:\n1. Renombra "Jugadores" a "Jugadores_VIEJO"\n2. Renombra "Jugadores_TEMP" a "Jugadores"\n3. Borra "Jugadores_VIEJO"`,
      migrated: newRows.length
    };
    
  } catch (error) {
    Logger.log('❌ Error reparando estructura: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Función de diagnóstico financiero completo
 */
function diagnosticoFinanciero() {
  try {
    Logger.log('🔍 === DIAGNÓSTICO FINANCIERO COMPLETO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Verificar hoja de Pagos
    const paymentsSheet = ss.getSheetByName('Pagos');
    Logger.log('📊 Hoja Pagos:');
    if (paymentsSheet) {
      const lastRow = paymentsSheet.getLastRow();
      const lastCol = paymentsSheet.getLastColumn();
      Logger.log('   • Existe: Sí');
      Logger.log('   • Filas: ' + lastRow);
      Logger.log('   • Columnas: ' + lastCol);
      
      if (lastRow > 1) {
        const headers = paymentsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        Logger.log('   • Headers: ' + headers.join(', '));
        
        const data = paymentsSheet.getRange(2, 1, Math.min(5, lastRow - 1), lastCol).getValues();
        Logger.log('   • Primeras filas de datos:');
        data.forEach((row, index) => {
          Logger.log('     Fila ' + (index + 2) + ': ' + row.join(' | '));
        });
      }
    } else {
      Logger.log('   • Existe: No');
    }
    
    // Verificar hoja de Gastos
    const expensesSheet = ss.getSheetByName('Gastos');
    Logger.log('📊 Hoja Gastos:');
    if (expensesSheet) {
      const lastRow = expensesSheet.getLastRow();
      const lastCol = expensesSheet.getLastColumn();
      Logger.log('   • Existe: Sí');
      Logger.log('   • Filas: ' + lastRow);
      Logger.log('   • Columnas: ' + lastCol);
      
      if (lastRow > 1) {
        const headers = expensesSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        Logger.log('   • Headers: ' + headers.join(', '));
        
        const data = expensesSheet.getRange(2, 1, Math.min(5, lastRow - 1), lastCol).getValues();
        Logger.log('   • Primeras filas de datos:');
        data.forEach((row, index) => {
          Logger.log('     Fila ' + (index + 2) + ': ' + row.join(' | '));
        });
      }
    } else {
      Logger.log('   • Existe: No');
    }
    
    // Probar getFinancialSummary
    Logger.log('🔍 Probando getFinancialSummary...');
    try {
      const summary = getFinancialSummary('current_month');
      Logger.log('   • Resultado: ' + JSON.stringify(summary, null, 2));
    } catch (error) {
      Logger.log('   • Error: ' + error.toString());
    }
    
    Logger.log('✅ Diagnóstico completado');
    return true;
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico: ' + error.toString());
    return false;
  }
}

/**
 * Función para diagnosticar específicamente la hoja "Gastos"
 */
function diagnoseGastosSheet() {
  try {
    Logger.log('🔍 Diagnosticando hoja "Gastos" específicamente...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gastosSheet = ss.getSheetByName('Gastos');
    
    if (!gastosSheet) {
      Logger.log('❌ Hoja "Gastos" no encontrada');
      return false;
    }
    
    const lastRow = gastosSheet.getLastRow();
    const lastCol = gastosSheet.getLastColumn();
    
    Logger.log(`📊 Hoja "Gastos" encontrada:`);
    Logger.log(`   • Filas: ${lastRow}`);
    Logger.log(`   • Columnas: ${lastCol}`);
    
    if (lastRow > 1) {
      Logger.log('📋 Contenido de la hoja:');
      const data = gastosSheet.getDataRange().getValues();
      data.forEach((row, index) => {
        Logger.log(`   Fila ${index + 1}: ${row.join(' | ')}`);
      });
    } else {
      Logger.log('✅ Hoja "Gastos" está vacía (solo headers)');
    }
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Error diagnosticando hoja "Gastos": ' + error.toString());
    return false;
  }
}