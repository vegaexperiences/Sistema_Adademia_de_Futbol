/**
 * ========================================
 * ARCHIVO: ExportManager.gs
 * DESCRIPCIÓN: Gestión de exportaciones a Excel y otros formatos
 * FUNCIONES: Exportar hojas, generar reportes, descargar datos
 * ========================================
 */

/**
 * Exporta una hoja específica a Excel (.xlsx)
 */
function exportSheetToExcel(sheetName) {
  try {
    Logger.log('=== EXPORTANDO HOJA A EXCEL ===');
    Logger.log('Hoja:', sheetName);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return {
        success: false,
        message: `Hoja "${sheetName}" no encontrada`
      };
    }
    
    // Obtener el ID de la hoja de cálculo
    const spreadsheetId = ss.getId();
    const sheetId = sheet.getSheetId();
    
    // Crear URL de exportación
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx&gid=${sheetId}`;
    
    Logger.log('URL de exportación generada:', exportUrl);
    
    return {
      success: true,
      url: exportUrl,
      sheetName: sheetName,
      message: 'URL de exportación generada exitosamente'
    };
    
  } catch (error) {
    Logger.log('Error exportando hoja: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Exporta múltiples hojas a Excel
 */
function exportMultipleSheetsToExcel(sheetNames) {
  try {
    Logger.log('=== EXPORTANDO MÚLTIPLES HOJAS ===');
    Logger.log('Hojas:', sheetNames);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetId = ss.getId();
    
    const exports = [];
    
    sheetNames.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const sheetId = sheet.getSheetId();
        const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx&gid=${sheetId}`;
        
        exports.push({
          sheetName: sheetName,
          url: exportUrl
        });
      }
    });
    
    return {
      success: true,
      exports: exports,
      total: exports.length
    };
    
  } catch (error) {
    Logger.log('Error exportando hojas: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Exporta toda la hoja de cálculo a Excel
 */
function exportAllToExcel() {
  try {
    Logger.log('=== EXPORTANDO TODO A EXCEL ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetId = ss.getId();
    
    // URL para exportar toda la hoja de cálculo
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    
    Logger.log('URL de exportación completa:', exportUrl);
    
    return {
      success: true,
      url: exportUrl,
      fileName: ss.getName() + '.xlsx',
      message: 'URL de exportación completa generada'
    };
    
  } catch (error) {
    Logger.log('Error exportando todo: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Genera un reporte de jugadores activos en formato Excel
 */
function generatePlayersReportExcel() {
  try {
    Logger.log('=== GENERANDO REPORTE DE JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return {
        success: false,
        message: 'Hoja de Jugadores no encontrada'
      };
    }
    
    // Crear una nueva hoja temporal para el reporte
    const reportSheet = ss.insertSheet('Reporte_Jugadores_' + new Date().getTime());
    
    // Copiar datos de jugadores
    const data = playersSheet.getDataRange().getValues();
    reportSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    // Formatear el reporte
    const headerRange = reportSheet.getRange(1, 1, 1, data[0].length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1e3a8a');
    headerRange.setFontColor('white');
    
    // Generar URL de exportación
    const sheetId = reportSheet.getSheetId();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx&gid=${sheetId}`;
    
    Logger.log('Reporte generado, URL:', exportUrl);
    
    return {
      success: true,
      url: exportUrl,
      sheetName: reportSheet.getName(),
      fileName: 'Reporte_Jugadores_' + new Date().toLocaleDateString() + '.xlsx',
      message: 'Reporte generado exitosamente',
      note: 'La hoja temporal se puede eliminar después de descargar'
    };
    
  } catch (error) {
    Logger.log('Error generando reporte: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Genera un reporte financiero en formato Excel
 */
function generateFinancialReportExcel(period) {
  try {
    Logger.log('=== GENERANDO REPORTE FINANCIERO ===');
    Logger.log('Período:', period);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Crear hoja temporal para el reporte
    const reportSheet = ss.insertSheet('Reporte_Financiero_' + new Date().getTime());
    
    // Headers del reporte
    const headers = [
      'Tipo', 'Descripción', 'Monto', 'Fecha', 'Método', 'Estado', 'Categoría'
    ];
    reportSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Obtener datos financieros
    const paymentsSheet = ss.getSheetByName('Pagos');
    const expensesSheet = ss.getSheetByName('Gastos');
    
    let rowIndex = 2;
    
    // Agregar pagos
    if (paymentsSheet) {
      const paymentsData = paymentsSheet.getDataRange().getValues();
      for (let i = 1; i < paymentsData.length; i++) {
        const payment = paymentsData[i];
        reportSheet.getRange(rowIndex, 1, 1, 7).setValues([[
          'INGRESO',
          payment[2] || 'Pago', // Tipo
          payment[3] || 0, // Monto
          payment[4] || new Date(), // Fecha
          payment[6] || 'N/A', // Método
          payment[5] || 'Pendiente', // Estado
          'Pago de jugador'
        ]]);
        rowIndex++;
      }
    }
    
    // Agregar gastos
    if (expensesSheet) {
      const expensesData = expensesSheet.getDataRange().getValues();
      for (let i = 1; i < expensesData.length; i++) {
        const expense = expensesData[i];
        reportSheet.getRange(rowIndex, 1, 1, 7).setValues([[
          'GASTO',
          expense[1] || 'Gasto', // Descripción
          expense[2] || 0, // Monto
          expense[3] || new Date(), // Fecha
          expense[5] || 'N/A', // Método
          'Pagado',
          expense[4] || 'Sin categoría' // Categoría
        ]]);
        rowIndex++;
      }
    }
    
    // Formatear headers
    const headerRange = reportSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#10b981');
    headerRange.setFontColor('white');
    
    // Generar URL de exportación
    const sheetId = reportSheet.getSheetId();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx&gid=${sheetId}`;
    
    return {
      success: true,
      url: exportUrl,
      sheetName: reportSheet.getName(),
      fileName: 'Reporte_Financiero_' + new Date().toLocaleDateString() + '.xlsx',
      totalRecords: rowIndex - 2
    };
    
  } catch (error) {
    Logger.log('Error generando reporte financiero: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Genera un reporte del histórico completo
 */
function generateHistoricReportExcel() {
  try {
    Logger.log('=== GENERANDO REPORTE DEL HISTÓRICO ===');
    
    const result = exportSheetToExcel('Historico_Completo');
    
    if (result.success) {
      result.fileName = 'Historico_Completo_' + new Date().toLocaleDateString() + '.xlsx';
    }
    
    return result;
    
  } catch (error) {
    Logger.log('Error generando reporte histórico: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Exporta la cola de aprobaciones actual
 */
function exportApprovalsQueueExcel() {
  try {
    Logger.log('=== EXPORTANDO COLA DE APROBACIONES ===');
    
    const result = exportSheetToExcel('Aprobaciones');
    
    if (result.success) {
      result.fileName = 'Cola_Aprobaciones_' + new Date().toLocaleDateString() + '.xlsx';
    }
    
    return result;
    
  } catch (error) {
    Logger.log('Error exportando cola: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Exporta datos de un grupo familiar específico
 */
function exportFamilyGroupExcel(familyId) {
  try {
    Logger.log('=== EXPORTANDO GRUPO FAMILIAR ===');
    Logger.log('ID de familia:', familyId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Crear hoja temporal
    const reportSheet = ss.insertSheet('Familia_' + familyId + '_' + new Date().getTime());
    
    // Headers
    const headers = [
      'Nombre', 'Edad', 'Categoría', 'Estado', 'Mensualidad', 'Saldo Pendiente'
    ];
    reportSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Aquí agregarías la lógica para obtener los datos de la familia
    // Por ahora, solo generamos la estructura
    
    // Formatear
    const headerRange = reportSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f59e0b');
    headerRange.setFontColor('white');
    
    // Generar URL
    const sheetId = reportSheet.getSheetId();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx&gid=${sheetId}`;
    
    return {
      success: true,
      url: exportUrl,
      fileName: `Familia_${familyId}_${new Date().toLocaleDateString()}.xlsx`
    };
    
  } catch (error) {
    Logger.log('Error exportando familia: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Limpia hojas temporales de reportes antiguos
 */
function cleanupTempReportSheets() {
  try {
    Logger.log('=== LIMPIANDO HOJAS TEMPORALES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    let deleted = 0;
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      // Eliminar hojas que empiecen con "Reporte_" o "Familia_"
      if (name.startsWith('Reporte_') || name.startsWith('Familia_')) {
        ss.deleteSheet(sheet);
        deleted++;
        Logger.log('Hoja eliminada:', name);
      }
    });
    
    Logger.log(`Total de hojas temporales eliminadas: ${deleted}`);
    
    return {
      success: true,
      deleted: deleted,
      message: `${deleted} hoja(s) temporal(es) eliminada(s)`
    };
    
  } catch (error) {
    Logger.log('Error limpiando hojas temporales: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Genera un reporte completo del sistema (todas las hojas importantes)
 */
function generateCompleteSystemReport() {
  try {
    Logger.log('=== GENERANDO REPORTE COMPLETO DEL SISTEMA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetId = ss.getId();
    
    // Exportar toda la hoja de cálculo
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    
    // Obtener estadísticas
    const sheets = ss.getSheets();
    const sheetNames = sheets.map(s => s.getName());
    
    return {
      success: true,
      url: exportUrl,
      fileName: `Sistema_Completo_SUAREZ_ACADEMY_${new Date().toLocaleDateString()}.xlsx`,
      sheetsIncluded: sheetNames,
      totalSheets: sheetNames.length,
      message: 'Reporte completo generado'
    };
    
  } catch (error) {
    Logger.log('Error generando reporte completo: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Exporta solo los datos de aprobaciones pendientes
 */
function exportPendingApprovalsExcel() {
  try {
    Logger.log('=== EXPORTANDO APROBACIONES PENDIENTES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      return {
        success: false,
        message: 'Hoja de Aprobaciones no encontrada'
      };
    }
    
    // Crear hoja temporal con solo pendientes
    const reportSheet = ss.insertSheet('Pendientes_' + new Date().getTime());
    
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const estadoIndex = headers.indexOf('Estado');
    
    // Copiar headers
    reportSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Copiar solo filas pendientes
    let rowIndex = 2;
    for (let i = 1; i < data.length; i++) {
      if (data[i][estadoIndex] === 'Pendiente') {
        reportSheet.getRange(rowIndex, 1, 1, data[i].length).setValues([data[i]]);
        rowIndex++;
      }
    }
    
    // Formatear
    const headerRange = reportSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f59e0b');
    headerRange.setFontColor('white');
    
    // Generar URL
    const sheetId = reportSheet.getSheetId();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx&gid=${sheetId}`;
    
    return {
      success: true,
      url: exportUrl,
      fileName: `Aprobaciones_Pendientes_${new Date().toLocaleDateString()}.xlsx`,
      totalPending: rowIndex - 2
    };
    
  } catch (error) {
    Logger.log('Error exportando pendientes: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Exporta datos financieros del mes actual
 */
function exportCurrentMonthFinancialExcel() {
  try {
    Logger.log('=== EXPORTANDO DATOS FINANCIEROS DEL MES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reportSheet = ss.insertSheet('Financiero_Mes_' + new Date().getTime());
    
    // Obtener resumen financiero
    const summary = getFinancialSummary('current_month');
    
    // Crear reporte
    const reportData = [
      ['REPORTE FINANCIERO - ' + new Date().toLocaleDateString()],
      [''],
      ['RESUMEN DEL MES'],
      ['Total Ingresos', summary.totalIncome],
      ['Total Gastos', summary.totalExpenses],
      ['Ganancia Neta', summary.netProfit],
      ['Margen de Ganancia', summary.profitMargin + '%'],
      [''],
      ['INGRESOS POR TIPO'],
    ];
    
    // Agregar ingresos por tipo
    Object.keys(summary.incomeByType || {}).forEach(type => {
      reportData.push([type, summary.incomeByType[type]]);
    });
    
    reportData.push(['']);
    reportData.push(['GASTOS POR CATEGORÍA']);
    
    // Agregar gastos por categoría
    Object.keys(summary.expensesByCategory || {}).forEach(category => {
      reportData.push([category, summary.expensesByCategory[category]]);
    });
    
    // Escribir datos
    reportSheet.getRange(1, 1, reportData.length, 2).setValues(reportData);
    
    // Formatear
    reportSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setFontSize(14);
    reportSheet.getRange(3, 1, 1, 2).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('white');
    reportSheet.getRange(9, 1, 1, 2).setFontWeight('bold').setBackground('#10b981').setFontColor('white');
    
    // Ajustar columnas
    reportSheet.autoResizeColumns(1, 2);
    
    // Generar URL
    const sheetId = reportSheet.getSheetId();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx&gid=${sheetId}`;
    
    return {
      success: true,
      url: exportUrl,
      fileName: `Reporte_Financiero_${new Date().toLocaleDateString()}.xlsx`,
      summary: summary
    };
    
  } catch (error) {
    Logger.log('Error generando reporte financiero: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

