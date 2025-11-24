/**
 * ========================================
 * ARCHIVO: FixJugadoresStructure.gs
 * DESCRIPCIÓN: Corrige la estructura de columnas de la hoja Jugadores
 * ========================================
 */

/**
 * Verifica la estructura de la hoja Jugadores
 */
function verifyJugadoresStructure() {
  try {
    Logger.log('=== VERIFICANDO ESTRUCTURA JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      return {
        success: false,
        message: 'Hoja "Jugadores" no encontrada'
      };
    }
    
    // Headers actuales
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Headers esperados
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
      'Email Tutor',      // ← FALTA
      'Dirección',        // ← FALTA
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
    
    Logger.log('Headers actuales:', currentHeaders.length, currentHeaders);
    Logger.log('Headers esperados:', expectedHeaders.length, expectedHeaders);
    
    // Comparar
    const missing = [];
    const misplaced = [];
    
    expectedHeaders.forEach((header, index) => {
      if (currentHeaders[index] !== header) {
        if (currentHeaders.includes(header)) {
          misplaced.push({
            header: header,
            expectedIndex: index,
            actualIndex: currentHeaders.indexOf(header)
          });
        } else {
          missing.push({
            header: header,
            expectedIndex: index
          });
        }
      }
    });
    
    Logger.log('Columnas faltantes:', missing);
    Logger.log('Columnas mal ubicadas:', misplaced);
    
    return {
      success: true,
      currentHeaders: currentHeaders,
      expectedHeaders: expectedHeaders,
      missing: missing,
      misplaced: misplaced,
      needsFix: missing.length > 0 || misplaced.length > 0
    };
    
  } catch (error) {
    Logger.log('Error verificando estructura:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Arregla la estructura de la hoja Jugadores agregando columnas faltantes
 */
function fixJugadoresStructure() {
  try {
    Logger.log('=== ARREGLANDO ESTRUCTURA JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja "Jugadores" no encontrada');
    }
    
    // Headers actuales
    const lastColumn = sheet.getLastColumn();
    const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    Logger.log('Headers actuales:', currentHeaders);
    
    // Headers esperados en orden correcto
    const expectedHeaders = [
      'ID',                         // A (0)
      'Nombre',                     // B (1)
      'Apellidos',                  // C (2)
      'Edad',                       // D (3)
      'Cédula',                     // E (4)
      'Teléfono',                   // F (5)
      'Categoría',                  // G (6)
      'Estado',                     // H (7)
      'Fecha Registro',             // I (8)
      'Tutor',                      // J (9)
      'Email Tutor',                // K (10) ← DEBE ESTAR AQUÍ
      'Dirección',                  // L (11) ← DEBE ESTAR AQUÍ
      'Familia ID',                 // M (12)
      'Tipo',                       // N (13)
      'Descuento %',                // O (14)
      'Observaciones',              // P (15)
      'Fecha Nacimiento',           // Q (16)
      'Género',                     // R (17)
      'Método Pago Preferido',      // S (18)
      'Cédula Tutor',               // T (19)
      'Mensualidad Personalizada',  // U (20)
      'URL Cédula Jugador',         // V (21)
      'URL Cédula Tutor'            // W (22)
    ];
    
    // Detectar si faltan "Email Tutor" y "Dirección" después de "Tutor"
    const tutorIndex = currentHeaders.indexOf('Tutor');
    const emailTutorIndex = currentHeaders.indexOf('Email Tutor');
    const direccionIndex = currentHeaders.indexOf('Dirección');
    
    let columnsAdded = 0;
    
    // Si "Email Tutor" no está o está en el lugar equivocado
    if (emailTutorIndex === -1 || emailTutorIndex !== tutorIndex + 1) {
      Logger.log('⚠️ Falta "Email Tutor" después de "Tutor"');
      
      // Insertar columna después de "Tutor" (índice J+1 = K)
      sheet.insertColumnAfter(tutorIndex + 1);
      sheet.getRange(1, tutorIndex + 2).setValue('Email Tutor');
      
      // Formatear header
      sheet.getRange(1, tutorIndex + 2).setBackground('#1e3a8a').setFontColor('#ffffff').setFontWeight('bold');
      
      columnsAdded++;
      Logger.log('✅ Columna "Email Tutor" agregada en posición K');
    }
    
    // Actualizar índice de Tutor por si se agregó una columna
    const newTutorIndex = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].indexOf('Tutor');
    
    // Si "Dirección" no está o está en el lugar equivocado
    const newCurrentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newDireccionIndex = newCurrentHeaders.indexOf('Dirección');
    
    if (newDireccionIndex === -1 || newDireccionIndex !== newTutorIndex + 2) {
      Logger.log('⚠️ Falta "Dirección" después de "Email Tutor"');
      
      // Insertar columna después de "Email Tutor" (índice K+1 = L)
      sheet.insertColumnAfter(newTutorIndex + 2);
      sheet.getRange(1, newTutorIndex + 3).setValue('Dirección');
      
      // Formatear header
      sheet.getRange(1, newTutorIndex + 3).setBackground('#1e3a8a').setFontColor('#ffffff').setFontWeight('bold');
      
      columnsAdded++;
      Logger.log('✅ Columna "Dirección" agregada en posición L');
    }
    
    // Verificar headers finales
    const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Headers finales:', finalHeaders);
    
    // Verificar que coincidan con los esperados (al menos las primeras 21 columnas)
    let isCorrect = true;
    for (let i = 0; i < Math.min(expectedHeaders.length, finalHeaders.length); i++) {
      if (finalHeaders[i] !== expectedHeaders[i]) {
        Logger.log(`⚠️ Diferencia en índice ${i}: esperado "${expectedHeaders[i]}", actual "${finalHeaders[i]}"`);
        isCorrect = false;
      }
    }
    
    if (isCorrect) {
      Logger.log('✅ Estructura corregida correctamente');
    } else {
      Logger.log('⚠️ Aún hay diferencias en la estructura');
    }
    
    return {
      success: true,
      message: `Estructura corregida. ${columnsAdded} columnas agregadas.`,
      columnsAdded: columnsAdded,
      finalHeaders: finalHeaders,
      dataRows: sheet.getLastRow() - 1
    };
    
  } catch (error) {
    Logger.log('❌ Error arreglando estructura:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Muestra un reporte de la estructura actual vs esperada
 */
function reportJugadoresStructure() {
  try {
    const result = verifyJugadoresStructure();
    
    if (!result.success) {
      SpreadsheetApp.getUi().alert('Error: ' + result.message);
      return;
    }
    
    let mensaje = '📋 ESTRUCTURA DE LA HOJA JUGADORES\n\n';
    mensaje += `Columnas actuales: ${result.currentHeaders.length}\n`;
    mensaje += `Columnas esperadas: ${result.expectedHeaders.length}\n\n`;
    
    if (result.missing.length > 0) {
      mensaje += '❌ COLUMNAS FALTANTES:\n';
      result.missing.forEach(item => {
        mensaje += `  • ${item.header} (debería estar en posición ${item.expectedIndex + 1})\n`;
      });
      mensaje += '\n';
    }
    
    if (result.misplaced.length > 0) {
      mensaje += '⚠️ COLUMNAS MAL UBICADAS:\n';
      result.misplaced.forEach(item => {
        mensaje += `  • ${item.header} está en posición ${item.actualIndex + 1}, debería estar en ${item.expectedIndex + 1}\n`;
      });
      mensaje += '\n';
    }
    
    if (result.needsFix) {
      mensaje += '🔧 SOLUCIÓN:\n';
      mensaje += 'Usa el menú "🔧 Herramientas" → "🔨 Arreglar Estructura de Jugadores"\n';
      mensaje += 'para corregir automáticamente las columnas.';
    } else {
      mensaje += '✅ La estructura es correcta!';
    }
    
    SpreadsheetApp.getUi().alert('Reporte de Estructura', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

