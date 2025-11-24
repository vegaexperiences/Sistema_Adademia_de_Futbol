/**
 * Inspecciona las columnas de la hoja Jugadores
 */
function inspectJugadoresColumns() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      return {
        success: false,
        message: 'Hoja Jugadores no encontrada'
      };
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log('=== COLUMNAS ACTUALES ===');
    Logger.log(`Total: ${headers.length} columnas`);
    
    const expectedHeaders = [
      'ID',                         // 1
      'Nombre',                     // 2
      'Apellidos',                  // 3
      'Edad',                       // 4
      'Cédula',                     // 5
      'Teléfono',                   // 6
      'Categoría',                  // 7
      'Estado',                     // 8
      'Fecha Registro',             // 9
      'Tutor',                      // 10
      'Email Tutor',                // 11
      'Dirección',                  // 12
      'Familia ID',                 // 13
      'Tipo',                       // 14
      'Descuento %',                // 15
      'Observaciones',              // 16
      'Fecha Nacimiento',           // 17
      'Género',                     // 18
      'Método Pago Preferido',      // 19
      'Cédula Tutor',               // 20
      'Mensualidad Personalizada',  // 21
      'URL Cédula Jugador',         // 22
      'URL Cédula Tutor'            // 23
    ];
    
    const comparison = [];
    const maxLength = Math.max(headers.length, expectedHeaders.length);
    
    for (let i = 0; i < maxLength; i++) {
      const actual = headers[i] || '(vacío)';
      const expected = expectedHeaders[i] || '(no esperado)';
      const match = actual === expected;
      
      comparison.push({
        index: i + 1,
        actual: actual,
        expected: expected,
        match: match
      });
      
      const symbol = match ? '✅' : '❌';
      Logger.log(`${symbol} ${i + 1}. "${actual}" ${!match ? `→ Se esperaba "${expected}"` : ''}`);
    }
    
    // Detectar duplicados
    const duplicates = headers.filter((item, index) => headers.indexOf(item) !== index);
    if (duplicates.length > 0) {
      Logger.log('\n⚠️ COLUMNAS DUPLICADAS:');
      duplicates.forEach(dup => Logger.log(`  - "${dup}"`));
    }
    
    // Detectar columnas extra
    const extraColumns = headers.slice(expectedHeaders.length);
    if (extraColumns.length > 0) {
      Logger.log('\n⚠️ COLUMNAS EXTRA (deben eliminarse):');
      extraColumns.forEach((col, idx) => {
        Logger.log(`  ${expectedHeaders.length + idx + 1}. "${col}"`);
      });
    }
    
    return {
      success: true,
      totalColumns: headers.length,
      expectedColumns: expectedHeaders.length,
      headers: headers,
      comparison: comparison,
      duplicates: duplicates,
      extraColumns: extraColumns,
      needsCleanup: headers.length > expectedHeaders.length || duplicates.length > 0
    };
    
  } catch (error) {
    Logger.log('Error inspeccionando columnas:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Muestra el reporte de columnas en un diálogo
 */
function showColumnsReport() {
  try {
    const result = inspectJugadoresColumns();
    
    if (!result.success) {
      SpreadsheetApp.getUi().alert('Error: ' + result.message);
      return;
    }
    
    let mensaje = `📊 ANÁLISIS DE COLUMNAS - HOJA JUGADORES\n\n`;
    mensaje += `Columnas actuales: ${result.totalColumns}\n`;
    mensaje += `Columnas esperadas: ${result.expectedColumns}\n`;
    mensaje += `Diferencia: ${result.totalColumns - result.expectedColumns} columnas de más\n\n`;
    
    // Mostrar primeras 15 columnas
    mensaje += `PRIMERAS 15 COLUMNAS:\n`;
    for (let i = 0; i < Math.min(15, result.comparison.length); i++) {
      const item = result.comparison[i];
      const symbol = item.match ? '✅' : '❌';
      mensaje += `${symbol} ${item.index}. ${item.actual}\n`;
      if (!item.match && item.expected !== '(no esperado)') {
        mensaje += `     Esperado: "${item.expected}"\n`;
      }
    }
    
    if (result.comparison.length > 15) {
      mensaje += `\n... y ${result.comparison.length - 15} columnas más\n`;
    }
    
    // Duplicados
    if (result.duplicates.length > 0) {
      mensaje += `\n⚠️ COLUMNAS DUPLICADAS:\n`;
      result.duplicates.forEach(dup => {
        mensaje += `  • "${dup}"\n`;
      });
    }
    
    // Columnas extra
    if (result.extraColumns.length > 0) {
      mensaje += `\n⚠️ COLUMNAS EXTRA (posiciones ${result.expectedColumns + 1}-${result.totalColumns}):\n`;
      result.extraColumns.forEach((col, idx) => {
        mensaje += `  ${result.expectedColumns + idx + 1}. "${col}"\n`;
      });
    }
    
    if (result.needsCleanup) {
      mensaje += `\n🔧 SOLUCIÓN:\n`;
      mensaje += `Usa "🔧 Herramientas" → "🧹 Limpiar Columnas Extra"\n`;
      mensaje += `para eliminar automáticamente las columnas sobrantes.`;
    } else {
      mensaje += `\n✅ La estructura es correcta!`;
    }
    
    SpreadsheetApp.getUi().alert('Análisis de Columnas', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Limpia columnas extra de la hoja Jugadores
 */
function cleanupExtraColumns() {
  try {
    Logger.log('=== LIMPIANDO COLUMNAS EXTRA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja Jugadores no encontrada');
    }
    
    const currentColumns = sheet.getLastColumn();
    const expectedColumns = 23;
    
    if (currentColumns <= expectedColumns) {
      Logger.log('✅ No hay columnas extra para eliminar');
      return {
        success: true,
        message: 'No hay columnas extra. La estructura es correcta.',
        deleted: 0
      };
    }
    
    const columnsToDelete = currentColumns - expectedColumns;
    Logger.log(`Eliminando ${columnsToDelete} columnas extras (desde columna ${expectedColumns + 1} hasta ${currentColumns})`);
    
    // Eliminar columnas de derecha a izquierda
    for (let i = 0; i < columnsToDelete; i++) {
      sheet.deleteColumn(expectedColumns + 1);
    }
    
    Logger.log(`✅ ${columnsToDelete} columnas eliminadas`);
    
    return {
      success: true,
      message: `Limpieza exitosa. ${columnsToDelete} columnas eliminadas.`,
      deleted: columnsToDelete,
      finalColumns: sheet.getLastColumn()
    };
    
  } catch (error) {
    Logger.log('❌ Error limpiando columnas:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

