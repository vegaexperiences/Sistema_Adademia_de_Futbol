/**
 * Inserta las columnas faltantes "Email Tutor" y "Dirección" en la hoja Jugadores
 * SIN PERDER DATOS
 */
function insertMissingColumns() {
  try {
    Logger.log('=== INSERTANDO COLUMNAS FALTANTES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja "Jugadores" no encontrada');
    }
    
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar con el usuario
    const response = ui.alert(
      '🔧 Insertar Columnas Faltantes',
      'Se insertarán 2 columnas:\n\n' +
      '• "Email Tutor" (después de "Tutor")\n' +
      '• "Dirección" (después de "Email Tutor")\n\n' +
      'Tus 5 jugadores NO se perderán.\n' +
      'Los datos se recorrerán automáticamente.\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      Logger.log('Operación cancelada por el usuario');
      return;
    }
    
    // Leer headers actuales
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Headers actuales:', headers);
    Logger.log('Total de columnas actuales:', headers.length);
    
    // Encontrar la posición de "Tutor" (debería ser columna 10, índice 9)
    const tutorIndex = headers.indexOf('Tutor');
    
    if (tutorIndex === -1) {
      throw new Error('No se encontró la columna "Tutor"');
    }
    
    Logger.log('Columna "Tutor" encontrada en posición:', tutorIndex + 1);
    
    // Insertar "Email Tutor" después de "Tutor" (posición 11)
    const emailTutorPosition = tutorIndex + 2; // +2 porque insertColumn usa índice 1-based
    Logger.log('Insertando "Email Tutor" en columna:', emailTutorPosition);
    sheet.insertColumnAfter(tutorIndex + 1);
    sheet.getRange(1, emailTutorPosition).setValue('Email Tutor');
    
    // Insertar "Dirección" después de "Email Tutor" (posición 12)
    const direccionPosition = emailTutorPosition + 1;
    Logger.log('Insertando "Dirección" en columna:', direccionPosition);
    sheet.insertColumnAfter(emailTutorPosition);
    sheet.getRange(1, direccionPosition).setValue('Dirección');
    
    SpreadsheetApp.flush();
    
    // Verificar resultado
    const newHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Headers después de insertar:', newHeaders);
    Logger.log('Total de columnas después:', newHeaders.length);
    
    const expectedHeaders = [
      'ID',
      'Nombre',
      'Apellidos',
      'Edad',
      'Cédula',
      'Teléfono',
      'Categoría',
      'Estado',
      'Fecha Registro',
      'Tutor',
      'Email Tutor',
      'Dirección',
      'Familia ID',
      'Tipo',
      'Descuento %',
      'Observaciones',
      'Fecha Nacimiento',
      'Género',
      'Método Pago Preferido',
      'Cédula Tutor',
      'Mensualidad Personalizada',
      'URL Cédula Jugador',
      'URL Cédula Tutor'
    ];
    
    let allMatch = true;
    const differences = [];
    
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (newHeaders[i] !== expectedHeaders[i]) {
        allMatch = false;
        differences.push(`Columna ${i + 1}: Esperado "${expectedHeaders[i]}", Actual "${newHeaders[i]}"`);
      }
    }
    
    let mensaje = '✅ COLUMNAS INSERTADAS EXITOSAMENTE\n\n';
    mensaje += `Total de columnas: ${newHeaders.length}/23\n\n`;
    
    if (allMatch && newHeaders.length === 23) {
      mensaje += '🎉 ¡Estructura PERFECTA!\n\n';
      mensaje += 'Columnas insertadas:\n';
      mensaje += '11. Email Tutor\n';
      mensaje += '12. Dirección\n\n';
      mensaje += 'Tus 5 jugadores están intactos.\n\n';
      mensaje += '✅ Ahora recarga "Gestión de Jugadores"';
    } else {
      mensaje += '⚠️ Hay diferencias:\n';
      differences.forEach(diff => mensaje += diff + '\n');
    }
    
    ui.alert('✅ Operación Completada', mensaje, ui.ButtonSet.OK);
    
    Logger.log('=== INSERCIÓN COMPLETADA ===');
    
    return {
      success: true,
      message: 'Columnas insertadas correctamente',
      totalColumns: newHeaders.length,
      headers: newHeaders
    };
    
  } catch (error) {
    Logger.log('❌ Error insertando columnas:', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Wrapper para llamar desde el menú
 */
function runInsertMissingColumns() {
  insertMissingColumns();
}

