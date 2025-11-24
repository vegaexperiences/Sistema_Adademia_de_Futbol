/**
 * Arreglo rápido: inserta Email Tutor y Dirección después de Tutor
 */
function quickInsertMissingColumns() {
  try {
    Logger.log('=== QUICK FIX: INSERTAR COLUMNAS FALTANTES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja Jugadores no encontrada');
    }
    
    // Obtener headers actuales
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Headers actuales:', headers);
    
    // Buscar posición de "Tutor"
    const tutorIndex = headers.indexOf('Tutor');
    
    if (tutorIndex === -1) {
      throw new Error('Columna "Tutor" no encontrada');
    }
    
    Logger.log(`Columna "Tutor" encontrada en posición ${tutorIndex + 1} (índice ${tutorIndex})`);
    
    // Verificar si ya existen "Email Tutor" y "Dirección"
    const nextColumn = headers[tutorIndex + 1];
    const nextNextColumn = headers[tutorIndex + 2];
    
    Logger.log(`Columna después de Tutor: "${nextColumn}"`);
    Logger.log(`Columna siguiente: "${nextNextColumn}"`);
    
    let columnsInserted = 0;
    
    // Si la siguiente columna NO es "Email Tutor", insertar
    if (nextColumn !== 'Email Tutor') {
      Logger.log('Insertando columna "Email Tutor" después de "Tutor"...');
      sheet.insertColumnAfter(tutorIndex + 1);
      sheet.getRange(1, tutorIndex + 2).setValue('Email Tutor');
      
      // Formatear header
      const headerCell = sheet.getRange(1, tutorIndex + 2);
      headerCell.setBackground('#1e3a8a');
      headerCell.setFontColor('#ffffff');
      headerCell.setFontWeight('bold');
      headerCell.setHorizontalAlignment('center');
      
      columnsInserted++;
      Logger.log('✅ "Email Tutor" insertada');
    }
    
    // Actualizar headers después de la inserción
    const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newTutorIndex = updatedHeaders.indexOf('Tutor');
    const columnAfterEmailTutor = updatedHeaders[newTutorIndex + 2];
    
    Logger.log(`Columna después de Email Tutor: "${columnAfterEmailTutor}"`);
    
    // Si la siguiente columna NO es "Dirección", insertar
    if (columnAfterEmailTutor !== 'Dirección') {
      Logger.log('Insertando columna "Dirección" después de "Email Tutor"...');
      sheet.insertColumnAfter(newTutorIndex + 2);
      sheet.getRange(1, newTutorIndex + 3).setValue('Dirección');
      
      // Formatear header
      const headerCell = sheet.getRange(1, newTutorIndex + 3);
      headerCell.setBackground('#1e3a8a');
      headerCell.setFontColor('#ffffff');
      headerCell.setFontWeight('bold');
      headerCell.setHorizontalAlignment('center');
      
      columnsInserted++;
      Logger.log('✅ "Dirección" insertada');
    }
    
    // Headers finales
    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Headers finales:', finalHeaders);
    Logger.log(`Total de columnas finales: ${finalHeaders.length}`);
    
    return {
      success: true,
      message: `Columnas insertadas exitosamente`,
      columnsInserted: columnsInserted,
      finalColumnCount: finalHeaders.length,
      finalHeaders: finalHeaders
    };
    
  } catch (error) {
    Logger.log('❌ Error insertando columnas:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Wrapper para el menú
 */
function runQuickFix() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '⚡ Arreglo Rápido',
      '¿Insertar las columnas "Email Tutor" y "Dirección" después de "Tutor"?\n\n' +
      'Esta es la forma más rápida de arreglar la estructura.\n' +
      'Tus datos NO se perderán.\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      return;
    }
    
    const result = quickInsertMissingColumns();
    
    if (result.success) {
      let msg = `✅ ${result.message}\n\n`;
      msg += `Columnas insertadas: ${result.columnsInserted}\n`;
      msg += `Total de columnas ahora: ${result.finalColumnCount}\n\n`;
      msg += `Estructura corregida:\n`;
      msg += `...→ Tutor → Email Tutor → Dirección → Familia ID →...\n\n`;
      msg += `✅ Ahora abre "Gestión de Jugadores" para ver tus jugadores.`;
      
      ui.alert('⚡ Arreglo Exitoso', msg, ui.ButtonSet.OK);
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

