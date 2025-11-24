/**
 * ========================================
 * ARCHIVO: HistoricManager.gs
 * DESCRIPCIÓN: Gestión de histórico completo de formularios
 * FUNCIONES: Clonar datos, mantener histórico, gestionar movimientos
 * ========================================
 */

/**
 * Elimina un registro de FORM_MATRICULA basado en el timestamp
 * @param {string} timestamp - Marca temporal del registro a eliminar
 */
function deleteFromFormMatricula(timestamp) {
  try {
    Logger.log('=== ELIMINANDO REGISTRO DE FORM_MATRICULA ===');
    Logger.log('Timestamp a buscar:', timestamp);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!formSheet) {
      Logger.log('Hoja FORM_MATRICULA no encontrada');
      return { success: false, message: 'Hoja FORM_MATRICULA no encontrada' };
    }
    
    const data = formSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No hay datos en FORM_MATRICULA');
      return { success: false, message: 'No hay datos en FORM_MATRICULA' };
    }
    
    // Buscar la fila con el timestamp
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      const rowTimestamp = data[i][0]; // Columna A = Marca temporal
      if (rowTimestamp && rowTimestamp.toString() === timestamp.toString()) {
        rowToDelete = i + 1; // +1 porque las filas empiezan en 1
        break;
      }
    }
    
    if (rowToDelete === -1) {
      Logger.log('No se encontró el registro con timestamp:', timestamp);
      return { success: false, message: 'Registro no encontrado en FORM_MATRICULA' };
    }
    
    // Eliminar la fila
    formSheet.deleteRow(rowToDelete);
    SpreadsheetApp.flush();
    
    Logger.log(`Fila ${rowToDelete} eliminada de FORM_MATRICULA`);
    
    return {
      success: true,
      message: 'Registro eliminado de FORM_MATRICULA',
      deletedRow: rowToDelete
    };
    
  } catch (error) {
    Logger.log('Error eliminando de FORM_MATRICULA: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Obtiene todos los datos del histórico para mostrar en el modal
 */
function getHistoricData() {
  try {
    Logger.log('=== OBTENIENDO DATOS DEL HISTÓRICO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!historicSheet) {
      Logger.log('❌ Hoja Historico_Completo no encontrada');
      return { success: false, message: 'Hoja Historico_Completo no encontrada' };
    }
    
    const data = historicSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('📋 No hay datos en el histórico');
      return { success: true, data: [] };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log(`📊 Encontrados ${rows.length} registros en el histórico`);
    
    // Mapear los datos a un formato más legible
    const historicData = rows.map((row, index) => {
      const historicId = row[0] || '';
      const fechaRegistro = row[1] || '';
      const accion = row[2] || '';
      const estado = row[3] || '';
      
      // Buscar nombre en los datos del formulario (dependiendo de la estructura)
      let nombre = '';
      let motivoRechazo = '';
      
      // Intentar encontrar nombre en diferentes posiciones
      for (let i = 4; i < row.length; i++) {
        if (row[i] && typeof row[i] === 'string') {
          // Si contiene un nombre (más de 2 caracteres, no es fecha, no es número)
          if (row[i].length > 2 && !row[i].match(/^\d/) && !row[i].match(/^\d{4}-\d{2}-\d{2}/)) {
            nombre = row[i];
            break;
          }
        }
      }
      
      // Si no se encuentra nombre, usar ID como fallback
      if (!nombre) {
        nombre = historicId;
      }
      
      // Buscar motivo de rechazo si es un rechazo
      if (accion === 'RECHAZADO') {
        // Buscar en observaciones o campos adicionales
        for (let i = 4; i < row.length; i++) {
          if (row[i] && typeof row[i] === 'string' && row[i].length > 10) {
            motivoRechazo = row[i];
            break;
          }
        }
      }
      
      return {
        id: historicId,
        nombre: nombre,
        accion: accion,
        estado: estado,
        fecha: fechaRegistro instanceof Date ? 
               Utilities.formatDate(fechaRegistro, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : 
               fechaRegistro,
        motivo_rechazo: motivoRechazo
      };
    });
    
    // Ordenar por fecha más reciente primero
    historicData.sort((a, b) => {
      const dateA = new Date(a.fecha);
      const dateB = new Date(b.fecha);
      return dateB - dateA;
    });
    
    Logger.log(`✅ Datos del histórico procesados: ${historicData.length} registros`);
    
    return {
      success: true,
      data: historicData
    };
    
  } catch (error) {
    Logger.log('❌ Error obteniendo datos del histórico: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Obtiene estadísticas del histórico para los contadores
 */
function getHistoricStats() {
  try {
    Logger.log('=== OBTENIENDO ESTADÍSTICAS DEL HISTÓRICO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!historicSheet) {
      Logger.log('❌ Hoja Historico_Completo no encontrada');
      return { success: false, message: 'Hoja Historico_Completo no encontrada' };
    }
    
    const data = historicSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('📋 No hay datos en el histórico');
      return { 
        success: true, 
        stats: {
          total: 0,
          approvedToday: 0,
          rejectedToday: 0,
          approved: 0,
          rejected: 0,
          scholarship: 0
        }
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const today = new Date();
    const todayString = today.toDateString();
    
    let total = 0;
    let approvedToday = 0;
    let rejectedToday = 0;
    let approved = 0;
    let rejected = 0;
    let scholarship = 0;
    
    rows.forEach(row => {
      const fechaRegistro = row[1];
      const accion = row[2];
      const estado = row[3];
      
      total++;
      
      // Contar por acción
      if (accion === 'APROBADO') {
        approved++;
        // Verificar si es de hoy
        if (fechaRegistro instanceof Date && fechaRegistro.toDateString() === todayString) {
          approvedToday++;
        }
      } else if (accion === 'RECHAZADO') {
        rejected++;
        // Verificar si es de hoy
        if (fechaRegistro instanceof Date && fechaRegistro.toDateString() === todayString) {
          rejectedToday++;
        }
      } else if (accion === 'APROBADO_BECADO') {
        scholarship++;
        // Los becados también cuentan como aprobados hoy si son de hoy
        if (fechaRegistro instanceof Date && fechaRegistro.toDateString() === todayString) {
          approvedToday++;
        }
      }
    });
    
    const stats = {
      total: total,
      approvedToday: approvedToday,
      rejectedToday: rejectedToday,
      approved: approved,
      rejected: rejected,
      scholarship: scholarship
    };
    
    Logger.log('📊 Estadísticas del histórico:', stats);
    
    return {
      success: true,
      stats: stats
    };
    
  } catch (error) {
    Logger.log('❌ Error obteniendo estadísticas del histórico: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Reaprobar un jugador rechazado, moviéndolo de vuelta al proceso de aprobaciones
 */
function reapprovePlayer(historicId) {
  try {
    Logger.log('=== REAPROBANDO JUGADOR ===');
    Logger.log('ID Histórico:', historicId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!historicSheet) {
      return { success: false, message: 'Hoja Historico_Completo no encontrada' };
    }
    
    const data = historicSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Buscar el registro histórico
    const historicIdIndex = headers.indexOf('ID Histórico');
    const rowIndex = rows.findIndex(row => row[historicIdIndex] === historicId);
    
    if (rowIndex === -1) {
      return { success: false, message: 'Registro histórico no encontrado' };
    }
    
    const historicRow = rows[rowIndex];
    
    // Verificar que es un rechazo
    const accionIndex = headers.indexOf('Acción');
    if (historicRow[accionIndex] !== 'RECHAZADO') {
      return { success: false, message: 'Solo se pueden reaprobar jugadores rechazados' };
    }
    
    // Obtener datos del jugador del histórico
    const fechaRegistroIndex = headers.indexOf('Fecha de Registro en Histórico');
    const estadoIndex = headers.indexOf('Estado Final');
    
    // Crear nuevo registro de aprobación
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    // Generar nuevo ID de aprobación
    const newApprovalId = `APR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Crear fila para Aprobaciones (usando los datos del histórico)
    const newApprovalRow = [
      newApprovalId,                    // ID
      historicRow[4] || '',             // Nombre (ajustar índice según estructura)
      historicRow[5] || '',             // Apellidos
      historicRow[6] || '',             // Edad
      historicRow[7] || '',             // Cédula
      historicRow[8] || '',             // Teléfono
      historicRow[9] || '',             // Categoría
      'Pendiente',                      // Estado
      new Date(),                       // Marca temporal (nueva)
      historicRow[10] || '',            // Tutor
      historicRow[11] || '',            // Email Tutor
      historicRow[12] || '',            // Dirección
      historicRow[13] || '',            // Familia ID
      historicRow[14] || '',            // Tipo
      historicRow[15] || '',            // Descuento %
      historicRow[16] || '',            // Observaciones
      historicRow[17] || '',            // Fecha Nacimiento
      historicRow[18] || '',            // Género
      historicRow[19] || '',            // Método Pago Preferido
      historicRow[20] || '',            // Cédula Tutor
      historicRow[21] || '',            // Mensualidad Personalizada
      historicRow[22] || '',            // URL Cédula Jugador
      historicRow[23] || '',            // URL Cédula Tutor
      historicRow[24] || '',            // Comprobante de pago
      'FORM_MATRICULA'                  // Fuente (default)
    ];
    
    // Agregar a Aprobaciones
    approvalsSheet.appendRow(newApprovalRow);
    
    // Actualizar el histórico para marcar como reaprobado
    const rowToUpdate = rowIndex + 2; // +2 porque empezamos desde 1 y saltamos headers
    historicSheet.getRange(rowToUpdate, estadoIndex + 1).setValue('Reaprobado');
    
    Logger.log(`✅ Jugador reaprobado: ${newApprovalId}`);
    
    return {
      success: true,
      message: 'Jugador reaprobado exitosamente',
      newApprovalId: newApprovalId
    };
    
  } catch (error) {
    Logger.log('❌ Error reaprobando jugador: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función de diagnóstico para verificar el proceso de aprobación de torneos
 */
function testTournamentApprovalProcess() {
  try {
    Logger.log('=== DIAGNÓSTICO DEL PROCESO DE APROBACIÓN DE TORNEOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Verificar que existe FORM_TORNEO
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    if (!torneoSheet) {
      Logger.log('❌ Hoja FORM_TORNEO no encontrada');
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    // 2. Verificar que existe la hoja de Aprobaciones
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      Logger.log('❌ Hoja Aprobaciones no encontrada');
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    // 3. Verificar que existe la hoja de Histórico
    const historicSheet = ss.getSheetByName('Historico_Completo');
    if (!historicSheet) {
      Logger.log('❌ Hoja Historico_Completo no encontrada');
      return { success: false, message: 'Hoja Historico_Completo no encontrada' };
    }
    
    // 4. Buscar jugadores de torneo en Aprobaciones
    const approvalsData = approvalsSheet.getDataRange().getValues();
    const headers = approvalsData[0];
    const rows = approvalsData.slice(1);
    
    const fuenteIndex = headers.indexOf('Fuente');
    const idIndex = headers.indexOf('ID');
    const timestampIndex = headers.indexOf('Marca temporal');
    
    const torneoApprovals = rows.filter(row => row[fuenteIndex] === 'FORM_TORNEO');
    
    Logger.log(`📊 Jugadores de torneo en Aprobaciones: ${torneoApprovals.length}`);
    
    if (torneoApprovals.length > 0) {
      Logger.log('📝 Ejemplos de jugadores de torneo:');
      torneoApprovals.slice(0, 3).forEach((row, index) => {
        Logger.log(`  ${index + 1}. ID: ${row[idIndex]}, Timestamp: ${row[timestampIndex]}`);
      });
    }
    
    // 5. Verificar función deleteFromFormTorneo
    Logger.log('🧪 Probando función deleteFromFormTorneo...');
    if (torneoApprovals.length > 0) {
      const testTimestamp = torneoApprovals[0][timestampIndex];
      Logger.log(`Timestamp de prueba: ${testTimestamp}`);
      
      // Verificar que existe en FORM_TORNEO
      const torneoData = torneoSheet.getDataRange().getValues();
      const torneoRowIndex = torneoData.findIndex((row, idx) => idx > 0 && row[0] && row[0].toString() === testTimestamp.toString());
      
      if (torneoRowIndex !== -1) {
        Logger.log('✓ Timestamp encontrado en FORM_TORNEO');
      } else {
        Logger.log('⚠️ Timestamp no encontrado en FORM_TORNEO');
      }
    }
    
    Logger.log('✅ Diagnóstico completado');
    
    return {
      success: true,
      message: 'Diagnóstico completado exitosamente',
      details: {
        torneoApprovals: torneoApprovals.length,
        formTorneoExists: !!torneoSheet,
        approvalsExists: !!approvalsSheet,
        historicExists: !!historicSheet
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función para diagnosticar un jugador específico de torneo
 */
function diagnoseTournamentPlayer(approvalId) {
  try {
    Logger.log('=== DIAGNÓSTICO DE JUGADOR DE TORNEO ===');
    Logger.log('ID de aprobación:', approvalId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Buscar en Aprobaciones
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    const approvalsData = approvalsSheet.getDataRange().getValues();
    const headers = approvalsData[0];
    const rows = approvalsData.slice(1);
    
    const idIndex = headers.indexOf('ID');
    const timestampIndex = headers.indexOf('Marca temporal');
    const fuenteIndex = headers.indexOf('Fuente');
    const nombreIndex = headers.indexOf('Nombre');
    
    const playerRow = rows.find(row => row[idIndex] === approvalId);
    
    if (!playerRow) {
      return { success: false, message: 'Jugador no encontrado en Aprobaciones' };
    }
    
    const timestamp = playerRow[timestampIndex];
    const fuente = playerRow[fuenteIndex];
    const nombre = playerRow[nombreIndex];
    
    Logger.log(`Jugador encontrado: ${nombre}`);
    Logger.log(`Fuente: ${fuente}`);
    Logger.log(`Timestamp: ${timestamp}`);
    
    // 2. Verificar en FORM_TORNEO
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    let existsInTorneo = false;
    let torneoRowIndex = -1;
    
    if (torneoSheet && timestamp) {
      const torneoData = torneoSheet.getDataRange().getValues();
      
      for (let i = 1; i < torneoData.length; i++) {
        const rowTimestamp = torneoData[i][0];
        if (rowTimestamp && rowTimestamp.toString() === timestamp.toString()) {
          existsInTorneo = true;
          torneoRowIndex = i + 1;
          break;
        }
      }
    }
    
    // 3. Verificar en Histórico
    const historicSheet = ss.getSheetByName('Historico_Completo');
    let existsInHistoric = false;
    
    if (historicSheet) {
      const historicData = historicSheet.getDataRange().getValues();
      
      for (let i = 1; i < historicData.length; i++) {
        const historicRow = historicData[i];
        // Buscar por timestamp o ID en diferentes columnas
        for (let j = 0; j < historicRow.length; j++) {
          if (historicRow[j] && historicRow[j].toString() === timestamp.toString()) {
            existsInHistoric = true;
            break;
          }
        }
        if (existsInHistoric) break;
      }
    }
    
    const diagnosis = {
      playerId: approvalId,
      playerName: nombre,
      fuente: fuente,
      timestamp: timestamp,
      existsInAprobaciones: true,
      existsInTorneo: existsInTorneo,
      existsInHistoric: existsInHistoric,
      torneoRowIndex: torneoRowIndex
    };
    
    Logger.log('📊 Diagnóstico completo:', diagnosis);
    
    return {
      success: true,
      diagnosis: diagnosis
    };
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico de jugador: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función para probar directamente la eliminación de FORM_TORNEO
 */
function testDeleteFromFormTorneo(approvalId) {
  try {
    Logger.log('=== PROBANDO ELIMINACIÓN DE FORM_TORNEO ===');
    Logger.log('ID de aprobación:', approvalId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Buscar en Aprobaciones
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    const approvalsData = approvalsSheet.getDataRange().getValues();
    const headers = approvalsData[0];
    const rows = approvalsData.slice(1);
    
    const idIndex = headers.indexOf('ID');
    const timestampIndex = headers.indexOf('Marca temporal');
    const fuenteIndex = headers.indexOf('Fuente');
    const nombreIndex = headers.indexOf('Nombre');
    
    const playerRow = rows.find(row => row[idIndex] === approvalId);
    
    if (!playerRow) {
      return { success: false, message: 'Jugador no encontrado en Aprobaciones' };
    }
    
    const timestamp = playerRow[timestampIndex];
    const fuente = playerRow[fuenteIndex];
    const nombre = playerRow[nombreIndex];
    
    Logger.log(`Jugador encontrado: ${nombre}`);
    Logger.log(`Fuente: ${fuente}`);
    Logger.log(`Timestamp: ${timestamp}`);
    
    if (fuente !== 'FORM_TORNEO') {
      return { success: false, message: 'Este jugador no es de FORM_TORNEO' };
    }
    
    // 2. Verificar en FORM_TORNEO antes de eliminar
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    if (!torneoSheet) {
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    const torneoData = torneoSheet.getDataRange().getValues();
    Logger.log(`FORM_TORNEO tiene ${torneoData.length - 1} registros`);
    
    let torneoRowIndex = -1;
    for (let i = 1; i < torneoData.length; i++) {
      const rowTimestamp = torneoData[i][0];
      Logger.log(`Fila ${i}: timestamp="${rowTimestamp}"`);
      if (rowTimestamp && rowTimestamp.toString() === timestamp.toString()) {
        torneoRowIndex = i + 1;
        Logger.log(`✓ Timestamp encontrado en fila ${torneoRowIndex}`);
        break;
      }
    }
    
    if (torneoRowIndex === -1) {
      return { success: false, message: 'Timestamp no encontrado en FORM_TORNEO' };
    }
    
    // 3. Intentar eliminar
    Logger.log(`Intentando eliminar fila ${torneoRowIndex} de FORM_TORNEO...`);
    const deleteResult = deleteFromFormTorneo(timestamp);
    
    Logger.log('Resultado de eliminación:', deleteResult);
    
    // 4. Verificar después de eliminar
    const torneoDataAfter = torneoSheet.getDataRange().getValues();
    Logger.log(`FORM_TORNEO ahora tiene ${torneoDataAfter.length - 1} registros`);
    
    return {
      success: true,
      message: 'Prueba completada',
      details: {
        playerId: approvalId,
        playerName: nombre,
        timestamp: timestamp,
        torneoRowIndex: torneoRowIndex,
        deleteResult: deleteResult,
        recordsBefore: torneoData.length - 1,
        recordsAfter: torneoDataAfter.length - 1
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error en prueba de eliminación: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función mejorada para diagnosticar problemas con los contadores de hoy
 */
function diagnoseTodayCounters() {
  try {
    Logger.log('=== DIAGNÓSTICO DE CONTADORES DE HOY ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!historicSheet) {
      return { success: false, message: 'Hoja Historico_Completo no encontrada' };
    }
    
    const data = historicSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { 
        success: true, 
        message: 'No hay datos en el histórico',
        details: {
          totalRecords: 0,
          todayApprovals: 0,
          todayRejections: 0,
          todayDate: new Date().toDateString()
        }
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const today = new Date();
    const todayString = today.toDateString();
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayFormatted = Utilities.formatDate(today, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    
    Logger.log('Fecha de hoy (toDateString):', todayString);
    Logger.log('Fecha de hoy (ISO):', todayISO);
    Logger.log('Fecha de hoy (formatted):', todayFormatted);
    Logger.log('Headers del histórico:', headers);
    
    let totalRecords = 0;
    let todayApprovals = 0;
    let todayRejections = 0;
    let todayDetails = [];
    let allDates = [];
    
    rows.forEach((row, index) => {
      totalRecords++;
      
      // Buscar fecha en diferentes columnas
      let fechaRegistro = null;
      let accion = null;
      let fechaOriginal = null;
      
      // Intentar encontrar fecha en diferentes columnas
      for (let i = 0; i < row.length; i++) {
        const cellValue = row[i];
        if (cellValue instanceof Date) {
          fechaRegistro = cellValue;
          fechaOriginal = cellValue.toString();
          break;
        } else if (typeof cellValue === 'string' && (cellValue.includes('/') || cellValue.includes('-') || cellValue.includes(':'))) {
          try {
            const parsedDate = new Date(cellValue);
            if (!isNaN(parsedDate.getTime())) {
              fechaRegistro = parsedDate;
              fechaOriginal = cellValue;
              break;
            }
          } catch (e) {
            // Continuar buscando
          }
        }
      }
      
      // Buscar acción
      for (let i = 0; i < row.length; i++) {
        const cellValue = row[i];
        if (typeof cellValue === 'string' && 
            (cellValue.includes('APROBADO') || cellValue.includes('RECHAZADO'))) {
          accion = cellValue;
          break;
        }
      }
      
      if (fechaRegistro) {
        const rowDateString = fechaRegistro.toDateString();
        const rowISO = fechaRegistro.toISOString().split('T')[0];
        const rowFormatted = Utilities.formatDate(fechaRegistro, Session.getScriptTimeZone(), 'dd/MM/yyyy');
        
        allDates.push({
          row: index + 2,
          original: fechaOriginal,
          toDateString: rowDateString,
          iso: rowISO,
          formatted: rowFormatted
        });
        
        Logger.log(`Fila ${index + 2}: Original="${fechaOriginal}", toDateString="${rowDateString}", ISO="${rowISO}", Formatted="${rowFormatted}"`);
        
        // Verificar si es de hoy usando múltiples formatos
        let isToday = false;
        if (rowDateString === todayString || 
            rowISO === todayISO || 
            rowFormatted === todayFormatted) {
          isToday = true;
        }
        
        if (isToday && accion) {
          todayDetails.push({
            row: index + 2,
            fecha: rowDateString,
            accion: accion,
            fechaOriginal: fechaOriginal,
            fechaISO: rowISO,
            fechaFormatted: rowFormatted
          });
          
          if (accion.includes('APROBADO')) {
            todayApprovals++;
          } else if (accion.includes('RECHAZADO')) {
            todayRejections++;
          }
        }
      }
    });
    
    Logger.log('Registros de hoy encontrados:', todayDetails);
    Logger.log('Todas las fechas encontradas:', allDates.slice(0, 5)); // Solo las primeras 5 para no llenar el log
    
    return {
      success: true,
      message: 'Diagnóstico completado',
      details: {
        totalRecords: totalRecords,
        todayApprovals: todayApprovals,
        todayRejections: todayRejections,
        todayDate: todayString,
        todayISO: todayISO,
        todayFormatted: todayFormatted,
        todayDetails: todayDetails,
        allDates: allDates.slice(0, 10), // Solo las primeras 10 para diagnóstico
        headers: headers
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico de contadores: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función de prueba simple
 */
function testConnection() {
  try {
    Logger.log('=== PRUEBA DE CONEXIÓN ===');
    return { success: true, message: 'Conexión exitosa', timestamp: new Date().toString() };
  } catch (error) {
    Logger.log('❌ Error en prueba: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función muy simple para verificar FORM_TORNEO
 */
function checkFormTorneo() {
  try {
    Logger.log('=== VERIFICACIÓN SIMPLE DE FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!torneoSheet) {
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    const rowCount = torneoSheet.getLastRow();
    const colCount = torneoSheet.getLastColumn();
    
    return { 
      success: true, 
      message: 'FORM_TORNEO encontrado', 
      rowCount: rowCount,
      colCount: colCount
    };
    
  } catch (error) {
    Logger.log('❌ Error en verificación: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función súper simple para diagnosticar FORM_TORNEO
 */
function diagnoseFormTorneoSuperSimple() {
  try {
    Logger.log('=== DIAGNÓSTICO SÚPER SIMPLE DE FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!torneoSheet) {
      Logger.log('❌ Hoja no encontrada');
      return { success: false, message: 'Hoja no encontrada' };
    }
    
    const rowCount = torneoSheet.getLastRow();
    Logger.log('✅ Filas:', rowCount);
    
    // Leer solo la primera fila de datos (fila 2)
    const firstDataRow = torneoSheet.getRange(2, 1, 1, 5).getValues()[0];
    Logger.log('✅ Primera fila de datos:', firstDataRow);
    
    const result = {
      success: true,
      message: 'Diagnóstico simple completado',
      rowCount: rowCount,
      firstPlayer: firstDataRow[3] || 'Sin nombre',
      firstEmail: firstDataRow[1] || 'Sin email'
    };
    
    Logger.log('📊 Resultado:', result);
    return result;
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función para obtener jugadores de FORM_TORNEO de manera eficiente
 */
function getFormTorneoPlayers() {
  try {
    Logger.log('=== OBTENIENDO JUGADORES DE FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!torneoSheet) {
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    const rowCount = torneoSheet.getLastRow();
    Logger.log('✅ Total de filas:', rowCount);
    
    if (rowCount <= 1) {
      return { 
        success: true, 
        message: 'No hay jugadores en FORM_TORNEO',
        players: []
      };
    }
    
    const players = [];
    
    // Leer fila por fila para evitar problemas de serialización
    for (let i = 2; i <= rowCount; i++) {
      try {
        const row = torneoSheet.getRange(i, 1, 1, 5).getValues()[0];
        
        if (row[0] && row[0] !== '') {
          const player = {
            row: i,
            timestamp: row[0],
            email: row[1],
            torneo: row[2],
            jugador: row[3],
            padre: row[4]
          };
          
          players.push(player);
          Logger.log(`✅ Jugador ${i-1}: ${player.jugador}`);
        }
      } catch (rowError) {
        Logger.log(`❌ Error en fila ${i}: ${rowError.toString()}`);
      }
    }
    
    const result = {
      success: true,
      message: `Se encontraron ${players.length} jugadores en FORM_TORNEO`,
      totalPlayers: players.length,
      players: players
    };
    
    Logger.log('📊 Resultado final:', result);
    return result;
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función súper simple para obtener solo la información básica de FORM_TORNEO
 */
function getFormTorneoBasicInfo() {
  try {
    Logger.log('=== INFORMACIÓN BÁSICA DE FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!torneoSheet) {
      return { success: false, message: 'Hoja no encontrada' };
    }
    
    const rowCount = torneoSheet.getLastRow();
    Logger.log('✅ Filas:', rowCount);
    
    if (rowCount <= 1) {
      return { 
        success: true, 
        message: 'No hay jugadores en FORM_TORNEO',
        rowCount: rowCount
      };
    }
    
    // Leer solo la primera fila de datos (fila 2)
    const firstRow = torneoSheet.getRange(2, 1, 1, 5).getValues()[0];
    Logger.log('✅ Primera fila:', firstRow);
    
    // Leer la segunda fila de datos (fila 3) si existe
    let secondRow = null;
    if (rowCount >= 3) {
      secondRow = torneoSheet.getRange(3, 1, 1, 5).getValues()[0];
      Logger.log('✅ Segunda fila:', secondRow);
    }
    
    const result = {
      success: true,
      message: `FORM_TORNEO tiene ${rowCount} filas`,
      rowCount: rowCount,
      firstPlayer: firstRow[3] || 'Sin nombre',
      firstEmail: firstRow[1] || 'Sin email',
      secondPlayer: secondRow ? (secondRow[3] || 'Sin nombre') : 'No hay segundo jugador',
      secondEmail: secondRow ? (secondRow[1] || 'Sin email') : 'No hay segundo email'
    };
    
    Logger.log('📊 Resultado:', result);
    return result;
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función para obtener información detallada de FORM_TORNEO sin arrays complejos
 */
function getFormTorneoDetailedInfo() {
  try {
    Logger.log('=== INFORMACIÓN DETALLADA DE FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!torneoSheet) {
      return { success: false, message: 'Hoja no encontrada' };
    }
    
    const rowCount = torneoSheet.getLastRow();
    Logger.log('✅ Filas:', rowCount);
    
    if (rowCount <= 1) {
      return { 
        success: true, 
        message: 'No hay jugadores en FORM_TORNEO',
        rowCount: rowCount
      };
    }
    
    // Leer todas las filas de datos una por una
    let playerInfo = '';
    let playerCount = 0;
    
    for (let i = 2; i <= rowCount; i++) {
      try {
        const row = torneoSheet.getRange(i, 1, 1, 5).getValues()[0];
        
        if (row[0] && row[0] !== '') {
          playerCount++;
          playerInfo += `Jugador ${playerCount}:\n`;
          playerInfo += `  Fila: ${i}\n`;
          playerInfo += `  Timestamp: ${row[0]}\n`;
          playerInfo += `  Email: ${row[1]}\n`;
          playerInfo += `  Torneo: ${row[2]}\n`;
          playerInfo += `  Nombre: ${row[3]}\n`;
          playerInfo += `  Padre/Tutor: ${row[4]}\n\n`;
          
          Logger.log(`✅ Jugador ${playerCount}: ${row[3]}`);
        }
      } catch (rowError) {
        Logger.log(`❌ Error en fila ${i}: ${rowError.toString()}`);
      }
    }
    
    const result = {
      success: true,
      message: `FORM_TORNEO tiene ${rowCount} filas con ${playerCount} jugadores`,
      rowCount: rowCount,
      playerCount: playerCount,
      playerInfo: playerInfo
    };
    
    Logger.log('📊 Resultado:', result);
    return result;
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función para verificar si los jugadores de FORM_TORNEO están en Aprobaciones
 */
function checkFormTorneoPlayersInAprobaciones() {
  try {
    Logger.log('=== VERIFICANDO JUGADORES DE FORM_TORNEO EN APROBACIONES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    const aprobacionesSheet = ss.getSheetByName('Aprobaciones');
    
    if (!torneoSheet) {
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    if (!aprobacionesSheet) {
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    const torneoRowCount = torneoSheet.getLastRow();
    Logger.log('✅ Filas en FORM_TORNEO:', torneoRowCount);
    
    if (torneoRowCount <= 1) {
      return { 
        success: true, 
        message: 'No hay jugadores en FORM_TORNEO',
        torneoRowCount: torneoRowCount
      };
    }
    
    // Leer jugadores de FORM_TORNEO
    let torneoPlayers = '';
    let torneoPlayerCount = 0;
    
    for (let i = 2; i <= torneoRowCount; i++) {
      try {
        const row = torneoSheet.getRange(i, 1, 1, 5).getValues()[0];
        
        if (row[0] && row[0] !== '') {
          torneoPlayerCount++;
          torneoPlayers += `Jugador ${torneoPlayerCount}:\n`;
          torneoPlayers += `  Fila: ${i}\n`;
          torneoPlayers += `  Timestamp: ${row[0]}\n`;
          torneoPlayers += `  Email: ${row[1]}\n`;
          torneoPlayers += `  Torneo: ${row[2]}\n`;
          torneoPlayers += `  Nombre: ${row[3]}\n`;
          torneoPlayers += `  Padre/Tutor: ${row[4]}\n\n`;
          
          Logger.log(`✅ Jugador ${torneoPlayerCount}: ${row[3]}`);
        }
      } catch (rowError) {
        Logger.log(`❌ Error en fila ${i}: ${rowError.toString()}`);
      }
    }
    
    const result = {
      success: true,
      message: `FORM_TORNEO tiene ${torneoRowCount} filas con ${torneoPlayerCount} jugadores`,
      torneoRowCount: torneoRowCount,
      torneoPlayerCount: torneoPlayerCount,
      torneoPlayers: torneoPlayers
    };
    
    Logger.log('📊 Resultado:', result);
    return result;
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función para diagnosticar el contenido de la columna Q en Aprobaciones
 */
function diagnoseAprobacionesColumnQ() {
  try {
    Logger.log('=== DIAGNÓSTICO DE COLUMNA Q EN APROBACIONES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aprobacionesSheet = ss.getSheetByName('Aprobaciones');
    
    if (!aprobacionesSheet) {
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    const data = aprobacionesSheet.getDataRange().getValues();
    Logger.log('✅ Total de filas en Aprobaciones:', data.length);
    
    if (data.length <= 1) {
      return { 
        success: true, 
        message: 'No hay datos en Aprobaciones',
        rowCount: data.length
      };
    }
    
    let diagnosticInfo = '';
    let playerCount = 0;
    
    // Revisar las primeras 5 filas de datos
    for (let i = 1; i < Math.min(data.length, 6); i++) {
      const row = data[i];
      const playerId = row[0];
      const columnQ = row[16]; // Columna Q (índice 16)
      
      if (playerId && playerId.includes('TORNEO')) {
        playerCount++;
        diagnosticInfo += `Jugador de Torneo ${playerCount}:\n`;
        diagnosticInfo += `  Fila: ${i + 1}\n`;
        diagnosticInfo += `  ID: ${playerId}\n`;
        diagnosticInfo += `  Columna Q (índice 16): "${columnQ}"\n`;
        diagnosticInfo += `  Tipo de columna Q: ${typeof columnQ}\n`;
        
        // Intentar parsear el JSON
        try {
          const parsed = JSON.parse(columnQ);
          diagnosticInfo += `  JSON parseado: ${parsed}\n`;
          diagnosticInfo += `  Tipo parseado: ${typeof parsed}\n`;
        } catch (parseError) {
          diagnosticInfo += `  Error parseando JSON: ${parseError.message}\n`;
        }
        
        diagnosticInfo += `\n`;
        
        Logger.log(`🔍 Jugador ${playerCount}: ${playerId}`);
        Logger.log(`📋 Columna Q: "${columnQ}" (tipo: ${typeof columnQ})`);
      }
    }
    
    const result = {
      success: true,
      message: `Se encontraron ${playerCount} jugadores de torneo en Aprobaciones`,
      playerCount: playerCount,
      diagnosticInfo: diagnosticInfo
    };
    
    Logger.log('📊 Resultado:', result);
    return result;
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Función simple para diagnosticar FORM_TORNEO
 */
function diagnoseFormTorneoSimple() {
  try {
    Logger.log('=== DIAGNÓSTICO SIMPLE DE FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('✅ Spreadsheet obtenido');
    
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    Logger.log('✅ Hoja FORM_TORNEO obtenida');
    
    if (!torneoSheet) {
      Logger.log('❌ Hoja FORM_TORNEO no encontrada');
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    // Obtener solo las primeras filas para evitar problemas
    const range = torneoSheet.getRange(1, 1, 10, 10); // Primeras 10 filas, 10 columnas
    Logger.log('✅ Rango obtenido');
    
    const data = range.getValues();
    Logger.log('✅ Datos obtenidos, filas:', data.length);
    
    const players = [];
    
    // Procesar solo las filas con datos (saltando la primera que es el header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Verificar que la fila no esté vacía
      if (row[0] && row[0] !== '') {
        Logger.log(`📋 Procesando fila ${i}: ${row[3]}`);
        
        const playerInfo = {
          rowIndex: i + 1,
          timestamp: row[0] || 'N/A',
          email: row[1] || 'N/A',
          torneo: row[2] || 'N/A',
          jugador: row[3] || 'N/A',
          padre: row[4] || 'N/A'
        };
        
        players.push(playerInfo);
      }
    }
    
    Logger.log(`✅ Procesados ${players.length} jugadores`);
    
    const result = {
      success: true,
      message: 'Diagnóstico completado',
      details: {
        totalPlayers: players.length,
        players: players
      }
    };
    
    Logger.log('📊 Resultado final:', result);
    Logger.log('📊 Resultado JSON:', JSON.stringify(result));
    
    return result;
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico simple: ' + error.toString());
    Logger.log('❌ Stack trace: ' + error.stack);
    
    const errorResult = { success: false, message: 'Error: ' + error.toString() };
    Logger.log('📊 Retornando error:', errorResult);
    
    return errorResult;
  }
}

/**
 * Función específica para diagnosticar jugadores de FORM_TORNEO que no se eliminan
 */
function diagnoseSpecificTournamentPlayers() {
  try {
    Logger.log('=== DIAGNÓSTICO ESPECÍFICO DE JUGADORES DE TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Obtener datos de FORM_TORNEO
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    if (!torneoSheet) {
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    const torneoData = torneoSheet.getDataRange().getValues();
    if (torneoData.length <= 1) {
      return { 
        success: true, 
        message: 'No hay datos en FORM_TORNEO',
        details: {
          totalPlayers: 0,
          players: []
        }
      };
    }
    
    // 2. Obtener datos del histórico
    const historicSheet = ss.getSheetByName('Historico_Completo');
    if (!historicSheet) {
      return { success: false, message: 'Hoja Historico_Completo no encontrada' };
    }
    
    const historicData = historicSheet.getDataRange().getValues();
    
    // 3. Obtener datos de Aprobaciones
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    const approvalsData = approvalsSheet.getDataRange().getValues();
    
    // 4. Analizar cada jugador en FORM_TORNEO
    const players = [];
    
    for (let i = 1; i < torneoData.length; i++) {
      const row = torneoData[i];
      const timestamp = row[0]; // Marca temporal
      const email = row[1]; // Email
      const torneo = row[2]; // Torneo
      const jugador = row[3]; // Jugador
      const padre = row[4]; // Padre o Tutor
      
      Logger.log(`Analizando jugador: ${jugador} (${email})`);
      
      // Buscar en Aprobaciones
      let inApprovals = false;
      let approvalId = null;
      let approvalStatus = null;
      
      for (let j = 1; j < approvalsData.length; j++) {
        const approvalRow = approvalsData[j];
        const approvalTimestamp = approvalRow[1]; // Columna B = Marca temporal
        const approvalEmail = approvalRow[2]; // Columna C = Email
        const approvalJugador = approvalRow[3]; // Columna D = Jugador
        
        if (approvalTimestamp && approvalTimestamp.toString() === timestamp.toString()) {
          inApprovals = true;
          approvalId = approvalRow[0]; // Columna A = ID
          approvalStatus = approvalRow[approvalRow.length - 1]; // Última columna = Estado
          break;
        }
      }
      
      // Buscar en Histórico
      let inHistoric = false;
      let historicAction = null;
      
      for (let k = 1; k < historicData.length; k++) {
        const historicRow = historicData[k];
        // Buscar por timestamp en diferentes columnas
        for (let l = 0; l < historicRow.length; l++) {
          const cellValue = historicRow[l];
          if (cellValue && cellValue.toString() === timestamp.toString()) {
            inHistoric = true;
            // Buscar la acción
            for (let m = 0; m < historicRow.length; m++) {
              const actionCell = historicRow[m];
              if (typeof actionCell === 'string' && 
                  (actionCell.includes('APROBADO') || actionCell.includes('RECHAZADO'))) {
                historicAction = actionCell;
                break;
              }
            }
            break;
          }
        }
        if (inHistoric) break;
      }
      
      const playerInfo = {
        rowIndex: i + 1,
        timestamp: timestamp,
        email: email,
        torneo: torneo,
        jugador: jugador,
        padre: padre,
        inApprovals: inApprovals,
        approvalId: approvalId,
        approvalStatus: approvalStatus,
        inHistoric: inHistoric,
        historicAction: historicAction,
        needsCleanup: inHistoric && !inApprovals // Si está en histórico pero no en aprobaciones, necesita limpieza
      };
      
      players.push(playerInfo);
      
      Logger.log(`Jugador ${jugador}: Aprobaciones=${inApprovals}, Histórico=${inHistoric}, Acción=${historicAction}`);
    }
    
    return {
      success: true,
      message: 'Diagnóstico completado',
      details: {
        totalPlayers: torneoData.length - 1,
        players: players
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico específico: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Busca jugadores huérfanos en FORM_TORNEO (jugadores que ya fueron procesados pero aún están en FORM_TORNEO)
 */
function findOrphanedTournamentPlayers() {
  try {
    Logger.log('=== BUSCANDO JUGADORES HUÉRFANOS EN FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Obtener datos de FORM_TORNEO
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    if (!torneoSheet) {
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    const torneoData = torneoSheet.getDataRange().getValues();
    if (torneoData.length <= 1) {
      return { 
        success: true, 
        totalPlayers: 0,
        orphanedPlayers: []
      };
    }
    
    // 2. Obtener datos del histórico
    const historicSheet = ss.getSheetByName('Historico_Completo');
    if (!historicSheet) {
      return { success: false, message: 'Hoja Historico_Completo no encontrada' };
    }
    
    const historicData = historicSheet.getDataRange().getValues();
    
    // 3. Crear un set de timestamps que están en el histórico
    const historicTimestamps = new Set();
    for (let i = 1; i < historicData.length; i++) {
      // Buscar timestamp en diferentes columnas del histórico
      for (let j = 0; j < historicData[i].length; j++) {
        const cellValue = historicData[i][j];
        if (cellValue && typeof cellValue === 'string') {
          // Si parece un timestamp, agregarlo al set
          if (cellValue.includes('/') || cellValue.includes('-') || cellValue.includes(':')) {
            historicTimestamps.add(cellValue);
          }
        }
      }
    }
    
    Logger.log(`Timestamps en histórico: ${historicTimestamps.size}`);
    
    // 4. Buscar jugadores huérfanos en FORM_TORNEO
    const orphanedPlayers = [];
    
    for (let i = 1; i < torneoData.length; i++) {
      const timestamp = torneoData[i][0]; // Columna A = Marca temporal
      const nombre = torneoData[i][1] || `Jugador ${i}`; // Columna B = Nombre
      
      if (timestamp) {
        const timestampStr = timestamp.toString();
        
        // Verificar si este timestamp está en el histórico
        let isInHistoric = false;
        for (const historicTimestamp of historicTimestamps) {
          if (timestampStr === historicTimestamp || 
              timestampStr.includes(historicTimestamp) || 
              historicTimestamp.includes(timestampStr)) {
            isInHistoric = true;
            break;
          }
        }
        
        if (isInHistoric) {
          orphanedPlayers.push({
            nombre: nombre,
            timestamp: timestampStr,
            rowIndex: i + 1,
            status: 'Procesado pero no eliminado'
          });
        }
      }
    }
    
    Logger.log(`Jugadores huérfanos encontrados: ${orphanedPlayers.length}`);
    
    return {
      success: true,
      totalPlayers: torneoData.length - 1,
      orphanedPlayers: orphanedPlayers
    };
    
  } catch (error) {
    Logger.log('❌ Error buscando jugadores huérfanos: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Limpia jugadores huérfanos de FORM_TORNEO
 */
function cleanupOrphanedTournamentPlayers() {
  try {
    Logger.log('=== LIMPIANDO JUGADORES HUÉRFANOS DE FORM_TORNEO ===');
    
    // 1. Buscar jugadores huérfanos
    const findResult = findOrphanedTournamentPlayers();
    if (!findResult.success) {
      return findResult;
    }
    
    const orphanedPlayers = findResult.orphanedPlayers;
    
    if (orphanedPlayers.length === 0) {
      return {
        success: true,
        message: 'No hay jugadores huérfanos para limpiar',
        cleanupResults: {
          processed: 0,
          successful: 0,
          errors: 0,
          details: []
        }
      };
    }
    
    // 2. Eliminar jugadores huérfanos
    const cleanupResults = {
      processed: orphanedPlayers.length,
      successful: 0,
      errors: 0,
      details: []
    };
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const torneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    // Ordenar por fila (de mayor a menor) para evitar problemas con índices
    orphanedPlayers.sort((a, b) => b.rowIndex - a.rowIndex);
    
    for (const player of orphanedPlayers) {
      try {
        Logger.log(`Eliminando jugador huérfano: ${player.nombre} (fila ${player.rowIndex})`);
        
        // Eliminar la fila
        torneoSheet.deleteRow(player.rowIndex);
        
        cleanupResults.successful++;
        cleanupResults.details.push({
          playerName: player.nombre,
          success: true,
          rowIndex: player.rowIndex
        });
        
        Logger.log(`✓ Jugador eliminado exitosamente: ${player.nombre}`);
        
      } catch (error) {
        cleanupResults.errors++;
        cleanupResults.details.push({
          playerName: player.nombre,
          success: false,
          error: error.toString(),
          rowIndex: player.rowIndex
        });
        
        Logger.log(`❌ Error eliminando jugador ${player.nombre}: ${error.toString()}`);
      }
    }
    
    SpreadsheetApp.flush();
    
    Logger.log(`Limpieza completada: ${cleanupResults.successful} exitosos, ${cleanupResults.errors} errores`);
    
    return {
      success: true,
      message: `Limpieza completada: ${cleanupResults.successful} jugadores eliminados`,
      cleanupResults: cleanupResults
    };
    
  } catch (error) {
    Logger.log('❌ Error en limpieza de jugadores huérfanos: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Elimina un registro de FORM_TORNEO basado en el timestamp
 * @param {string} timestamp - Marca temporal del registro a eliminar
 */
function deleteFromFormTorneo(timestamp) {
  try {
    Logger.log('=== ELIMINANDO REGISTRO DE FORM_TORNEO ===');
    Logger.log('Timestamp a buscar:', timestamp);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!formSheet) {
      Logger.log('Hoja FORM_TORNEO no encontrada');
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada' };
    }
    
    const data = formSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No hay datos en FORM_TORNEO');
      return { success: false, message: 'No hay datos en FORM_TORNEO' };
    }
    
    // Buscar la fila con el timestamp (mejorado para manejar diferentes formatos)
    let rowToDelete = -1;
    Logger.log(`Buscando timestamp: "${timestamp}" en ${data.length - 1} filas`);
    
    for (let i = 1; i < data.length; i++) {
      const rowTimestamp = data[i][0]; // Columna A = Marca temporal
      Logger.log(`Fila ${i}: timestamp="${rowTimestamp}" (tipo: ${typeof rowTimestamp})`);
      
      // Comparar timestamps de manera más flexible
      if (rowTimestamp) {
        const rowTimestampStr = rowTimestamp.toString();
        const searchTimestampStr = timestamp.toString();
        
        // Comparación directa
        if (rowTimestampStr === searchTimestampStr) {
          rowToDelete = i + 1; // +1 porque las filas empiezan en 1
          Logger.log(`✓ Timestamp encontrado en fila ${rowToDelete}`);
          break;
        }
        
        // Comparación de fechas si son objetos Date
        if (rowTimestamp instanceof Date && timestamp instanceof Date) {
          if (rowTimestamp.getTime() === timestamp.getTime()) {
            rowToDelete = i + 1;
            Logger.log(`✓ Timestamp (Date) encontrado en fila ${rowToDelete}`);
            break;
          }
        }
        
        // Comparación por partes si es una fecha en string
        if (rowTimestampStr.includes(searchTimestampStr) || searchTimestampStr.includes(rowTimestampStr)) {
          rowToDelete = i + 1;
          Logger.log(`✓ Timestamp (parcial) encontrado en fila ${rowToDelete}`);
          break;
        }
      }
    }
    
    if (rowToDelete === -1) {
      Logger.log('❌ No se encontró el registro con timestamp:', timestamp);
      Logger.log('📋 Timestamps disponibles en FORM_TORNEO:');
      for (let i = 1; i < Math.min(data.length, 6); i++) {
        Logger.log(`  Fila ${i}: "${data[i][0]}"`);
      }
      return { success: false, message: 'Registro no encontrado en FORM_TORNEO' };
    }
    
    // Eliminar la fila
    formSheet.deleteRow(rowToDelete);
    SpreadsheetApp.flush();
    
    Logger.log(`Fila ${rowToDelete} eliminada de FORM_TORNEO`);
    
    return {
      success: true,
      message: 'Registro eliminado de FORM_TORNEO',
      deletedRow: rowToDelete
    };
    
  } catch (error) {
    Logger.log('Error eliminando de FORM_TORNEO: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Elimina un registro de Aprobaciones basado en el ID
 * @param {string} approvalId - ID del registro a eliminar
 */
function deleteFromApprovals(approvalId) {
  try {
    Logger.log('=== ELIMINANDO REGISTRO DE APROBACIONES ===');
    Logger.log('ID a buscar:', approvalId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      Logger.log('Hoja Aprobaciones no encontrada');
      return { success: false, message: 'Hoja Aprobaciones no encontrada' };
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No hay datos en Aprobaciones');
      return { success: false, message: 'No hay datos en Aprobaciones' };
    }
    
    // Buscar la fila con el ID
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      const rowId = data[i][0]; // Columna A = ID
      if (rowId && rowId.toString() === approvalId.toString()) {
        rowToDelete = i + 1; // +1 porque las filas empiezan en 1
        break;
      }
    }
    
    if (rowToDelete === -1) {
      Logger.log('No se encontró el registro con ID:', approvalId);
      return { success: false, message: 'Registro no encontrado en Aprobaciones' };
    }
    
    // Eliminar la fila
    approvalsSheet.deleteRow(rowToDelete);
    SpreadsheetApp.flush();
    
    Logger.log(`Fila ${rowToDelete} eliminada de Aprobaciones`);
    
    return {
      success: true,
      message: 'Registro eliminado de Aprobaciones',
      deletedRow: rowToDelete
    };
    
  } catch (error) {
    Logger.log('Error eliminando de Aprobaciones: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Limpia y recrea la hoja de Histórico con el orden correcto
 */
function recreateHistoricSheet() {
  try {
    Logger.log('=== RECREANDO HOJA DE HISTÓRICO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const oldSheet = ss.getSheetByName('Historico_Completo');
    
    // Respaldar datos si existen
    let backupData = null;
    if (oldSheet) {
      const data = oldSheet.getDataRange().getValues();
      if (data.length > 1) {
        backupData = data.slice(1); // Guardar sin headers
        Logger.log(`Respaldando ${backupData.length} registros existentes`);
      }
      // Eliminar hoja vieja
      ss.deleteSheet(oldSheet);
      Logger.log('Hoja antigua eliminada');
    }
    
    // Crear nueva hoja con orden correcto
    const result = ensureHistoricSheetExists();
    
    if (backupData && backupData.length > 0) {
      Logger.log(`⚠️ ADVERTENCIA: Se respaldaron ${backupData.length} registros`);
      Logger.log('Los datos antiguos se perdieron debido al cambio de estructura');
      Logger.log('Considera hacer un backup manual antes de recrear');
    }
    
    return {
      success: true,
      message: 'Hoja de Histórico recreada exitosamente',
      backupRecords: backupData ? backupData.length : 0
    };
    
  } catch (error) {
    Logger.log('Error recreando hoja de Histórico: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Crea o verifica la existencia de la hoja de Histórico
 */
function ensureHistoricSheetExists() {
  try {
    Logger.log('=== VERIFICANDO HOJA DE HISTÓRICO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!historicSheet) {
      Logger.log('Creando hoja de Histórico...');
      historicSheet = ss.insertSheet('Historico_Completo');
      
      // Headers completos para el histórico (orden exacto del formulario)
      const headers = [
        'ID Histórico',
        'Fecha de Registro en Histórico',
        'Acción',
        'Estado Final',
        'Marca temporal',
        'Dirección de correo electrónico',
        'Nombre completo del padre/tutor',
        'Teléfono de contacto',
        'Dirección completa',
        'Método de pago',
        'Fecha de pago',
        'Comprobante de pago',
        'Nombre completo del jugador',
        'Fecha de nacimiento',
        'Genero del jugador',
        'Número de identificación',
        'Copia identificación Frente J1',
        'Copia identificación Reverso J1',
        'Talla de uniforme',
        '¿Desea agregar otro jugador?',
        'Nombre completo del jugador 2',
        'Fecha de nacimiento jugador 2',
        'Número identificación jugador 2',
        'Copia identificación Frente J2',
        'Copia identificación Reverso J2',
        'Talla de uniforme jugador 2',
        '¿Agregar otro jugador?',
        'Nombre completo del jugador 3',
        'Fecha de nacimiento jugador 3',
        'Número identificación jugador 3',
        'Copia identificación Frente J3',
        'Copia identificación Reverso J3',
        'Talla de uniforme jugador 3',
        'Copia identificación Padre/Tutor',
        'Número de identificación Padre/Tutor',
        'ID Aprobación',
        'Categoría Calculada',
        'Edad Calculada',
        'ID de Familia',
        'Archivos Adjuntos (JSON)',
        'Comprobante de Pago (JSON)',
        'Observaciones'
      ];
      
      historicSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Formatear headers
      const headerRange = historicSheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1e3a8a');
      headerRange.setFontColor('white');
      headerRange.setWrap(true);
      
      Logger.log('Hoja de Histórico creada exitosamente');
    } else {
      Logger.log('Hoja de Histórico ya existe');
    }
    
    return {
      success: true,
      message: 'Hoja de Histórico verificada',
      sheet: historicSheet
    };
    
  } catch (error) {
    Logger.log('Error verificando hoja de Histórico: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Clona un registro de FORM_MATRICULA al histórico
 */
function cloneToHistoric(formRow, action, finalStatus) {
  try {
    Logger.log('=== CLONANDO A HISTÓRICO ===');
    Logger.log('Acción:', action);
    Logger.log('Estado final:', finalStatus);
    
    // Asegurar que existe la hoja de histórico
    const result = ensureHistoricSheetExists();
    if (!result.success) {
      throw new Error('No se pudo crear/acceder a la hoja de Histórico');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    // Generar ID único para el histórico
    const historicId = `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const registrationDate = new Date();
    
    // Crear fila para el histórico
    const historicRow = [
      historicId,
      registrationDate,
      action,
      finalStatus,
      ...formRow // Todos los campos del formulario original
    ];
    
    // Agregar al histórico
    historicSheet.appendRow(historicRow);
    SpreadsheetApp.flush();
    
    Logger.log(`Registro clonado al histórico con ID: ${historicId}`);
    
    return {
      success: true,
      historicId: historicId,
      message: 'Registro clonado exitosamente al histórico'
    };
    
  } catch (error) {
    Logger.log('Error clonando a histórico: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Clona un envío del formulario original (FORM_MATRICULA / FORM_TORNEO) al histórico usando el timestamp
 * @param {string|Date} timestamp
 * @param {string} fuente
 * @param {string} action
 * @param {string} finalStatus
 * @returns {{success: boolean, message: string, historicId?: string}}
 */
function cloneFormSubmissionToHistoric(timestamp, fuente, action, finalStatus) {
  try {
    if (!timestamp) {
      return { success: false, message: 'Timestamp no proporcionado' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheetName = fuente === 'FORM_TORNEO' ? 'FORM_TORNEO' : 'FORM_MATRICULA';
    const formSheet = ss.getSheetByName(formSheetName);

    if (!formSheet) {
      return { success: false, message: `Hoja ${formSheetName} no encontrada` };
    }

    const formData = formSheet.getDataRange().getValues();
    if (formData.length <= 1) {
      return { success: false, message: `Hoja ${formSheetName} sin datos` };
    }

    const formRowIndex = formData.findIndex((row, idx) => idx > 0 && row[0] && row[0].toString() === timestamp.toString());
    if (formRowIndex === -1) {
      return { success: false, message: `Timestamp ${timestamp} no encontrado en ${formSheetName}` };
    }

    const formRow = formData[formRowIndex];
    return cloneToHistoric(formRow, action, finalStatus);

  } catch (error) {
    Logger.log('Error clonando formulario al histórico: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Clona un registro de Aprobaciones al histórico antes de eliminarlo
 */
function cloneApprovalToHistoric(approvalData, action, finalStatus) {
  try {
    Logger.log('=== CLONANDO APROBACIÓN A HISTÓRICO ===');
    
    // Asegurar que existe la hoja de histórico
    const result = ensureHistoricSheetExists();
    if (!result.success) {
      throw new Error('No se pudo crear/acceder a la hoja de Histórico');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    // Generar ID único para el histórico
    const historicId = `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const registrationDate = new Date();
    
    // Buscar el registro en la hoja de Aprobaciones
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      throw new Error('Hoja de Aprobaciones no encontrada');
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Encontrar el registro por ID
    const idIndex = headers.indexOf('ID');
    const rowIndex = rows.findIndex(row => row[idIndex] === approvalData.ID);
    
    if (rowIndex === -1) {
      throw new Error('Registro no encontrado en Aprobaciones');
    }
    
    const originalRow = rows[rowIndex];
    
    // Mapear correctamente los campos al orden del histórico
    // Buscar datos del formulario original usando el timestamp y el campo "Fuente"
    const timestampIndex = headers.indexOf('Marca temporal');
    const fuenteIndex = headers.indexOf('Fuente');
    const timestamp = originalRow[timestampIndex];
    const fuente = originalRow[fuenteIndex] || 'FORM_MATRICULA'; // Default a FORM_MATRICULA si no se encuentra
    
    Logger.log('Buscando en formulario:', fuente);
    Logger.log('Timestamp:', timestamp);
    
    // Intentar clonar directamente desde el formulario original
    if (timestamp) {
      const formCloneResult = cloneFormSubmissionToHistoric(timestamp, fuente, action, finalStatus);
      if (formCloneResult.success) {
        Logger.log('✓ Datos clonados desde formulario original al histórico');
        formCloneResult.rowIndex = rowIndex + 2; // preservar compatibilidad para procesos posteriores
        return formCloneResult;
      }
      Logger.log(`⚠️ No se pudo clonar desde formulario (${formCloneResult.message}). Se usará fila de Aprobaciones.`);
    }
    
    // Si no fue posible clonar desde el formulario, usar fila de Aprobaciones como fallback
    const historicRow = [
      historicId,                    // ID Histórico
      registrationDate,              // Fecha de Registro en Histórico
      action,                        // Acción
      finalStatus,                   // Estado Final
      ...originalRow                 // Todos los campos disponibles en Aprobaciones
    ];
    
    historicSheet.appendRow(historicRow);
    SpreadsheetApp.flush();
    
    Logger.log(`Aprobación clonada al histórico (fallback) con ID: ${historicId}`);
    
    return {
      success: true,
      historicId: historicId,
      rowIndex: rowIndex + 2,
      message: 'Registro clonado al histórico desde Aprobaciones (fallback)'
    };
    
  } catch (error) {
    Logger.log('Error clonando aprobación a histórico: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

// Función deleteFromApprovalsAfterClone eliminada - ahora se usa deleteFromApprovals()

/**
 * Mueve un jugador aprobado a la hoja de Jugadores
 */
function moveApprovalToJugadores(approvalId, isScholarship = false) {
  try {
    Logger.log('=== MOVIENDO JUGADOR A HOJA JUGADORES ===');
    Logger.log('ID:', approvalId);
    Logger.log('Es becado:', isScholarship);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      throw new Error('Hoja de Aprobaciones no encontrada');
    }
    
    // Obtener o crear hoja de Jugadores
    let jugadoresSheet = ss.getSheetByName('Jugadores');
    if (!jugadoresSheet) {
      jugadoresSheet = ss.insertSheet('Jugadores');
      // Configurar headers COMPLETOS - ORDEN CORREGIDO (CON URLs DE CÉDULAS)
      const headers = [
        'ID',                           // A - Generado por sistema
        'Nombre',                       // B - Del formulario
        'Apellidos',                    // C - Del formulario
        'Edad',                         // D - Calculada
        'Cédula',                       // E - Número de identificación
        'Teléfono',                     // F - Teléfono de contacto
        'Categoría',                    // G - Calculada
        'Estado',                       // H - Activo/Inactivo
        'Fecha Registro',               // I - Fecha de aprobación
        'Tutor',                        // J - Nombre completo del padre/tutor
        'Email Tutor',                  // K - Dirección de correo electrónico
        'Dirección',                    // L - Dirección completa
        'Familia ID',                   // M - ID de Familia
        'Tipo',                         // N - Normal/Becado
        'Descuento %',                  // O - Porcentaje de descuento
        'Observaciones',                // P - Notas adicionales
        'Fecha Nacimiento',             // Q - Fecha de nacimiento
        'Género',                       // R - Genero del jugador
        'Método Pago Preferido',        // S - Método de pago
        'Cédula Tutor',                 // T - Número de identificación de Padre o Tutor
        'Mensualidad Personalizada',    // U - Mensualidad personalizada (vacío = $130)
        'URL Cédula Jugador',           // V - URL del archivo de cédula del jugador
        'URL Cédula Tutor'              // W - URL del archivo de cédula del tutor
      ];
      jugadoresSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      jugadoresSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1e3a8a')
        .setFontColor('white');
    }
    
    // Obtener datos del jugador de Aprobaciones
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const idIndex = headers.indexOf('ID');
    const rowIndex = rows.findIndex(row => row[idIndex] === approvalId);
    
    if (rowIndex === -1) {
      throw new Error('Jugador no encontrado en Aprobaciones');
    }
    
    const approval = rows[rowIndex];
    
    // Extraer TODOS los datos importantes del formulario
    const nombreCompleto = approval[headers.indexOf('Nombre completo del jugador')] || '';
    const nombrePartes = nombreCompleto.trim().split(' ');
    const nombre = nombrePartes[0] || '';
    const apellidos = nombrePartes.slice(1).join(' ') || '';
    
    const edad = approval[headers.indexOf('Edad')] || '';
    const cedula = approval[headers.indexOf('Número de identificación')] || '';
    const telefono = approval[headers.indexOf('Teléfono de contacto')] || '';
    const categoria = approval[headers.indexOf('Categoría')] || '';
    const tutor = approval[headers.indexOf('Nombre completo del padre/tutor')] || '';
    const emailTutor = approval[headers.indexOf('Dirección de correo electrónico')] || '';
    const direccion = approval[headers.indexOf('Dirección completa')] || '';
    const familiaId = approval[headers.indexOf('ID de Familia')] || '';
    const fechaNacimiento = approval[headers.indexOf('Fecha de nacimiento')] || '';
    const genero = approval[headers.indexOf('Genero del jugador')] || '';
    const metodoPago = approval[headers.indexOf('Método de pago')] || '';
    const cedulaTutor = approval[headers.indexOf('Número de identificación de Padre o Tutor')] || '';
    const esPrimerJugador = approval[headers.indexOf('Es Primer Jugador')] || true;
    
    // Extraer archivos adjuntos (si existen)
    const archivosAdjuntosJson = approval[headers.indexOf('Archivos Adjuntos')] || '';
    let urlCedulaJugador = '';
    let urlCedulaTutor = '';
    
    Logger.log('📎 Procesando archivos adjuntos:', archivosAdjuntosJson);
    
    if (archivosAdjuntosJson) {
      try {
        const archivos = JSON.parse(archivosAdjuntosJson);
        Logger.log('📂 Archivos parseados:', JSON.stringify(archivos));
        
        // Los archivos vienen como array o como objeto con propiedades
        if (Array.isArray(archivos)) {
          // Si es un array, buscar los archivos por nombre o posición
          archivos.forEach(archivo => {
            if (archivo && typeof archivo === 'object') {
              // Si el archivo tiene un ID de Drive
              if (archivo.id || archivo.fileId) {
                const fileId = archivo.id || archivo.fileId;
                const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
                
                // Determinar si es cédula del jugador o del tutor por el nombre
                const fileName = (archivo.name || archivo.fileName || '').toLowerCase();
                if (fileName.includes('jugador') || fileName.includes('player') || fileName.includes('menor')) {
                  urlCedulaJugador = fileUrl;
                  Logger.log(`✅ Cédula Jugador encontrada: ${fileUrl}`);
                } else if (fileName.includes('tutor') || fileName.includes('padre') || fileName.includes('parent')) {
                  urlCedulaTutor = fileUrl;
                  Logger.log(`✅ Cédula Tutor encontrada: ${fileUrl}`);
                } else {
                  // Si no podemos determinar, asignar al primero vacío
                  if (!urlCedulaJugador) {
                    urlCedulaJugador = fileUrl;
                  } else if (!urlCedulaTutor) {
                    urlCedulaTutor = fileUrl;
                  }
                }
              }
            }
          });
        } else if (typeof archivos === 'object') {
          // Si es un objeto con propiedades específicas
          if (archivos.cedulaJugador) {
            urlCedulaJugador = archivos.cedulaJugador.url || `https://drive.google.com/file/d/${archivos.cedulaJugador.id || archivos.cedulaJugador}/view`;
          }
          if (archivos.cedulaTutor) {
            urlCedulaTutor = archivos.cedulaTutor.url || `https://drive.google.com/file/d/${archivos.cedulaTutor.id || archivos.cedulaTutor}/view`;
          }
        }
      } catch (e) {
        Logger.log('⚠️ Error parseando archivos adjuntos: ' + e.toString());
        Logger.log('   JSON original: ' + archivosAdjuntosJson);
      }
    }
    
    // Determinar mensualidad según posición en la familia
    let mensualidadPersonalizada = '';
    if (!isScholarship) {
      // Si NO es el primer jugador de la familia, aplicar tarifa familiar ($110.50)
      if (esPrimerJugador === false || esPrimerJugador === 'false' || esPrimerJugador === 'FALSE') {
        mensualidadPersonalizada = 110.50;
        Logger.log(`Jugador ${nombre} ${apellidos} es el 2do+ de la familia. Mensualidad: $110.50`);
      } else {
        Logger.log(`Jugador ${nombre} ${apellidos} es el primero de la familia. Mensualidad: $130 (default)`);
      }
    }
    
    // Crear fila para Jugadores con TODOS los datos (CON URLs DE CÉDULAS)
    const jugadorRow = [
      approvalId,                           // A - ID
      nombre,                               // B - Nombre
      apellidos,                            // C - Apellidos
      edad,                                 // D - Edad
      cedula,                               // E - Cédula
      telefono,                             // F - Teléfono
      categoria,                            // G - Categoría
      'Activo',                             // H - Estado
      new Date(),                           // I - Fecha Registro
      tutor,                                // J - Tutor
      emailTutor,                           // K - Email Tutor
      direccion,                            // L - Dirección
      familiaId,                            // M - Familia ID
      isScholarship ? 'becado' : 'normal',  // N - Tipo
      isScholarship ? 100 : 0,              // O - Descuento %
      isScholarship ? 'Jugador becado' : '',// P - Observaciones
      fechaNacimiento,                      // Q - Fecha Nacimiento
      genero,                               // R - Género
      metodoPago,                           // S - Método Pago Preferido
      cedulaTutor,                          // T - Cédula Tutor
      mensualidadPersonalizada,             // U - Mensualidad Personalizada ($110.50 para 2do+, vacío para 1ro)
      urlCedulaJugador,                     // V - URL Cédula Jugador
      urlCedulaTutor                        // W - URL Cédula Tutor
    ];
    
    // Agregar a Jugadores
    jugadoresSheet.appendRow(jugadorRow);
    SpreadsheetApp.flush();
    
    Logger.log(`Jugador agregado a Jugadores: ${nombre} ${apellidos}`);
    
    // REGISTRAR MATRÍCULA AUTOMÁTICAMENTE
    Utilities.sleep(500);
    const enrollmentResult = registerEnrollmentFee(approvalId, isScholarship);
    if (enrollmentResult.success) {
      Logger.log(`✅ Matrícula registrada: $${enrollmentResult.amount || 0}`);
    } else {
      Logger.log(`⚠️ No se pudo registrar matrícula: ${enrollmentResult.message}`);
    }
    
    return {
      success: true,
      message: 'Jugador movido a Jugadores exitosamente',
      playerId: approvalId,
      enrollmentCharged: enrollmentResult.success
    };
    
  } catch (error) {
    Logger.log('Error moviendo a Jugadores: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * DIAGNÓSTICO: Ver archivos adjuntos de un jugador en Aprobaciones
 */
function diagnosticarArchivosAdjuntos(approvalId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      return 'Hoja de Aprobaciones no encontrada';
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const idIndex = headers.indexOf('ID');
    const rowIndex = rows.findIndex(row => row[idIndex] === approvalId);
    
    if (rowIndex === -1) {
      return 'Jugador no encontrado';
    }
    
    const approval = rows[rowIndex];
    const archivosIdx = headers.indexOf('Archivos Adjuntos');
    const archivosData = approval[archivosIdx];
    
    Logger.log('=== DIAGNÓSTICO DE ARCHIVOS ===');
    Logger.log('Índice de columna "Archivos Adjuntos":', archivosIdx);
    Logger.log('Tipo de dato:', typeof archivosData);
    Logger.log('Contenido RAW:', archivosData);
    Logger.log('Contenido como String:', String(archivosData));
    
    // Intentar parsear
    if (archivosData) {
      try {
        const parsed = JSON.parse(archivosData);
        Logger.log('✅ JSON parseado exitosamente:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        Logger.log('❌ No se pudo parsear como JSON:', e.toString());
      }
    } else {
      Logger.log('⚠️ Columna de archivos está vacía');
    }
    
    return {
      indice: archivosIdx,
      tipo: typeof archivosData,
      contenido: String(archivosData),
      esVacio: !archivosData
    };
    
  } catch (error) {
    Logger.log('Error en diagnóstico: ' + error.toString());
    return 'Error: ' + error.toString();
  }
}

/**
 * Proceso completo: Aprobar jugador (clonar a histórico, mover a Jugadores, eliminar de Aprobaciones)
 */
function approvePlayerComplete(approvalId, isScholarship = false) {
  try {
    Logger.log('=== APROBANDO JUGADOR COMPLETO ===');
    Logger.log('ID:', approvalId);
    Logger.log('Es becado:', isScholarship);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      throw new Error('Hoja de Aprobaciones no encontrada');
    }
    
    // Obtener datos del jugador
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const idIndex = headers.indexOf('ID');
    const rowIndex = rows.findIndex(row => row[idIndex] === approvalId);
    
    if (rowIndex === -1) {
      throw new Error('Jugador no encontrado');
    }
    
    const playerRow = rows[rowIndex];
    const timestampIndex = headers.indexOf('Marca temporal');
    const fuenteIndex = headers.indexOf('Fuente');
    const timestamp = playerRow[timestampIndex];
    const fuente = playerRow[fuenteIndex] || 'FORM_MATRICULA'; // Default a FORM_MATRICULA si no se encuentra
    
    Logger.log('Fuente del jugador:', fuente);
    Logger.log('Timestamp:', timestamp);
    
    // Paso 1: Clonar al histórico
    const action = isScholarship ? 'APROBADO_BECADO' : 'APROBADO';
    const cloneResult = cloneApprovalToHistoric({ID: approvalId}, action, 'Activo');
    
    if (!cloneResult.success) {
      throw new Error('Error clonando al histórico: ' + cloneResult.message);
    }
    
    Logger.log('✓ Paso 1: Clonado al histórico');
    
    // Paso 2: Mover a Jugadores
    Utilities.sleep(1000); // Delay AUMENTADO para evitar HTTP 429
    const moveResult = moveApprovalToJugadores(approvalId, isScholarship);
    if (!moveResult.success) {
      Logger.log('⚠️ Advertencia: No se pudo mover a Jugadores:', moveResult.message);
    } else {
      Logger.log('✓ Paso 2: Movido a Jugadores');
    }
    
    
    // Paso 3: Eliminar del formulario de origen (FORM_MATRICULA o FORM_TORNEO)
    if (timestamp) {
      Utilities.sleep(1000); // Delay AUMENTADO para evitar HTTP 429
      
      let deleteFormResult;
      if (fuente === 'FORM_TORNEO') {
        Logger.log('📝 Eliminando de FORM_TORNEO...');
        deleteFormResult = deleteFromFormTorneo(timestamp);
        if (deleteFormResult.success) {
          Logger.log('✓ Paso 3a: Eliminado de FORM_TORNEO');
        } else {
          Logger.log('⚠️ Advertencia: No se pudo eliminar de FORM_TORNEO:', deleteFormResult.message);
        }
      } else {
        Logger.log('📝 Eliminando de FORM_MATRICULA...');
        deleteFormResult = deleteFromFormMatricula(timestamp);
        if (deleteFormResult.success) {
          Logger.log('✓ Paso 3a: Eliminado de FORM_MATRICULA');
        } else {
          Logger.log('⚠️ Advertencia: No se pudo eliminar de FORM_MATRICULA:', deleteFormResult.message);
        }
      }
    }
    
    // Paso 4: Eliminar de Aprobaciones
    Utilities.sleep(1000); // Delay AUMENTADO para evitar HTTP 429
    const deleteResult = deleteFromApprovals(approvalId);
    
    if (!deleteResult.success) {
      Logger.log('⚠️ Advertencia: No se pudo eliminar de Aprobaciones, pero está en histórico');
    } else {
      Logger.log('✓ Paso 4: Eliminado de Aprobaciones');
    }
    
    return {
      success: true,
      message: 'Jugador aprobado y movido al histórico exitosamente',
      historicId: cloneResult.historicId
    };
    
  } catch (error) {
    Logger.log('Error aprobando jugador completo: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Proceso completo: Rechazar jugador (clonar a histórico, eliminar de Aprobaciones)
 */
function rejectPlayerComplete(approvalId, reason) {
  try {
    Logger.log('=== RECHAZANDO JUGADOR COMPLETO ===');
    Logger.log('ID:', approvalId);
    Logger.log('Razón:', reason);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      throw new Error('Hoja de Aprobaciones no encontrada');
    }
    
    // Obtener timestamp y fuente del jugador
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const idIndex = headers.indexOf('ID');
    const timestampIndex = headers.indexOf('Marca temporal');
    const fuenteIndex = headers.indexOf('Fuente');
    const rowIndex = rows.findIndex(row => row[idIndex] === approvalId);
    
    if (rowIndex === -1) {
      throw new Error('Jugador no encontrado');
    }
    
    const playerRow = rows[rowIndex];
    const timestamp = playerRow[timestampIndex];
    const fuente = playerRow[fuenteIndex] || 'FORM_MATRICULA'; // Default a FORM_MATRICULA si no se encuentra
    
    Logger.log('Fuente del jugador:', fuente);
    Logger.log('Timestamp:', timestamp);
    
    // Paso 1: Clonar al histórico
    const cloneResult = cloneApprovalToHistoric({ID: approvalId}, 'RECHAZADO', 'Rechazado');
    
    if (!cloneResult.success) {
      throw new Error('Error clonando al histórico: ' + cloneResult.message);
    }
    
    Logger.log('✓ Paso 1: Clonado al histórico');
    
    // Paso 2: Eliminar del formulario de origen (FORM_MATRICULA o FORM_TORNEO)
    if (timestamp) {
      Utilities.sleep(500); // Delay para evitar HTTP 429
      
      let deleteFormResult;
      if (fuente === 'FORM_TORNEO') {
        Logger.log('📝 Eliminando de FORM_TORNEO...');
        deleteFormResult = deleteFromFormTorneo(timestamp);
        if (deleteFormResult.success) {
          Logger.log('✓ Paso 2: Eliminado de FORM_TORNEO');
        } else {
          Logger.log('⚠️ Advertencia: No se pudo eliminar de FORM_TORNEO:', deleteFormResult.message);
        }
      } else {
        Logger.log('📝 Eliminando de FORM_MATRICULA...');
        deleteFormResult = deleteFromFormMatricula(timestamp);
        if (deleteFormResult.success) {
          Logger.log('✓ Paso 2: Eliminado de FORM_MATRICULA');
        } else {
          Logger.log('⚠️ Advertencia: No se pudo eliminar de FORM_MATRICULA:', deleteFormResult.message);
        }
      }
    }
    
    // Paso 3: Eliminar de Aprobaciones
    Utilities.sleep(500); // Delay para evitar HTTP 429
    const deleteResult = deleteFromApprovals(approvalId);
    
    if (!deleteResult.success) {
      throw new Error('Error eliminando de Aprobaciones: ' + deleteResult.message);
    }
    
    Logger.log('✓ Paso 3: Eliminado de Aprobaciones');
    
    return {
      success: true,
      message: 'Jugador rechazado y movido al histórico exitosamente',
      historicId: cloneResult.historicId
    };
    
  } catch (error) {
    Logger.log('Error rechazando jugador completo: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Clona TODOS los registros de FORM_MATRICULA al histórico
 * Esto se ejecuta automáticamente para mantener un backup completo
 */
function backupFormMatriculaToHistoric() {
  try {
    Logger.log('=== BACKUP COMPLETO DE FORM_MATRICULA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!formSheet) {
      return {
        success: false,
        message: 'Hoja FORM_MATRICULA no encontrada'
      };
    }
    
    // Asegurar que existe la hoja de histórico
    ensureHistoricSheetExists();
    
    const data = formSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        message: 'No hay datos para respaldar',
        backed: 0
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    let backedUp = 0;
    
    rows.forEach((row, index) => {
      try {
        const cloneResult = cloneToHistoric(row, 'BACKUP_AUTOMATICO', 'En Proceso');
        if (cloneResult.success) {
          backedUp++;
        }
      } catch (error) {
        Logger.log(`Error respaldando fila ${index + 1}: ${error.toString()}`);
      }
    });
    
    Logger.log(`Backup completado: ${backedUp} de ${rows.length} registros`);
    
    return {
      success: true,
      message: `Backup completado: ${backedUp} registros respaldados`,
      backed: backedUp,
      total: rows.length
    };
    
  } catch (error) {
    Logger.log('Error en backup: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Obtiene estadísticas del histórico
 */
function getHistoricStats() {
  try {
    Logger.log('=== OBTENIENDO ESTADÍSTICAS DEL HISTÓRICO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!historicSheet) {
      return {
        success: false,
        message: 'Hoja de Histórico no encontrada'
      };
    }
    
    const data = historicSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        stats: {
          total: 0,
          aprobados: 0,
          rechazados: 0,
          becados: 0,
          backups: 0
        }
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    const actionIndex = headers.indexOf('Acción');
    
    const stats = {
      total: rows.length,
      aprobados: rows.filter(r => r[actionIndex] === 'APROBADO').length,
      rechazados: rows.filter(r => r[actionIndex] === 'RECHAZADO').length,
      becados: rows.filter(r => r[actionIndex] === 'APROBADO_BECADO').length,
      backups: rows.filter(r => r[actionIndex] === 'BACKUP_AUTOMATICO').length,
      retirados: rows.filter(r => r[actionIndex] === 'RETIRADO').length
    };
    
    Logger.log('Estadísticas del histórico:', stats);
    
    return {
      success: true,
      stats: stats
    };
    
  } catch (error) {
    Logger.log('Error obteniendo estadísticas: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Busca un jugador en el histórico por nombre o ID
 */
function searchInHistoric(searchTerm) {
  try {
    Logger.log('=== BUSCANDO EN HISTÓRICO ===');
    Logger.log('Término de búsqueda:', searchTerm);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!historicSheet) {
      return {
        success: false,
        message: 'Hoja de Histórico no encontrada'
      };
    }
    
    const data = historicSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        results: []
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Buscar en múltiples campos
    const results = rows.filter(row => {
      const rowString = row.join('|').toLowerCase();
      return rowString.includes(searchTerm.toLowerCase());
    }).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    Logger.log(`Encontrados ${results.length} resultados`);
    
    return {
      success: true,
      results: results,
      total: results.length
    };
    
  } catch (error) {
    Logger.log('Error buscando en histórico: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

