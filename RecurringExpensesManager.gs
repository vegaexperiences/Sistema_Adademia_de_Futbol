/**
 * GESTIÓN DE GASTOS RECURRENTES
 * Maneja la creación, programación y confirmación de gastos recurrentes
 */

/**
 * CREAR GASTO RECURRENTE
 * Crea un nuevo gasto recurrente programado
 */
function createRecurringExpense(data) {
  try {
    Logger.log('💾 Creando gasto recurrente:', JSON.stringify(data));
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let recurringSheet = ss.getSheetByName('Gastos Recurrentes');
    
    // Crear hoja si no existe
    if (!recurringSheet) {
      recurringSheet = ss.insertSheet('Gastos Recurrentes');
      recurringSheet.appendRow([
        'ID',
        'Descripción',
        'Monto',
        'Categoría',
        'Frecuencia',
        'Día del Mes',
        'Método Pago',
        'Observaciones',
        'Activo',
        'Próxima Ejecución',
        'Última Ejecución',
        'Fecha Creación'
      ]);
      
      // Formato del header
      const headerRange = recurringSheet.getRange('A1:L1');
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1e3a8a');
      headerRange.setFontColor('#ffffff');
    }
    
    // Generar ID
    const id = 'REC_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
    
    // Calcular próxima ejecución
    const now = new Date();
    const proximaEjecucion = calcularProximaEjecucion(data.diaMes, data.frecuencia);
    
    // Agregar registro
    recurringSheet.appendRow([
      id,
      data.descripcion,
      data.monto,
      data.categoria,
      data.frecuencia,
      data.diaMes,
      data.metodoPago,
      data.observaciones || '',
      true, // Activo
      proximaEjecucion,
      '', // Última ejecución
      now
    ]);
    
    Logger.log('✅ Gasto recurrente creado con ID:', id);
    
    return {
      success: true,
      message: 'Gasto recurrente creado exitosamente',
      id: id
    };
    
  } catch (error) {
    Logger.log('❌ Error creando gasto recurrente: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * CALCULAR PRÓXIMA EJECUCIÓN
 * Calcula la fecha de la próxima ejecución del gasto recurrente
 */
function calcularProximaEjecucion(diaMes, frecuencia) {
  const now = new Date();
  let proxima = new Date();
  
  if (frecuencia === 'monthly') {
    // Mensual
    proxima.setDate(diaMes);
    
    // Si ya pasó este mes, siguiente mes
    if (proxima <= now) {
      proxima.setMonth(proxima.getMonth() + 1);
    }
  } else if (frecuencia === 'biweekly') {
    // Quincenal - día 1 y 15
    if (diaMes <= 15) {
      proxima.setDate(diaMes);
      if (proxima <= now) {
        proxima.setDate(15);
        if (proxima <= now) {
          proxima.setMonth(proxima.getMonth() + 1);
          proxima.setDate(diaMes);
        }
      }
    } else {
      proxima.setDate(15);
      if (proxima <= now) {
        proxima.setMonth(proxima.getMonth() + 1);
        proxima.setDate(diaMes);
      }
    }
  } else if (frecuencia === 'weekly') {
    // Semanal
    proxima.setDate(now.getDate() + (7 - now.getDay() + diaMes) % 7);
  }
  
  return Utilities.formatDate(proxima, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * OBTENER GASTOS RECURRENTES
 * Retorna todos los gastos recurrentes configurados
 */
function getRecurringExpenses() {
  try {
    Logger.log('🔄 Obteniendo gastos recurrentes...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const recurringSheet = ss.getSheetByName('Gastos Recurrentes');
    
    if (!recurringSheet) {
      Logger.log('⚠️ Hoja de Gastos Recurrentes no encontrada');
      return [];
    }
    
    const data = recurringSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('⚠️ No hay gastos recurrentes');
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const recurring = rows.map(row => {
      return {
        id: String(row[0]),
        descripcion: String(row[1]),
        monto: parseFloat(row[2] || 0),
        categoria: String(row[3]),
        frecuencia: String(row[4]),
        diaMes: parseInt(row[5] || 1),
        metodoPago: String(row[6]),
        observaciones: String(row[7] || ''),
        activo: row[8] === true || row[8] === 'TRUE' || row[8] === 'true',
        proximaEjecucion: row[9] instanceof Date ? Utilities.formatDate(row[9], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[9] || ''),
        ultimaEjecucion: row[10] instanceof Date ? Utilities.formatDate(row[10], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[10] || ''),
        fechaCreacion: row[11] instanceof Date ? Utilities.formatDate(row[11], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[11] || '')
      };
    });
    
    Logger.log(`✅ Gastos recurrentes obtenidos: ${recurring.length}`);
    
    return recurring;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo gastos recurrentes: ' + error.toString());
    return [];
  }
}

/**
 * ACTIVAR/DESACTIVAR GASTO RECURRENTE
 * Cambia el estado activo/inactivo de un gasto recurrente
 */
function toggleRecurringExpense(id) {
  try {
    Logger.log('⏸️/▶️ Cambiando estado de gasto recurrente:', id);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const recurringSheet = ss.getSheetByName('Gastos Recurrentes');
    
    if (!recurringSheet) {
      throw new Error('Hoja de Gastos Recurrentes no encontrada');
    }
    
    const data = recurringSheet.getDataRange().getValues();
    const headers = data[0];
    const activoIdx = headers.indexOf('Activo');
    
    // Buscar la fila
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const currentState = data[i][activoIdx];
        const newState = !currentState;
        recurringSheet.getRange(i + 1, activoIdx + 1).setValue(newState);
        
        Logger.log(`✅ Estado cambiado a: ${newState}`);
        
        return {
          success: true,
          message: `Gasto ${newState ? 'activado' : 'desactivado'} exitosamente`
        };
      }
    }
    
    throw new Error('Gasto recurrente no encontrado');
    
  } catch (error) {
    Logger.log('❌ Error cambiando estado: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * ELIMINAR GASTO RECURRENTE
 * Elimina un gasto recurrente por su ID
 */
function deleteRecurringExpense(id) {
  try {
    Logger.log('🗑️ Eliminando gasto recurrente:', id);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const recurringSheet = ss.getSheetByName('Gastos Recurrentes');
    
    if (!recurringSheet) {
      throw new Error('Hoja de Gastos Recurrentes no encontrada');
    }
    
    const data = recurringSheet.getDataRange().getValues();
    
    // Buscar la fila
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        recurringSheet.deleteRow(i + 1);
        Logger.log('✅ Gasto recurrente eliminado');
        
        return {
          success: true,
          message: 'Gasto recurrente eliminado exitosamente'
        };
      }
    }
    
    throw new Error('Gasto recurrente no encontrado');
    
  } catch (error) {
    Logger.log('❌ Error eliminando gasto recurrente: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * OBTENER GASTOS PENDIENTES DE CONFIRMACIÓN
 * Retorna los gastos generados automáticamente pendientes de confirmación
 */
function getPendingExpenses() {
  try {
    Logger.log('⏰ Obteniendo gastos pendientes...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let pendingSheet = ss.getSheetByName('Gastos Pendientes');
    
    if (!pendingSheet) {
      // Crear hoja si no existe
      pendingSheet = ss.insertSheet('Gastos Pendientes');
      pendingSheet.appendRow([
        'ID',
        'ID Recurrente',
        'Descripción',
        'Monto',
        'Categoría',
        'Método Pago',
        'Fecha Generada',
        'Estado'
      ]);
      
      // Formato del header
      const headerRange = pendingSheet.getRange('A1:H1');
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1e3a8a');
      headerRange.setFontColor('#ffffff');
      
      return [];
    }
    
    const data = pendingSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('⚠️ No hay gastos pendientes');
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const pending = rows.filter(row => row[7] === 'Pendiente').map(row => {
      return {
        id: String(row[0]),
        idRecurrente: String(row[1]),
        descripcion: String(row[2]),
        monto: parseFloat(row[3] || 0),
        categoria: String(row[4]),
        metodoPago: String(row[5]),
        fechaGenerada: row[6] instanceof Date ? Utilities.formatDate(row[6], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[6] || '')
      };
    });
    
    Logger.log(`✅ Gastos pendientes obtenidos: ${pending.length}`);
    
    return pending;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo gastos pendientes: ' + error.toString());
    return [];
  }
}

/**
 * CONFIRMAR GASTO PENDIENTE
 * Confirma un gasto pendiente y lo registra como gasto real
 */
function confirmPendingExpense(id) {
  try {
    Logger.log('✅ Confirmando gasto pendiente:', id);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pendingSheet = ss.getSheetByName('Gastos Pendientes');
    
    if (!pendingSheet) {
      throw new Error('Hoja de Gastos Pendientes no encontrada');
    }
    
    const data = pendingSheet.getDataRange().getValues();
    
    // Buscar el gasto pendiente
    let gastoData = null;
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        gastoData = data[i];
        rowIndex = i;
        break;
      }
    }
    
    if (!gastoData) {
      throw new Error('Gasto pendiente no encontrado');
    }
    
    // Registrar como gasto real
    const gastoId = 'EXP_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
    const gastoReal = {
      id: gastoId,
      descripcion: gastoData[2],
      monto: gastoData[3],
      categoria: gastoData[4],
      metodoPago: gastoData[5],
      fecha: new Date(),
      observaciones: 'Gasto recurrente confirmado'
    };
    
    // Agregar a hoja de Gastos
    const gastosSheet = ss.getSheetByName('Gastos');
    if (gastosSheet) {
      gastosSheet.appendRow([
        gastoReal.id,
        gastoReal.descripcion,
        gastoReal.monto,
        gastoReal.fecha,
        gastoReal.categoria,
        gastoReal.metodoPago,
        '',
        gastoReal.observaciones
      ]);
    }
    
    // Marcar como confirmado en Gastos Pendientes
    pendingSheet.getRange(rowIndex + 1, 8).setValue('Confirmado');
    
    Logger.log('✅ Gasto confirmado y registrado');
    
    return {
      success: true,
      message: 'Gasto confirmado y registrado exitosamente'
    };
    
  } catch (error) {
    Logger.log('❌ Error confirmando gasto: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * RECHAZAR GASTO PENDIENTE
 * Rechaza un gasto pendiente
 */
function rejectPendingExpense(id) {
  try {
    Logger.log('❌ Rechazando gasto pendiente:', id);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pendingSheet = ss.getSheetByName('Gastos Pendientes');
    
    if (!pendingSheet) {
      throw new Error('Hoja de Gastos Pendientes no encontrada');
    }
    
    const data = pendingSheet.getDataRange().getValues();
    
    // Buscar la fila
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        pendingSheet.getRange(i + 1, 8).setValue('Rechazado');
        Logger.log('✅ Gasto rechazado');
        
        return {
          success: true,
          message: 'Gasto rechazado exitosamente'
        };
      }
    }
    
    throw new Error('Gasto pendiente no encontrado');
    
  } catch (error) {
    Logger.log('❌ Error rechazando gasto: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * GENERAR GASTOS RECURRENTES
 * Genera gastos pendientes para los gastos recurrentes que llegaron a su fecha
 * Esta función debe ejecutarse diariamente con un trigger
 */
function generateRecurringExpenses() {
  try {
    Logger.log('🔄 Generando gastos recurrentes...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const recurringSheet = ss.getSheetByName('Gastos Recurrentes');
    
    if (!recurringSheet) {
      Logger.log('⚠️ No hay hoja de gastos recurrentes');
      return;
    }
    
    const data = recurringSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('⚠️ No hay gastos recurrentes configurados');
      return;
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let generados = 0;
    
    // Obtener hoja de pendientes
    let pendingSheet = ss.getSheetByName('Gastos Pendientes');
    if (!pendingSheet) {
      pendingSheet = ss.insertSheet('Gastos Pendientes');
      pendingSheet.appendRow([
        'ID',
        'ID Recurrente',
        'Descripción',
        'Monto',
        'Categoría',
        'Método Pago',
        'Fecha Generada',
        'Estado'
      ]);
    }
    
    rows.forEach((row, index) => {
      const activo = row[8] === true || row[8] === 'TRUE' || row[8] === 'true';
      const proximaEjecucion = row[9] instanceof Date ? row[9] : new Date(row[9]);
      proximaEjecucion.setHours(0, 0, 0, 0);
      
      if (activo && proximaEjecucion <= today) {
        // Generar gasto pendiente
        const pendingId = 'PEXP_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
        
        pendingSheet.appendRow([
          pendingId,
          row[0], // ID Recurrente
          row[1], // Descripción
          row[2], // Monto
          row[3], // Categoría
          row[6], // Método Pago
          new Date(),
          'Pendiente'
        ]);
        
        // Actualizar última ejecución y próxima ejecución
        const rowNum = index + 2;
        recurringSheet.getRange(rowNum, 11).setValue(new Date()); // Última Ejecución
        
        // Calcular siguiente ejecución
        const nuevaProxima = calcularProximaEjecucion(row[5], row[4]);
        recurringSheet.getRange(rowNum, 10).setValue(nuevaProxima); // Próxima Ejecución
        
        generados++;
        Logger.log(`✅ Generado gasto pendiente: ${row[1]}`);
      }
    });
    
    Logger.log(`✅ Total de gastos generados: ${generados}`);
    
    return {
      success: true,
      generados: generados
    };
    
  } catch (error) {
    Logger.log('❌ Error generando gastos recurrentes: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

