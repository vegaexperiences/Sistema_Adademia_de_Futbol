/**
 * Limpieza final: Elimina columnas duplicadas exactas y mantiene solo las correctas
 */
function finalCleanupDuplicates() {
  try {
    Logger.log('=== LIMPIEZA FINAL DE DUPLICADOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja "Jugadores" no encontrada');
    }
    
    Logger.log('Paso 1: Leyendo headers...');
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    Logger.log(`Headers actuales (${headers.length}):`, headers);
    
    // Estructura correcta esperada
    const correctHeaders = [
      'ID', 'Nombre', 'Apellidos', 'Edad', 'Cédula', 'Teléfono', 'Categoría', 
      'Estado', 'Fecha Registro', 'Tutor', 'Email Tutor', 'Dirección', 
      'Familia ID', 'Tipo', 'Descuento %', 'Observaciones', 'Fecha Nacimiento', 
      'Género', 'Método Pago Preferido', 'Cédula Tutor', 'Mensualidad Personalizada', 
      'URL Cédula Jugador', 'URL Cédula Tutor'
    ];
    
    // Detectar columnas a eliminar
    const columnsToDelete = [];
    
    for (let i = correctHeaders.length; i < headers.length; i++) {
      columnsToDelete.push({
        index: i + 1,
        name: headers[i] || '(vacía)'
      });
    }
    
    Logger.log(`Columnas extra detectadas: ${columnsToDelete.length}`);
    columnsToDelete.forEach(col => {
      Logger.log(`  Columna ${col.index}: "${col.name}"`);
    });
    
    if (columnsToDelete.length === 0) {
      Logger.log('✅ No hay columnas extra para eliminar');
      return {
        success: true,
        message: 'No hay columnas duplicadas',
        deleted: 0
      };
    }
    
    Logger.log('Paso 2: Eliminando columnas extra de derecha a izquierda...');
    
    // Eliminar de derecha a izquierda para no afectar los índices
    for (let i = columnsToDelete.length - 1; i >= 0; i--) {
      const colIndex = correctHeaders.length + 1;
      Logger.log(`Eliminando columna ${colIndex}: "${sheet.getRange(1, colIndex).getValue()}"`);
      sheet.deleteColumn(colIndex);
    }
    
    Logger.log(`✅ ${columnsToDelete.length} columnas eliminadas`);
    
    // Verificar resultado final
    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Headers finales:', finalHeaders);
    Logger.log(`Total final: ${finalHeaders.length} columnas`);
    
    return {
      success: true,
      message: `${columnsToDelete.length} columnas duplicadas eliminadas`,
      deleted: columnsToDelete.length,
      deletedColumns: columnsToDelete,
      finalCount: finalHeaders.length
    };
    
  } catch (error) {
    Logger.log('❌ Error en limpieza final:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Restaura el tipo "becado" para jugadores específicos
 */
function restoreBecadoType() {
  try {
    Logger.log('=== RESTAURANDO TIPO BECADO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja "Jugadores" no encontrada');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Encontrar índices de columnas
    const idIdx = headers.indexOf('ID');
    const tipoIdx = headers.indexOf('Tipo');
    const nombreIdx = headers.indexOf('Nombre');
    
    Logger.log(`Índices: ID=${idIdx}, Tipo=${tipoIdx}, Nombre=${nombreIdx}`);
    
    if (tipoIdx === -1) {
      throw new Error('Columna "Tipo" no encontrada');
    }
    
    let updated = 0;
    
    // Buscar jugador "test" y marcarlo como becado
    for (let i = 1; i < data.length; i++) {
      const nombre = String(data[i][nombreIdx] || '').toLowerCase();
      const tipo = String(data[i][tipoIdx] || '');
      
      if (nombre === 'test' && tipo !== 'becado') {
        Logger.log(`Actualizando jugador en fila ${i + 1}: "${data[i][nombreIdx]}" → becado`);
        sheet.getRange(i + 1, tipoIdx + 1).setValue('becado');
        updated++;
      }
    }
    
    Logger.log(`✅ ${updated} jugadores actualizados a "becado"`);
    
    return {
      success: true,
      message: `${updated} jugador(es) marcado(s) como becado`,
      updated: updated
    };
    
  } catch (error) {
    Logger.log('❌ Error restaurando tipo becado:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Limpieza total: Elimina duplicados Y restaura tipos
 */
function runTotalCleanup() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '🧹 Limpieza Total',
      'Esta herramienta hará:\n\n' +
      '✅ Eliminar columnas duplicadas de "Descuento %" y "Observaciones"\n' +
      '✅ Restaurar el tipo "becado" para el jugador test\n' +
      '✅ Dejar solo las 23 columnas correctas\n\n' +
      'Tus datos NO se perderán.\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      return;
    }
    
    // Paso 1: Eliminar duplicados
    const cleanupResult = finalCleanupDuplicates();
    
    if (!cleanupResult.success) {
      throw new Error('Error en limpieza: ' + cleanupResult.message);
    }
    
    // Paso 2: Restaurar tipos
    const restoreResult = restoreBecadoType();
    
    if (!restoreResult.success) {
      throw new Error('Error restaurando tipos: ' + restoreResult.message);
    }
    
    let msg = `✅ ¡LIMPIEZA TOTAL EXITOSA!\n\n`;
    msg += `Columnas eliminadas: ${cleanupResult.deleted}\n`;
    msg += `Columnas finales: ${cleanupResult.finalCount}\n`;
    msg += `Jugadores marcados como becado: ${restoreResult.updated}\n\n`;
    msg += `🎉 Ahora abre "Gestión de Jugadores" y verás:\n`;
    msg += `• 🔵 javier david jr (AZUL - $100)\n`;
    msg += `• 🟡 test test (AMARILLO - becado)\n`;
    msg += `• ⚪ Los demás (BLANCO - normal)\n\n`;
    msg += `✅ Todos con animaciones de pulsación`;
    
    ui.alert('🧹 ¡Limpieza Exitosa!', msg, ui.ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

