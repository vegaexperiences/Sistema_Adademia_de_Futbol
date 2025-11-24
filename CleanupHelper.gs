/**
 * ========================================
 * ARCHIVO: CleanupHelper.gs
 * DESCRIPCIÓN: Herramientas para limpiar hojas duplicadas y backups
 * FUNCIONES: Diagnóstico y limpieza de hojas
 * ========================================
 */

/**
 * Lista todas las hojas del sistema
 */
function listAllSheets() {
  try {
    Logger.log('=== LISTANDO TODAS LAS HOJAS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    const sheetList = sheets.map((sheet, index) => {
      const name = sheet.getName();
      const rowCount = sheet.getLastRow();
      const colCount = sheet.getLastColumn();
      
      return {
        index: index,
        name: name,
        rows: rowCount,
        columns: colCount,
        isEmpty: rowCount <= 1,
        isBackup: name.includes('BACKUP') || name.includes('VIEJO') || name.includes('NUEVO'),
        isJugadores: name.toLowerCase().includes('jugador')
      };
    });
    
    Logger.log('Total de hojas:', sheetList.length);
    
    sheetList.forEach(sheet => {
      Logger.log(`[${sheet.index}] ${sheet.name} - ${sheet.rows} filas, ${sheet.columns} cols${sheet.isBackup ? ' [BACKUP]' : ''}${sheet.isJugadores ? ' [JUGADORES]' : ''}`);
    });
    
    return {
      success: true,
      sheets: sheetList,
      total: sheetList.length
    };
    
  } catch (error) {
    Logger.log('Error listando hojas:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Identifica la hoja correcta de Jugadores
 */
function identifyCorrectJugadoresSheet() {
  try {
    Logger.log('=== IDENTIFICANDO HOJA CORRECTA DE JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    const jugadoresSheets = sheets.filter(sheet => {
      const name = sheet.getName();
      return name.toLowerCase().includes('jugador');
    });
    
    Logger.log(`Hojas relacionadas con Jugadores encontradas: ${jugadoresSheets.length}`);
    
    const analysis = jugadoresSheets.map(sheet => {
      const name = sheet.getName();
      const rowCount = sheet.getLastRow();
      const isBackup = name.includes('BACKUP') || name.includes('VIEJO') || name.includes('NUEVO');
      const isExact = name === 'Jugadores';
      
      return {
        name: name,
        rows: rowCount,
        dataRows: rowCount - 1, // Sin header
        isBackup: isBackup,
        isExactMatch: isExact,
        recommended: isExact && !isBackup
      };
    });
    
    // Ordenar por más recomendada
    analysis.sort((a, b) => {
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
      if (a.isBackup && !b.isBackup) return 1;
      if (!a.isBackup && b.isBackup) return -1;
      return b.dataRows - a.dataRows; // Más filas = más probable que sea la correcta
    });
    
    Logger.log('Análisis de hojas de Jugadores:');
    analysis.forEach(sheet => {
      Logger.log(`  ${sheet.recommended ? '✅' : '  '} ${sheet.name} - ${sheet.dataRows} jugadores${sheet.isBackup ? ' [BACKUP]' : ''}${sheet.isExactMatch ? ' [EXACTA]' : ''}`);
    });
    
    return {
      success: true,
      sheets: analysis,
      recommended: analysis.find(s => s.recommended) || analysis[0]
    };
    
  } catch (error) {
    Logger.log('Error identificando hoja correcta:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Limpia hojas de backup antiguas
 */
function cleanupBackupSheets() {
  try {
    Logger.log('=== LIMPIANDO HOJAS DE BACKUP ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    const backupSheets = sheets.filter(sheet => {
      const name = sheet.getName();
      return (name.includes('BACKUP') || name.includes('VIEJO') || name.includes('_NUEVO')) &&
             name !== 'Jugadores'; // Nunca eliminar la hoja principal
    });
    
    Logger.log(`Hojas de backup encontradas: ${backupSheets.length}`);
    
    const deleted = [];
    
    backupSheets.forEach(sheet => {
      const name = sheet.getName();
      Logger.log(`Eliminando: ${name}`);
      ss.deleteSheet(sheet);
      deleted.push(name);
    });
    
    Logger.log(`✅ ${deleted.length} hojas de backup eliminadas`);
    
    return {
      success: true,
      message: `${deleted.length} hojas de backup eliminadas`,
      deleted: deleted
    };
    
  } catch (error) {
    Logger.log('Error limpiando backups:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Verifica y arregla el nombre de la hoja de Jugadores
 */
function fixJugadoresSheetName() {
  try {
    Logger.log('=== ARREGLANDO NOMBRE DE HOJA JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Buscar si ya existe "Jugadores" exacta
    let jugadoresSheet = ss.getSheetByName('Jugadores');
    
    if (jugadoresSheet) {
      Logger.log('✅ La hoja "Jugadores" existe y es correcta');
      return {
        success: true,
        message: 'La hoja Jugadores ya existe con el nombre correcto',
        action: 'none'
      };
    }
    
    // Buscar hojas con nombres similares
    const sheets = ss.getSheets();
    const similarSheets = sheets.filter(sheet => {
      const name = sheet.getName();
      return name.toLowerCase().includes('jugador');
    });
    
    if (similarSheets.length === 0) {
      Logger.log('❌ No se encontró ninguna hoja de Jugadores');
      return {
        success: false,
        message: 'No se encontró ninguna hoja de Jugadores en el sistema'
      };
    }
    
    // Encontrar la hoja con más datos (probablemente la correcta)
    similarSheets.sort((a, b) => b.getLastRow() - a.getLastRow());
    const bestCandidate = similarSheets[0];
    
    Logger.log(`Mejor candidato: ${bestCandidate.getName()} con ${bestCandidate.getLastRow()} filas`);
    
    // Renombrar a "Jugadores"
    bestCandidate.setName('Jugadores');
    
    Logger.log(`✅ Hoja renombrada a "Jugadores"`);
    
    return {
      success: true,
      message: `Hoja "${bestCandidate.getName()}" renombrada a "Jugadores"`,
      action: 'renamed',
      oldName: bestCandidate.getName()
    };
    
  } catch (error) {
    Logger.log('Error arreglando nombre:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Diagnóstico completo del problema de Jugadores
 */
function diagnosticoCompletoJugadores() {
  try {
    Logger.log('=== DIAGNÓSTICO COMPLETO JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    // 1. Listar todas las hojas relacionadas con Jugadores
    const jugadoresRelated = [];
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      if (name.toLowerCase().includes('jugador')) {
        const data = sheet.getDataRange().getValues();
        jugadoresRelated.push({
          nombre: name,
          filas: sheet.getLastRow(),
          columnas: sheet.getLastColumn(),
          datosReales: sheet.getLastRow() - 1,
          esExacta: name === 'Jugadores',
          esBackup: name.includes('BACKUP') || name.includes('VIEJO') || name.includes('NUEVO'),
          primerasFila: data.length > 1 ? data[1] : []
        });
      }
    });
    
    Logger.log(`\n📋 HOJAS ENCONTRADAS (${jugadoresRelated.length}):`);
    jugadoresRelated.forEach((sheet, idx) => {
      Logger.log(`\n${idx + 1}. ${sheet.nombre}`);
      Logger.log(`   Filas: ${sheet.filas} (${sheet.datosReales} jugadores)`);
      Logger.log(`   Columnas: ${sheet.columnas}`);
      Logger.log(`   Exacta: ${sheet.esExacta ? '✅' : '❌'}`);
      Logger.log(`   Backup: ${sheet.esBackup ? '⚠️ SÍ' : '✅ NO'}`);
    });
    
    // 2. Recomendar acción
    const exacta = jugadoresRelated.find(s => s.esExacta);
    const conMasDatos = jugadoresRelated.filter(s => !s.esBackup).sort((a, b) => b.datosReales - a.datosReales)[0];
    
    let recomendacion = '';
    
    if (exacta && exacta.datosReales > 0) {
      recomendacion = `✅ La hoja "Jugadores" existe y tiene ${exacta.datosReales} jugadores. Elimina las hojas de backup.`;
    } else if (conMasDatos) {
      recomendacion = `⚠️ Renombrar "${conMasDatos.nombre}" a "Jugadores" (tiene ${conMasDatos.datosReales} jugadores).`;
    } else {
      recomendacion = `❌ No hay hoja válida de Jugadores. Crear nueva.`;
    }
    
    Logger.log(`\n📌 RECOMENDACIÓN: ${recomendacion}`);
    
    return {
      success: true,
      hojas: jugadoresRelated,
      recomendacion: recomendacion,
      exactaExiste: !!exacta,
      backupsCount: jugadoresRelated.filter(s => s.esBackup).length
    };
    
  } catch (error) {
    Logger.log('Error en diagnóstico:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Crea la hoja de Jugadores si no existe
 */
function createJugadoresSheetIfNeeded() {
  try {
    Logger.log('=== VERIFICANDO/CREANDO HOJA JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let jugadoresSheet = ss.getSheetByName('Jugadores');
    
    if (jugadoresSheet) {
      Logger.log('✅ La hoja "Jugadores" ya existe');
      return {
        success: true,
        message: 'La hoja Jugadores ya existe',
        action: 'none',
        sheet: jugadoresSheet
      };
    }
    
    Logger.log('⚠️ Hoja "Jugadores" no encontrada, creando nueva...');
    
    // Crear nueva hoja
    jugadoresSheet = ss.insertSheet('Jugadores');
    
    // Agregar headers
    const headers = [
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
      'Cédula Jugador URL',
      'Cédula Tutor URL'
    ];
    
    jugadoresSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Formatear headers
    const headerRange = jugadoresSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1e3a8a');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // Congelar primera fila
    jugadoresSheet.setFrozenRows(1);
    
    // Auto-ajustar columnas
    for (let i = 1; i <= headers.length; i++) {
      jugadoresSheet.setColumnWidth(i, 150);
    }
    
    Logger.log('✅ Hoja "Jugadores" creada exitosamente con headers');
    
    return {
      success: true,
      message: 'Hoja Jugadores creada exitosamente',
      action: 'created',
      sheet: jugadoresSheet
    };
    
  } catch (error) {
    Logger.log('❌ Error creando hoja Jugadores:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Reparación automática de hojas de Jugadores
 */
function autoRepairJugadoresSheet() {
  try {
    Logger.log('=== REPARACIÓN AUTOMÁTICA JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Paso 1: Verificar si existe "Jugadores" exacta
    let jugadoresSheet = ss.getSheetByName('Jugadores');
    let wasCreated = false;
    
    if (!jugadoresSheet) {
      Logger.log('⚠️ No existe hoja "Jugadores", buscando candidatos...');
      
      // Buscar hojas similares
      const sheets = ss.getSheets();
      const candidates = sheets.filter(sheet => {
        const name = sheet.getName();
        return name.toLowerCase().includes('jugador') && 
               !name.includes('BACKUP') && 
               !name.includes('VIEJO');
      }).sort((a, b) => b.getLastRow() - a.getLastRow());
      
      if (candidates.length > 0) {
        const best = candidates[0];
        Logger.log(`Renombrando "${best.getName()}" a "Jugadores"`);
        best.setName('Jugadores');
        jugadoresSheet = best;
      } else {
        // No hay candidatos, crear nueva hoja
        Logger.log('⚠️ No hay candidatos, creando nueva hoja "Jugadores"...');
        const createResult = createJugadoresSheetIfNeeded();
        
        if (!createResult.success) {
          throw new Error('No se pudo crear la hoja Jugadores: ' + createResult.message);
        }
        
        jugadoresSheet = createResult.sheet;
        wasCreated = true;
        Logger.log('✅ Nueva hoja "Jugadores" creada');
      }
    }
    
    Logger.log(`✅ Hoja "Jugadores" identificada: ${jugadoresSheet.getLastRow() - 1} jugadores`);
    
    // Paso 2: Limpiar hojas de backup
    const sheets = ss.getSheets();
    const backups = sheets.filter(sheet => {
      const name = sheet.getName();
      return name !== 'Jugadores' && 
             name.toLowerCase().includes('jugador') &&
             (name.includes('BACKUP') || name.includes('VIEJO') || name.includes('NUEVO'));
    });
    
    Logger.log(`Hojas de backup encontradas: ${backups.length}`);
    
    const deleted = [];
    backups.forEach(sheet => {
      const name = sheet.getName();
      Logger.log(`Eliminando: ${name}`);
      ss.deleteSheet(sheet);
      deleted.push(name);
    });
    
    Logger.log(`✅ Reparación completada`);
    
    let message = 'Reparación exitosa. ';
    if (wasCreated) {
      message += 'Se creó una nueva hoja "Jugadores" con los headers correctos. ';
    } else {
      message += `Hoja "Jugadores" verificada con ${jugadoresSheet.getLastRow() - 1} jugadores. `;
    }
    message += `${deleted.length} hojas de backup eliminadas.`;
    
    return {
      success: true,
      message: message,
      jugadoresRows: jugadoresSheet.getLastRow() - 1,
      backupsDeleted: deleted.length,
      deletedSheets: deleted,
      wasCreated: wasCreated
    };
    
  } catch (error) {
    Logger.log('❌ Error en reparación:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

