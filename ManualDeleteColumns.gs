/**
 * Elimina MANUALMENTE las columnas duplicadas en las posiciones específicas
 */
function manualDeleteDuplicates() {
  try {
    Logger.log('=== ELIMINACIÓN MANUAL DE COLUMNAS DUPLICADAS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja Jugadores no encontrada');
    }
    
    Logger.log('Paso 1: Leyendo headers actuales...');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(`Total columnas: ${headers.length}`);
    Logger.log('Headers:', headers);
    
    // Encontrar las columnas duplicadas EXACTAS
    const duplicatePositions = [];
    
    for (let i = 0; i < headers.length; i++) {
      // Buscar duplicados de "Descuento %" y "Observaciones" después de la posición 14
      if (i > 14 && (headers[i] === 'Descuento %' || headers[i] === 'Observaciones')) {
        duplicatePositions.push({
          position: i + 1, // Posición real (1-indexed)
          name: headers[i]
        });
      }
    }
    
    Logger.log(`Duplicados encontrados: ${duplicatePositions.length}`);
    duplicatePositions.forEach(dup => {
      Logger.log(`  Posición ${dup.position}: "${dup.name}"`);
    });
    
    if (duplicatePositions.length === 0) {
      Logger.log('✅ No hay duplicados para eliminar');
      return {
        success: true,
        message: 'No se encontraron duplicados',
        deleted: 0
      };
    }
    
    Logger.log('Paso 2: Eliminando duplicados de derecha a izquierda...');
    
    // Eliminar de derecha a izquierda para no afectar índices
    for (let i = duplicatePositions.length - 1; i >= 0; i--) {
      const pos = duplicatePositions[i].position;
      const name = duplicatePositions[i].name;
      
      Logger.log(`Eliminando columna ${pos}: "${name}"`);
      sheet.deleteColumn(pos);
    }
    
    Logger.log(`✅ ${duplicatePositions.length} columnas duplicadas eliminadas`);
    
    // Verificar resultado
    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Headers finales:', finalHeaders);
    Logger.log(`Total final: ${finalHeaders.length} columnas`);
    
    return {
      success: true,
      message: `${duplicatePositions.length} columnas duplicadas eliminadas`,
      deleted: duplicatePositions.length,
      finalCount: finalHeaders.length,
      finalHeaders: finalHeaders
    };
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Wrapper para el menú
 */
function runManualDeleteDuplicates() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '🗑️ Eliminar Duplicados',
      '¿Eliminar las columnas duplicadas de "Descuento %" y "Observaciones"?\n\n' +
      'Esta operación:\n' +
      '✅ Buscará columnas duplicadas después de la posición 14\n' +
      '✅ Eliminará solo los duplicados, no las originales\n' +
      '✅ Mantendrá todos tus datos\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      return;
    }
    
    const result = manualDeleteDuplicates();
    
    if (result.success) {
      let msg = `✅ ¡Duplicados Eliminados!\n\n`;
      msg += `Columnas eliminadas: ${result.deleted}\n`;
      msg += `Total de columnas ahora: ${result.finalCount}\n\n`;
      msg += `Headers finales (primeros 15):\n`;
      for (let i = 0; i < Math.min(15, result.finalHeaders.length); i++) {
        msg += `  ${i + 1}. ${result.finalHeaders[i]}\n`;
      }
      msg += `\n✅ Ahora recarga "Gestión de Jugadores"`;
      
      ui.alert('🗑️ Éxito', msg, ui.ButtonSet.OK);
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

