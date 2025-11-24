/**
 * DIAGNÓSTICO DE ARCHIVOS ADJUNTOS
 * Funciones para diagnosticar y corregir problemas con archivos de cédulas
 */

/**
 * Ver estructura de la hoja Jugadores y sus columnas
 */
function diagnosticarHojaJugadores() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jugadoresSheet = ss.getSheetByName('Jugadores');
    
    if (!jugadoresSheet) {
      Logger.log('❌ Hoja de Jugadores no encontrada');
      return;
    }
    
    const headers = jugadoresSheet.getRange(1, 1, 1, jugadoresSheet.getLastColumn()).getValues()[0];
    
    Logger.log('=== HEADERS DE HOJA JUGADORES ===');
    headers.forEach((header, index) => {
      const column = String.fromCharCode(65 + index); // A, B, C, etc.
      Logger.log(`${column} (${index}): "${header}"`);
    });
    
    const urlJugadorIdx = headers.indexOf('URL Cédula Jugador');
    const urlTutorIdx = headers.indexOf('URL Cédula Tutor');
    
    Logger.log('\n=== ÍNDICES DE URLs ===');
    Logger.log(`URL Cédula Jugador: Columna ${urlJugadorIdx >= 0 ? String.fromCharCode(65 + urlJugadorIdx) : 'NO ENCONTRADA'} (índice ${urlJugadorIdx})`);
    Logger.log(`URL Cédula Tutor: Columna ${urlTutorIdx >= 0 ? String.fromCharCode(65 + urlTutorIdx) : 'NO ENCONTRADA'} (índice ${urlTutorIdx})`);
    
    // Ver datos de ejemplo
    if (jugadoresSheet.getLastRow() > 1) {
      const primeraFila = jugadoresSheet.getRange(2, 1, 1, jugadoresSheet.getLastColumn()).getValues()[0];
      Logger.log('\n=== PRIMER JUGADOR (ejemplo) ===');
      Logger.log('ID:', primeraFila[0]);
      Logger.log('Nombre:', primeraFila[1], primeraFila[2]);
      
      if (urlJugadorIdx >= 0) {
        Logger.log(`URL Cédula Jugador (columna ${String.fromCharCode(65 + urlJugadorIdx)}):`, primeraFila[urlJugadorIdx]);
      }
      if (urlTutorIdx >= 0) {
        Logger.log(`URL Cédula Tutor (columna ${String.fromCharCode(65 + urlTutorIdx)}):`, primeraFila[urlTutorIdx]);
      }
    }
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico: ' + error.toString());
  }
}

/**
 * Ver archivos adjuntos en la hoja de Aprobaciones
 */
function diagnosticarArchivosEnAprobaciones() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      Logger.log('❌ Hoja de Aprobaciones no encontrada');
      return;
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    
    Logger.log('=== HEADERS DE APROBACIONES ===');
    headers.forEach((header, index) => {
      const column = String.fromCharCode(65 + index);
      Logger.log(`${column} (${index}): "${header}"`);
    });
    
    const archivosIdx = headers.indexOf('Archivos Adjuntos');
    Logger.log('\n=== COLUMNA ARCHIVOS ADJUNTOS ===');
    Logger.log(`Índice: ${archivosIdx}`);
    
    if (archivosIdx >= 0 && data.length > 1) {
      Logger.log('\n=== ARCHIVOS EN CADA JUGADOR ===');
      for (let i = 1; i < data.length; i++) {
        const jugadorId = data[i][0];
        const jugadorNombre = data[i][1];
        const archivos = data[i][archivosIdx];
        
        Logger.log(`\nJugador ${i}: ${jugadorId} - ${jugadorNombre}`);
        Logger.log(`  Tipo: ${typeof archivos}`);
        Logger.log(`  Contenido: ${archivos}`);
        Logger.log(`  String: ${String(archivos)}`);
        
        if (archivos) {
          try {
            const parsed = JSON.parse(archivos);
            Logger.log(`  ✅ JSON Parseado:`, JSON.stringify(parsed, null, 2));
          } catch (e) {
            Logger.log(`  ❌ No es JSON válido: ${e.toString()}`);
          }
        }
      }
    } else {
      Logger.log('⚠️ Columna no encontrada o sin datos');
    }
    
  } catch (error) {
    Logger.log('❌ Error en diagnóstico: ' + error.toString());
  }
}

/**
 * Agregar columnas de URLs de cédulas si no existen
 */
function agregarColumnasURLsCedulas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jugadoresSheet = ss.getSheetByName('Jugadores');
    
    if (!jugadoresSheet) {
      Logger.log('❌ Hoja de Jugadores no encontrada');
      return { success: false, message: 'Hoja no encontrada' };
    }
    
    const headers = jugadoresSheet.getRange(1, 1, 1, jugadoresSheet.getLastColumn()).getValues()[0];
    
    let cambios = 0;
    
    // Verificar si existe columna V
    if (!headers[21] || headers[21] !== 'URL Cédula Jugador') {
      jugadoresSheet.getRange(1, 22).setValue('URL Cédula Jugador'); // Columna V (índice 21)
      cambios++;
      Logger.log('✅ Columna V "URL Cédula Jugador" agregada');
    }
    
    // Verificar si existe columna W
    if (!headers[22] || headers[22] !== 'URL Cédula Tutor') {
      jugadoresSheet.getRange(1, 23).setValue('URL Cédula Tutor'); // Columna W (índice 22)
      cambios++;
      Logger.log('✅ Columna W "URL Cédula Tutor" agregada');
    }
    
    if (cambios === 0) {
      Logger.log('✅ Las columnas ya existen');
    }
    
    // Reformatear header
    const lastCol = jugadoresSheet.getLastColumn();
    const headerRange = jugadoresSheet.getRange(1, 1, 1, lastCol);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1e3a8a');
    headerRange.setFontColor('white');
    
    return {
      success: true,
      message: cambios > 0 ? `${cambios} columnas agregadas` : 'Columnas ya existían',
      columnasAgregadas: cambios
    };
    
  } catch (error) {
    Logger.log('❌ Error agregando columnas: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

