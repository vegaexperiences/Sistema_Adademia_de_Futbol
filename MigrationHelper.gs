/**
 * ========================================
 * ARCHIVO: MigrationHelper.gs
 * DESCRIPCIÓN: Herramientas para migrar datos entre versiones
 * FUNCIONES: Migración de estructura de Jugadores
 * ========================================
 */

/**
 * MIGRAR HOJA DE JUGADORES A LA NUEVA ESTRUCTURA
 * Esta función toma los jugadores existentes y los reorganiza con los headers correctos
 */
function migrateJugadoresSheet() {
  try {
    Logger.log('=== INICIANDO MIGRACIÓN DE JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const oldSheet = ss.getSheetByName('Jugadores');
    
    if (!oldSheet) {
      return {
        success: false,
        message: 'No hay hoja de Jugadores para migrar'
      };
    }
    
    // Leer datos actuales
    const oldData = oldSheet.getDataRange().getValues();
    
    if (oldData.length <= 1) {
      return {
        success: true,
        message: 'Hoja vacía, no hay datos para migrar',
        migrated: 0
      };
    }
    
    const oldHeaders = oldData[0];
    const oldRows = oldData.slice(1);
    
    Logger.log('Headers antiguos:', oldHeaders);
    Logger.log('Total de jugadores a migrar:', oldRows.length);
    
    // Crear nueva hoja temporal
    const newSheet = ss.insertSheet('Jugadores_NUEVO');
    
    // Headers correctos (21 columnas, sin duplicados, SIN TALLA)
    const newHeaders = [
      'ID',                           // A
      'Nombre',                       // B
      'Apellidos',                    // C
      'Edad',                         // D
      'Cédula',                       // E
      'Teléfono',                     // F
      'Categoría',                    // G
      'Estado',                       // H
      'Fecha Registro',               // I
      'Tutor',                        // J
      'Email Tutor',                  // K
      'Dirección',                    // L
      'Familia ID',                   // M
      'Tipo',                         // N
      'Descuento %',                  // O
      'Observaciones',                // P
      'Fecha Nacimiento',             // Q
      'Género',                       // R
      'Método Pago Preferido',        // S
      'Cédula Tutor',                 // T
      'Mensualidad Personalizada'     // U
    ];
    
    // Escribir headers
    newSheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    newSheet.getRange(1, 1, 1, newHeaders.length)
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('white');
    
    // Mapear datos antiguos a nueva estructura
    const newRows = [];
    
    oldRows.forEach((oldRow, index) => {
      const newRow = [
        oldRow[0] || '',   // A - ID
        oldRow[1] || '',   // B - Nombre
        oldRow[2] || '',   // C - Apellidos
        oldRow[3] || '',   // D - Edad
        oldRow[4] || '',   // E - Cédula
        oldRow[5] || '',   // F - Teléfono
        oldRow[6] || '',   // G - Categoría
        oldRow[7] || '',   // H - Estado
        oldRow[8] || '',   // I - Fecha Registro
        oldRow[9] || '',   // J - Tutor
        '',                // K - Email Tutor (vacío)
        '',                // L - Dirección (vacío)
        oldRow[10] || '',  // M - Familia ID
        oldRow[11] || '',  // N - Tipo
        oldRow[12] || 0,   // O - Descuento %
        oldRow[13] || '',  // P - Observaciones
        '',                // Q - Fecha Nacimiento (vacío)
        '',                // R - Género (vacío)
        '',                // S - Método Pago Preferido (vacío)
        '',                // T - Cédula Tutor (vacío)
        oldRow[26] || oldRow[21] || ''  // U - Mensualidad Personalizada
      ];
      
      newRows.push(newRow);
      
      if (index < 3) {
        Logger.log(`Jugador ${index + 1} migrado: ${newRow[1]} ${newRow[2]}`);
      }
    });
    
    // Escribir datos migrados
    if (newRows.length > 0) {
      newSheet.getRange(2, 1, newRows.length, newHeaders.length).setValues(newRows);
    }
    
    Logger.log(`✅ ${newRows.length} jugadores migrados a hoja temporal`);
    
    return {
      success: true,
      message: 'Migración completada. Ahora debes:\n1. Renombrar "Jugadores" a "Jugadores_VIEJO"\n2. Renombrar "Jugadores_NUEVO" a "Jugadores"\n3. Borrar "Jugadores_VIEJO"',
      migrated: newRows.length,
      sheetsCreated: ['Jugadores_NUEVO']
    };
    
  } catch (error) {
    Logger.log('❌ Error en migración: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * MIGRACIÓN AUTOMÁTICA COMPLETA
 * Hace todo el proceso automáticamente (más rápido)
 */
function autoMigrateJugadores() {
  try {
    Logger.log('=== MIGRACIÓN AUTOMÁTICA DE JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const oldSheet = ss.getSheetByName('Jugadores');
    
    if (!oldSheet) {
      return {
        success: false,
        message: 'No hay hoja de Jugadores para migrar'
      };
    }
    
    // Leer datos actuales
    const oldData = oldSheet.getDataRange().getValues();
    
    if (oldData.length <= 1) {
      return {
        success: true,
        message: 'Hoja vacía, no hay datos para migrar',
        migrated: 0
      };
    }
    
    const oldRows = oldData.slice(1);
    
    Logger.log('Jugadores a migrar:', oldRows.length);
    
    // Renombrar hoja antigua
    oldSheet.setName('Jugadores_BACKUP_' + Date.now());
    Logger.log('✓ Hoja antigua renombrada');
    
    // Crear nueva hoja con estructura correcta
    const newSheet = ss.insertSheet('Jugadores');
    
    // Headers correctos (SIN TALLA)
    const newHeaders = [
      'ID', 'Nombre', 'Apellidos', 'Edad', 'Cédula', 'Teléfono', 'Categoría', 
      'Estado', 'Fecha Registro', 'Tutor', 'Email Tutor', 'Dirección',
      'Familia ID', 'Tipo', 'Descuento %', 'Observaciones',
      'Fecha Nacimiento', 'Género', 'Método Pago Preferido',
      'Cédula Tutor', 'Mensualidad Personalizada'
    ];
    
    newSheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    newSheet.getRange(1, 1, 1, newHeaders.length)
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('white');
    
    Logger.log('✓ Nueva hoja creada con headers correctos');
    
    // Migrar datos (SIN TALLA)
    const newRows = oldRows.map(oldRow => [
      oldRow[0] || '',   // A - ID
      oldRow[1] || '',   // B - Nombre
      oldRow[2] || '',   // C - Apellidos
      oldRow[3] || '',   // D - Edad
      oldRow[4] || '',   // E - Cédula
      oldRow[5] || '',   // F - Teléfono
      oldRow[6] || '',   // G - Categoría
      oldRow[7] || '',   // H - Estado
      oldRow[8] || '',   // I - Fecha Registro
      oldRow[9] || '',   // J - Tutor
      '',                // K - Email Tutor (vacío)
      '',                // L - Dirección (vacío)
      oldRow[10] || '',  // M - Familia ID
      oldRow[11] || '',  // N - Tipo
      oldRow[12] || 0,   // O - Descuento %
      oldRow[13] || '',  // P - Observaciones
      '',                // Q - Fecha Nacimiento (vacío)
      '',                // R - Género (vacío)
      '',                // S - Método Pago Preferido (vacío)
      '',                // T - Cédula Tutor (vacío)
      oldRow[26] || oldRow[21] || ''  // U - Mensualidad Personalizada
    ]);
    
    if (newRows.length > 0) {
      newSheet.getRange(2, 1, newRows.length, newHeaders.length).setValues(newRows);
    }
    
    Logger.log(`✅ ${newRows.length} jugadores migrados exitosamente`);
    
    return {
      success: true,
      message: `✅ Migración completada. ${newRows.length} jugadores migrados.\n\nLa hoja antigua se guardó como backup.`,
      migrated: newRows.length,
      backupSheet: oldSheet.getName()
    };
    
  } catch (error) {
    Logger.log('❌ Error en migración automática: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * ASIGNAR FAMILIA ID A JUGADORES QUE NO LO TIENEN
 * Agrupa jugadores por tutor
 */
function assignFamilyIdsToPlayers() {
  try {
    Logger.log('=== ASIGNANDO FAMILIA IDs ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, message: 'No hay jugadores', assigned: 0 };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Agrupar por tutor
    const tutorGroups = new Map();
    
    rows.forEach((row, index) => {
      const tutorName = String(row[9] || '');  // J - Tutor
      const familyId = String(row[12] || '');  // M - Familia ID
      
      if (tutorName && tutorName.trim() !== '') {
        if (!tutorGroups.has(tutorName)) {
          tutorGroups.set(tutorName, []);
        }
        tutorGroups.get(tutorName).push({
          rowIndex: index + 2, // +2 porque: +1 para header, +1 porque getRange es 1-indexed
          currentFamilyId: familyId
        });
      }
    });
    
    let assigned = 0;
    
    // Asignar Familia ID a grupos sin ID
    tutorGroups.forEach((players, tutorName) => {
      // Si algún jugador NO tiene Familia ID, asignar uno nuevo a TODOS del mismo tutor
      const needsId = players.some(p => !p.currentFamilyId || p.currentFamilyId.trim() === '');
      
      if (needsId) {
        const newFamilyId = `FAM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        Logger.log(`Asignando ${newFamilyId} a ${players.length} jugadores del tutor: ${tutorName}`);
        
        players.forEach(player => {
          playersSheet.getRange(player.rowIndex, 13).setValue(newFamilyId); // Columna M
          assigned++;
        });
        
        Utilities.sleep(100); // Pequeña pausa
      }
    });
    
    SpreadsheetApp.flush();
    
    Logger.log(`✅ ${assigned} jugadores actualizados con Familia ID`);
    
    return {
      success: true,
      message: `${assigned} jugadores actualizados con Familia ID`,
      assigned: assigned,
      totalGroups: tutorGroups.size
    };
    
  } catch (error) {
    Logger.log('❌ Error asignando Familia IDs: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

