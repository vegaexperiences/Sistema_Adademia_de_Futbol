/**
 * ========================================
 * ARCHIVO: FormsHandler.gs
 * DESCRIPCIÓN: Manejo de formularios de Google Forms para admisión y torneos
 * FUNCIONES: Procesamiento de respuestas, validación de datos, creación de registros
 * ========================================
 */

/**
 * Configura los headers de la hoja de Aprobaciones
 */
function setupApprovalsSheetHeaders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      approvalsSheet = ss.insertSheet('Aprobaciones');
    }
    
    // Headers para manejar toda la información del formulario
    const headers = [
      'ID',
      'Nombre completo del jugador',
      'Apellidos del Jugador',
      'Edad',
      'Número de identificación',
      'Teléfono de contacto',
      'Categoría',
      'Marca temporal',
      'Estado',
      'Fuente',
      'Nombre del Torneo',
      'Archivos Adjuntos',
      'Nombre completo del padre/tutor',
      'Teléfono de contacto',
      'Dirección de correo electrónico',
      'Dirección completa',
      'Método de pago',
      'Fecha de pago',
      'Comprobante de pago',
      'Fecha de nacimiento',
      'Genero del jugador',
      'Talla de uniforme',
      'ID de Familia',
      'Es Primer Jugador',
      'Número de Respuesta',
      'Timestamp de Respuesta'
    ];
    
    // Limpiar hoja y agregar headers
    approvalsSheet.clear();
    approvalsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Formatear headers
    const headerRange = approvalsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    
    Logger.log('Headers de la hoja de Aprobaciones configurados');
    
  } catch (error) {
    Logger.log('Error configurando headers de aprobaciones: ' + error.toString());
  }
}

/**
 * Agrega un jugador a la hoja de aprobaciones
 */
function addToApprovalsSheet(playerData, formType) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      throw new Error('Hoja de Aprobaciones no encontrada');
    }
    
    // Generar ID único
    const playerId = generatePlayerId();
    
    // Determinar categoría si no está especificada
    let category = playerData.category;
    if (!category && playerData.age && playerData.gender) {
      const birthYear = new Date().getFullYear() - playerData.age;
      category = getPlayerCategory(birthYear, playerData.gender);
    }
    
    // Preparar datos para insertar
    const rowData = [
      playerId,                                    // ID
      playerData.name || '',                      // Nombre completo del jugador
      playerData.lastName || '',                  // Apellidos del Jugador
      playerData.age || '',                       // Edad
      playerData.id || '',                        // Número de identificación
      playerData.phone || '',                     // Teléfono de contacto
      category || '',                             // Categoría
      new Date(),                                 // Marca temporal
      'Pendiente',                                // Estado
      formType === 'admission' ? 'FORM_MATRICULA' : 'FORM_TORNEO', // Fuente
      playerData.tournamentName || '',            // Nombre del torneo
      JSON.stringify(playerData.files || []),     // Archivos adjuntos
      playerData.tutor?.name || '',               // Nombre completo del padre/tutor
      playerData.tutor?.phone || '',              // Teléfono de contacto
      playerData.tutor?.email || '',              // Dirección de correo electrónico
      playerData.tutor?.address || '',            // Dirección completa
      playerData.tutor?.paymentMethod || '',      // Método de pago
      playerData.tutor?.paymentDate || '',        // Fecha de pago
      playerData.tutor?.paymentProof || '',       // Comprobante de pago
      playerData.birthDate || '',                 // Fecha de nacimiento
      playerData.gender || '',                    // Genero del jugador
      playerData.uniformSize || '',               // Talla de uniforme
      playerData.familyId || '',                  // ID de familia
      playerData.isFirstInFamily || false,        // Es primer jugador de la familia
      playerData.responseNumber || '',            // Número de respuesta del formulario
      JSON.stringify(playerData.timestamp || new Date()) // Timestamp de la respuesta
    ];
    
    // Insertar en la hoja
    approvalsSheet.appendRow(rowData);
    
    Logger.log(`Jugador agregado a aprobaciones: ${playerData.name} ${playerData.lastName}`);
    
  } catch (error) {
    Logger.log('Error agregando jugador a aprobaciones: ' + error.toString());
  }
}

/**
 * Obtiene solo las aprobaciones pendientes
 */
function getPendingApprovalsData() {
  try {
    Logger.log('=== OBTENIENDO APROBACIONES PENDIENTES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      Logger.log('Hoja de Aprobaciones no encontrada');
      return [];
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    Logger.log(`Total de filas en Aprobaciones: ${data.length}`);
    
    if (data.length <= 1) {
      Logger.log('No hay datos en Aprobaciones (solo headers)');
      // Si no hay datos, intentar procesar FORM_MATRICULA y FORM_TORNEO
      Logger.log('Intentando procesar datos de FORM_MATRICULA...');
      const processMatriculaResult = processFormMatriculaDataImproved();
      Logger.log('Intentando procesar datos de FORM_TORNEO...');
      const processTorneoResult = processFormTorneoData();
      
      const totalProcessed = (processMatriculaResult.processed || 0) + (processTorneoResult.processed || 0);
      
      Logger.log(`Resultado procesamiento: Matrículas procesadas=${processMatriculaResult.processed}, Torneos procesados=${processTorneoResult.processed}, Total=${totalProcessed}`);
      
      if (totalProcessed > 0) {
        Logger.log(`Datos procesados exitosamente: ${processMatriculaResult.processed} matrículas + ${processTorneoResult.processed} torneos, reintentando obtener aprobaciones...`);
        // Esperar un poco más para asegurar que los datos estén escritos
        SpreadsheetApp.flush();
        Utilities.sleep(1500);
        
        // Reintentar obtener datos después del procesamiento
        const newData = approvalsSheet.getDataRange().getValues();
        Logger.log(`Datos después de procesar: ${newData.length} filas totales (incluyendo headers)`);
        
        if (newData.length > 1) {
          const newHeaders = newData[0];
          const newRows = newData.slice(1);
          
          // Buscar columna "Estado" de manera flexible
          let estadoIndexNew = -1;
          for (let i = 0; i < newHeaders.length; i++) {
            const header = String(newHeaders[i] || '').trim().toLowerCase();
            if (header === 'estado' || header === 'status' || header === 'estado aprobación') {
              estadoIndexNew = i;
              Logger.log(`✅ Columna Estado encontrada (después de procesar) en índice ${i}: "${newHeaders[i]}"`);
              break;
            }
          }
          
          const pendingRows = newRows.filter(row => {
            if (estadoIndexNew === -1) {
              // Si no hay columna Estado, incluir todas las filas
              return true;
            }
            const estado = row[estadoIndexNew];
            if (!estado) return false;
            const estadoStr = String(estado).trim().toLowerCase();
            return estadoStr.includes('pendiente');
          });
          
          const pendingData = pendingRows.map(row => {
            const obj = {};
            newHeaders.forEach((header, index) => {
              let value = row[index];
              if (value instanceof Date) {
                value = value.toISOString();
              } else if (value === null || value === undefined) {
                value = '';
              } else if (typeof value === 'object') {
                value = JSON.stringify(value);
              }
              obj[header] = value;
            });
            return obj;
          });
          
          Logger.log(`Devolviendo ${pendingData.length} aprobaciones pendientes después del procesamiento`);
          Logger.log(`Filas procesadas encontradas: ${newRows.length}, Filas pendientes: ${pendingRows.length}`);
          return pendingData;
        } else {
          Logger.log(`⚠️ Después de procesar, no hay datos en la hoja Aprobaciones (solo ${newData.length} filas)`);
        }
      } else {
        Logger.log(`⚠️ No se procesaron datos nuevos (totalProcessed=${totalProcessed})`);
        Logger.log(`Matrículas: processed=${processMatriculaResult.processed}, success=${processMatriculaResult.success}`);
        Logger.log(`Torneos: processed=${processTorneoResult.processed}, success=${processTorneoResult.success}`);
      }
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers encontrados:', headers);
    Logger.log(`Filas de datos: ${rows.length}`);
    
    // Buscar columna "Estado" de manera flexible
    let estadoIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').trim().toLowerCase();
      if (header === 'estado' || header === 'status' || header === 'estado aprobación') {
        estadoIndex = i;
        Logger.log(`✅ Columna Estado encontrada en índice ${i}: "${headers[i]}"`);
        break;
      }
    }
    
    if (estadoIndex === -1) {
      Logger.log('⚠️ Columna "Estado" no encontrada. Headers disponibles:', headers.map((h, i) => `${i}: "${h}"`).join(', '));
      // Si no hay columna Estado, devolver todas las filas como pendientes (comportamiento de respaldo)
      Logger.log('⚠️ Devolviendo todas las filas como pendientes (columna Estado no encontrada)');
    } else {
      // Diagnosticar estados únicos en la columna
      const estadosUnicos = new Set();
      rows.forEach(row => {
        const estado = row[estadoIndex];
        if (estado) {
          estadosUnicos.add(String(estado).trim());
        }
      });
      Logger.log(`📊 Estados únicos encontrados en la columna: ${Array.from(estadosUnicos).join(', ')}`);
    }
    
    const headerIndexMap = {};
    headers.forEach((header, idx) => {
      if (header !== null && header !== undefined && header !== '') {
        headerIndexMap[String(header).trim()] = idx;
      }
    });
    
    function processFile(fileData, type, name) {
      if (!fileData || fileData.toString().trim() === '') {
        return null;
      }
      
      const fileString = fileData.toString().trim();
      
      if (fileString.includes('drive.google.com')) {
        const match = fileString.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : fileString;
      }
      
      if (fileString.length > 10 && !fileString.includes(' ') && !fileString.includes('{')) {
        return fileString;
      }
      
      if (fileString.includes('{') || fileString.includes('[')) {
        try {
          const parsed = JSON.parse(fileString);
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstFile = parsed[0];
            if (typeof firstFile === 'string') {
              return firstFile;
            } else if (firstFile && typeof firstFile === 'object') {
              if (firstFile.id) {
                return firstFile.id;
              }
              if (firstFile.url) {
                const match = firstFile.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                return match ? match[1] : firstFile.url;
              }
            }
          } else if (parsed && typeof parsed === 'object') {
            if (parsed.id) {
              return parsed.id;
            }
            if (parsed.url) {
              const match = parsed.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
              return match ? match[1] : parsed.url;
            }
          }
        } catch (error) {
          Logger.log(`⚠️ Error parseando archivo ${type}:`, error);
        }
      }
      
      Logger.log(`⚠️ No se pudo extraer ID del archivo ${type}:`, fileString.substring(0, 100));
      return null;
    }
    
    // Filtrar solo las filas con estado "Pendiente"
    const pendingRows = rows.filter(row => {
      if (estadoIndex === -1) {
        // Si no hay columna Estado, incluir todas las filas
        return true;
      }
      const estado = row[estadoIndex];
      if (!estado) return false;
      const estadoStr = String(estado).trim().toLowerCase();
      return estadoStr.includes('pendiente');
    });
    
    Logger.log(`Total de filas: ${rows.length}, Pendientes: ${pendingRows.length}`);
    
    const pendingData = pendingRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (value instanceof Date) {
          value = value.toISOString();
        } else if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        obj[header] = value;
      });
      return obj;
    });
    
    Logger.log(`Devolviendo ${pendingData.length} aprobaciones pendientes`);
    return pendingData;
    
  } catch (error) {
    Logger.log('Error obteniendo aprobaciones pendientes: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene todas las aprobaciones de la hoja
 */
function getAllApprovalsData() {
  try {
    Logger.log('=== OBTENIENDO TODOS LOS DATOS DE APROBACIONES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      Logger.log('Hoja de Aprobaciones no encontrada');
      return [];
    }
    
    // Obtener todos los datos
    const data = approvalsSheet.getDataRange().getValues();
    Logger.log(`Total de filas en Aprobaciones: ${data.length}`);
    
    if (data.length <= 1) {
      Logger.log('No hay datos en Aprobaciones (solo headers)');
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers encontrados:', headers);
    Logger.log(`Filas de datos: ${rows.length}`);
    
    // Procesar todas las filas
    const allData = rows.map((row, index) => {
      const obj = {};
      headers.forEach((header, headerIndex) => {
        let value = row[headerIndex];
        
        // Limpiar valores problemáticos para serialización
        if (value instanceof Date) {
          value = value.toISOString();
        } else if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        obj[header] = value;
      });
      
      Logger.log(`Fila ${index + 1}: nombre="${obj['Nombre completo del jugador'] || ''}", apellidos="${obj['Apellidos del Jugador'] || ''}"`);
      return obj;
    });
    
    Logger.log(`Total de datos procesados: ${allData.length}`);
    return allData;
    
  } catch (error) {
    Logger.log('Error obteniendo datos de Aprobaciones: ' + error.toString());
    return [];
  }
}

/**
 * Procesa datos desde FORM_MATRICULA
 */
function processFormMatriculaData() {
  try {
    Logger.log('=== PROCESANDO DATOS DE FORM_MATRICULA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!formSheet) {
      Logger.log('Hoja FORM_MATRICULA no encontrada');
      return { 
        success: false, 
        message: 'Hoja FORM_MATRICULA no encontrada',
        processed: 0
      };
    }
    
    // Obtener todos los datos
    const data = formSheet.getDataRange().getValues();
    Logger.log(`Total de filas en FORM_MATRICULA: ${data.length}`);
    
    if (data.length <= 1) {
      Logger.log('No hay datos en FORM_MATRICULA (solo headers)');
      return { 
        success: true, 
        message: 'No hay datos en FORM_MATRICULA',
        processed: 0
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers encontrados:', headers);
    Logger.log(`Filas de datos a procesar: ${rows.length}`);
    
    // Asegurar que existe la hoja de Aprobaciones
    let approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      Logger.log('Creando hoja de Aprobaciones...');
      approvalsSheet = ss.insertSheet('Aprobaciones');
      setupApprovalsSheetHeaders();
    }
    
    // Limpiar hoja de Aprobaciones para empezar limpio
    Logger.log('Limpiando hoja de Aprobaciones...');
    approvalsSheet.clear();
    setupApprovalsSheetHeaders();
    
    // Forzar actualización
    SpreadsheetApp.flush();
    Utilities.sleep(500);
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Procesar cada fila
    rows.forEach((row, index) => {
      try {
        Logger.log(`Procesando fila ${index + 1}/${rows.length}...`);
        
        // Crear objeto de datos del jugador
        const playerData = {
          name: row[0] || '',
          lastName: row[1] || '',
          age: row[2] || '',
          id: row[3] || '',
          phone: row[4] || '',
          
          tutor: {
            name: row[5] || '',
            phone: row[6] || '',
            email: row[7] || '',
            address: row[8] || '',
            paymentMethod: row[12] || '',
            paymentDate: row[13] || '',
            paymentProof: row[14] || ''
          },
          
          birthDate: row[9] || '',
          gender: row[10] || '',
          uniformSize: row[11] || '',
          category: calculatePlayerCategory(row[2], row[10], row[9]),
          files: row[15] ? JSON.parse(row[15]) : [],
          
          familyId: `FAM_${Date.now()}_${index}`,
          isFirstInFamily: true,
          responseNumber: index + 1,
          timestamp: new Date()
        };
        
        // Agregar a la hoja de Aprobaciones
        addToApprovalsSheet(playerData, 'admission');
        processedCount++;
        
        Logger.log(`Fila ${index + 1} procesada exitosamente`);
        
      } catch (error) {
        errorCount++;
        Logger.log(`Error procesando fila ${index + 1}: ${error.toString()}`);
      }
    });
    
    // Forzar actualización final
    SpreadsheetApp.flush();
    Utilities.sleep(1000);
    
    // Verificar resultados
    const finalData = approvalsSheet.getDataRange().getValues();
    const finalRows = finalData.length - 1; // -1 para el header
    
    Logger.log(`Procesamiento completado:`);
    Logger.log(`- Filas procesadas: ${processedCount}`);
    Logger.log(`- Errores: ${errorCount}`);
    Logger.log(`- Filas finales en Aprobaciones: ${finalRows}`);
    
    return {
      success: true,
      message: `✅ Procesamiento completado: ${processedCount} jugadores procesados`,
      processed: processedCount,
      total: rows.length,
      errors: errorCount,
      finalRows: finalRows
    };
    
  } catch (error) {
    Logger.log('Error crítico procesando FORM_MATRICULA: ' + error.toString());
    return {
      success: false,
      message: 'Error crítico: ' + error.toString(),
      processed: 0,
      total: 0
    };
  }
}

/**
 * Aprobar un jugador
 */
function approvePlayer(playerId, approvalType = 'normal') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!approvalsSheet || !playersSheet) {
      throw new Error('Hojas necesarias no encontradas');
    }
    
    // Buscar el jugador en aprobaciones
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const playerRowIndex = rows.findIndex(row => row[0] === playerId);
    
    if (playerRowIndex === -1) {
      throw new Error('Jugador no encontrado en aprobaciones');
    }
    
    const playerData = rows[playerRowIndex];
    
    // Obtener timestamp y fuente
    const timestampIndex = headers.indexOf('Marca temporal');
    const fuenteIndex = headers.indexOf('Fuente');
    const timestamp = playerData[timestampIndex];
    const fuente = playerData[fuenteIndex] || 'FORM_MATRICULA';
    
    Logger.log('Fuente del jugador:', fuente);
    Logger.log('Timestamp:', timestamp);
    
    // Determinar tipo de jugador
    let playerType = 'normal';
    let discount = 0;
    
    if (approvalType === 'scholarship') {
      playerType = 'becado';
    }
    
    // Preparar datos para jugadores con ESTRUCTURA COMPLETA (23 columnas)
    const newPlayerData = [
      playerId,                   // A - ID
      playerData[1],              // B - Nombre
      playerData[2],              // C - Apellidos
      playerData[3],              // D - Edad
      playerData[4],              // E - Cédula
      playerData[5],              // F - Teléfono
      playerData[6],              // G - Categoría
      'Activo',                   // H - Estado
      new Date(),                 // I - Fecha Registro
      playerData[7] || '',        // J - Tutor
      playerData[8] || '',        // K - Email Tutor ← NUEVA COLUMNA
      playerData[9] || '',        // L - Dirección ← NUEVA COLUMNA
      '',                         // M - Familia ID (se asignará después)
      playerType,                 // N - Tipo
      discount,                   // O - Descuento %
      '',                         // P - Observaciones
      playerData[10] || '',       // Q - Fecha Nacimiento
      playerData[11] || '',       // R - Género
      playerData[12] || '',       // S - Método Pago Preferido
      playerData[13] || '',       // T - Cédula Tutor
      '',                         // U - Mensualidad Personalizada
      playerData[14] || '',       // V - URL Cédula Jugador
      playerData[15] || ''        // W - URL Cédula Tutor
    ];
    
    // Agregar a hoja de jugadores
    playersSheet.appendRow(newPlayerData);
    
    // Actualizar estado en aprobaciones (playerRowIndex + 2 porque rows no incluye header)
    approvalsSheet.getRange(playerRowIndex + 2, 9).setValue('Aprobado');
    approvalsSheet.getRange(playerRowIndex + 2, 10).setValue(approvalType);
    
    // Registrar matrícula automáticamente (solo si NO es becado)
    Utilities.sleep(500);
    const enrollmentResult = registerEnrollmentFee(playerId, approvalType === 'scholarship');
    if (enrollmentResult && enrollmentResult.success) {
      Logger.log(`✅ Matrícula registrada: $${enrollmentResult.amount || 0}`);
    } else {
      Logger.log(`⚠️ No se pudo registrar matrícula: ${enrollmentResult ? enrollmentResult.message : 'Resultado null'}`);
    }
    
    // Eliminar del formulario de origen (FORM_TORNEO o FORM_MATRICULA)
    if (timestamp) {
      Utilities.sleep(500); // Delay para evitar HTTP 429
      
      if (fuente === 'FORM_TORNEO') {
        try {
          Logger.log('🗑️ Eliminando jugador de torneo de FORM_TORNEO...');
          const deleteResult = deleteFromFormTorneo(timestamp);
          if (deleteResult.success) {
            Logger.log('✅ Jugador eliminado de FORM_TORNEO exitosamente');
          } else {
            Logger.log('⚠️ No se pudo eliminar de FORM_TORNEO: ' + deleteResult.message);
          }
        } catch (deleteError) {
          Logger.log('❌ Error eliminando de FORM_TORNEO: ' + deleteError.toString());
        }
      } else if (fuente === 'FORM_MATRICULA') {
        try {
          Logger.log('🗑️ Eliminando jugador de matriculación de FORM_MATRICULA...');
          const deleteResult = deleteFromFormMatricula(timestamp);
          if (deleteResult.success) {
            Logger.log('✅ Jugador eliminado de FORM_MATRICULA exitosamente');
          } else {
            Logger.log('⚠️ No se pudo eliminar de FORM_MATRICULA: ' + deleteResult.message);
          }
        } catch (deleteError) {
          Logger.log('❌ Error eliminando de FORM_MATRICULA: ' + deleteError.toString());
        }
      }
    }
    
    Logger.log(`Jugador ${playerId} aprobado como ${approvalType}`);
    return true;
    
  } catch (error) {
    Logger.log('Error aprobando jugador: ' + error.toString());
    return false;
  }
}

/**
 * Rechazar un jugador
 */
function rejectPlayer(playerId, reason = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      throw new Error('Hoja de Aprobaciones no encontrada');
    }
    
    // Buscar el jugador en aprobaciones
    const data = approvalsSheet.getDataRange().getValues();
    const playerRowIndex = data.findIndex(row => row[0] === playerId);
    
    if (playerRowIndex === -1) {
      throw new Error('Jugador no encontrado en aprobaciones');
    }
    
    // Actualizar estado en aprobaciones
    approvalsSheet.getRange(playerRowIndex + 1, 9).setValue('Rechazado');
    approvalsSheet.getRange(playerRowIndex + 1, 11).setValue(reason);
    
    // Si es un jugador de torneo, eliminar de FORM_TORNEO
    if (playerId.includes('TORNEO')) {
      try {
        Logger.log('🗑️ Eliminando jugador de torneo rechazado de FORM_TORNEO...');
        
        // Parsear el timestamp JSON de la columna R (índice 17)
        let originalTimestamp;
        try {
          const timestampJson = playerData[17]; // Columna R contiene el timestamp JSON
          originalTimestamp = JSON.parse(timestampJson);
          Logger.log('📅 Timestamp original parseado:', originalTimestamp);
        } catch (parseError) {
          Logger.log('⚠️ Error parseando timestamp JSON, usando timestamp de columna H');
          originalTimestamp = playerData[7]; // Columna H contiene el timestamp del sistema
        }
        
        const deleteResult = deleteFromFormTorneo(originalTimestamp);
        if (deleteResult.success) {
          Logger.log('✅ Jugador rechazado eliminado de FORM_TORNEO exitosamente');
        } else {
          Logger.log('⚠️ No se pudo eliminar de FORM_TORNEO: ' + deleteResult.message);
        }
      } catch (deleteError) {
        Logger.log('❌ Error eliminando de FORM_TORNEO: ' + deleteError.toString());
      }
    }
    
    Logger.log(`Jugador ${playerId} rechazado: ${reason}`);
    return true;
    
  } catch (error) {
    Logger.log('Error rechazando jugador: ' + error.toString());
    return false;
  }
}

/**
 * Genera un ID único para jugador
 */
function generatePlayerId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `PLR_${timestamp}_${random}`;
}

/**
 * Genera un ID único para familia
 */
function generateFamilyId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `FAM_${timestamp}_${random}`;
}

function parseBirthDate(value) {
  if (!value && value !== 0) {
    return null;
  }
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  if (typeof value === 'number') {
    const maybeDate = new Date(Math.round(value));
    return isNaN(maybeDate.getTime()) ? null : maybeDate;
  }
  
  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }
  
  const direct = new Date(stringValue);
  if (!isNaN(direct.getTime())) {
    return direct;
  }
  
  const parts = stringValue.split(/[\/\-]/).map(part => part.trim());
  if (parts.length === 3) {
    let day, month, year;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const parsed = new Date(year, month - 1, day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  
  return null;
}

function getBirthYearFromInput(birthDate, age) {
  const parsed = parseBirthDate(birthDate);
  if (parsed) {
    return parsed.getFullYear();
  }
  
  const ageNum = parseInt(age, 10);
  if (!isNaN(ageNum)) {
    const today = new Date();
    return today.getFullYear() - ageNum;
  }
  
  return null;
}

function normalizeGenderCode(gender) {
  // Manejar valores null, undefined o vacíos
  if (!gender) {
    Logger.log('⚠️ normalizeGenderCode: valor de género vacío o null, usando default "M"');
    return 'M';
  }
  
  const value = String(gender).trim().toLowerCase();
  
  // Valores femeninos explícitos
  const femaleValues = ['femenino', 'femenina', 'f', 'female', 'mujer', 'girl', 'woman'];
  if (femaleValues.includes(value)) {
    return 'F';
  }
  
  // Valores masculinos explícitos
  const maleValues = ['masculino', 'masculina', 'm', 'male', 'hombre', 'boy', 'man'];
  if (maleValues.includes(value)) {
    return 'M';
  }
  
  // Fallback: buscar 'f' o 'm' en el string (comportamiento anterior mejorado)
  if (value.includes('f') && !value.includes('masculino') && !value.includes('male') && !value.includes('hombre')) {
    Logger.log('⚠️ normalizeGenderCode: valor ambiguo "' + gender + '" clasificado como F por contener "f"');
    return 'F';
  }
  
  // Por defecto, clasificar como masculino si no es reconocido
  Logger.log('⚠️ normalizeGenderCode: valor no reconocido "' + gender + '", usando default "M"');
  return 'M';
}

/**
 * Calcula la categoría del jugador basada en edad y género
 */
function calculatePlayerCategory(age, gender, birthDate) {
  try {
    const genderCode = normalizeGenderCode(gender);
    const birthYear = getBirthYearFromInput(birthDate, age);
    const ageNum = parseInt(age, 10);
    
    if (birthYear) {
      if (genderCode === 'M') {
        if (birthYear >= 2020 && birthYear <= 2021) return 'U-6 M';
        if (birthYear >= 2018 && birthYear <= 2019) return 'U-8 M';
        if (birthYear >= 2016 && birthYear <= 2017) return 'U-10 M';
        if (birthYear >= 2014 && birthYear <= 2015) return 'U-12 M';
        if (birthYear >= 2012 && birthYear <= 2013) return 'U-14 M';
        if (birthYear >= 2010 && birthYear <= 2011) return 'U-16 M';
      } else {
        if (birthYear >= 2016 && birthYear <= 2017) return 'U-10 F';
        if (birthYear >= 2014 && birthYear <= 2015) return 'U-12 F';
        if (birthYear >= 2012 && birthYear <= 2013) return 'U-14 F';
        if (birthYear >= 2010 && birthYear <= 2011) return 'U-16 F';
        if (birthYear <= 2009) return 'U-18 F';
      }
    }
    
    if (!isNaN(ageNum)) {
      return `U-${ageNum} ${genderCode}`;
    }
    
    return 'Sin categoría';
  } catch (error) {
    Logger.log('⚠️ Error calculando categoría:', error);
    const ageNum = parseInt(age, 10);
    if (!isNaN(ageNum)) {
      return `U-${ageNum} ${normalizeGenderCode(gender)}`;
    }
    return 'Sin categoría';
  }
}

/**
 * Obtiene la categoría del jugador (función auxiliar)
 */
function getPlayerCategory(birthYear, gender) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  const birthDate = !isNaN(parseInt(birthYear, 10)) ? new Date(parseInt(birthYear, 10), 0, 1) : null;
  return calculatePlayerCategory(age, gender, birthDate);
}

function computeAgeFromBirthDate(value) {
  const parsed = parseBirthDate(value);
  if (!parsed) {
    return '';
  }
  
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

function computeCategoryFromAgeGender(ageValue, genderValue, birthDateValue) {
  if (ageValue === '' || ageValue === null || ageValue === undefined) {
    if (!birthDateValue) {
      return '';
    }
  }
  if (!genderValue) {
    return '';
  }
  try {
    return calculatePlayerCategory(ageValue, genderValue, birthDateValue);
  } catch (error) {
    Logger.log('⚠️ Error calculando categoría:', error);
    return '';
  }
}

/**
 * Función simple para crear datos de prueba
 */
function createTestData() {
  try {
    Logger.log('=== CREANDO DATOS DE PRUEBA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      Logger.log('Creando hoja de Aprobaciones...');
      approvalsSheet = ss.insertSheet('Aprobaciones');
      setupApprovalsSheetHeaders();
    }
    
    // Limpiar hoja y recrear headers
    Logger.log('Limpiando hoja y recreando headers...');
    approvalsSheet.clear();
    setupApprovalsSheetHeaders();
    
    // Datos de prueba simples
    const testData = [
      {
        name: 'Javier',
        lastName: 'David',
        age: 5,
        id: '89789023758',
        phone: '67667676',
        tutor: {
          name: 'javier vallejo',
          phone: '67667676',
          email: 'javidavo05@gmail.com',
          address: 'coco del mar',
          paymentMethod: 'Visa',
          paymentDate: '5/02/2015',
          paymentProof: ''
        },
        birthDate: '5/03/2020',
        gender: 'M',
        uniformSize: 'XS',
        category: 'U-6 M',
        files: [],
        familyId: 'FAM_TEST_001',
        isFirstInFamily: true,
        responseNumber: 1,
        timestamp: new Date()
      },
      {
        name: 'Bleixen',
        lastName: 'Vega',
        age: 13,
        id: '736747487',
        phone: '69462600',
        tutor: {
          name: 'Bleixen Vega',
          phone: '69462600',
          email: 'bleixen1992@gmail.com',
          address: 'Panama',
          paymentMethod: 'Visa',
          paymentDate: '29/09/2025',
          paymentProof: ''
        },
        birthDate: '29/12/2011',
        gender: 'M',
        uniformSize: 'M',
        category: 'U-14 M',
        files: [],
        familyId: 'FAM_TEST_002',
        isFirstInFamily: true,
        responseNumber: 2,
        timestamp: new Date()
      },
      {
        name: 'María',
        lastName: 'González',
        age: 8,
        id: '123456789',
        phone: '55555555',
        tutor: {
          name: 'Ana González',
          phone: '55555555',
          email: 'ana.gonzalez@email.com',
          address: 'Ciudad de Panamá',
          paymentMethod: 'Efectivo',
          paymentDate: '6/10/2025',
          paymentProof: ''
        },
        birthDate: '15/08/2017',
        gender: 'F',
        uniformSize: 'S',
        category: 'U-10 F',
        files: [],
        familyId: 'FAM_TEST_003',
        isFirstInFamily: true,
        responseNumber: 3,
        timestamp: new Date()
      }
    ];
    
    // Agregar datos de prueba
    testData.forEach(playerData => {
      addToApprovalsSheet(playerData, 'admission');
    });
    
    Logger.log('=== DATOS DE PRUEBA CREADOS EXITOSAMENTE ===');
    
    return { 
      success: true, 
      message: `✅ Creados ${testData.length} jugadores de prueba exitosamente. Ve a Aprobaciones para verlos.`,
      created: testData.length
    };
    
  } catch (error) {
    Logger.log('❌ ERROR creando datos de prueba: ' + error.toString());
    return { 
      success: false, 
      message: '❌ Error: ' + error.toString()
    };
  }
}

/**
 * Función para diagnosticar FORM_MATRICULA
 */
function diagnoseFormMatricula() {
  try {
    Logger.log('=== DIAGNOSTICANDO FORM_MATRICULA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!formSheet) {
      Logger.log('Hoja FORM_MATRICULA no encontrada');
      return { 
        success: false, 
        message: 'Hoja FORM_MATRICULA no encontrada'
      };
    }
    
    Logger.log('Hoja FORM_MATRICULA encontrada');
    
    let data = [];
    let totalRows = 0;
    let dataRows = 0;
    let headers = [];
    let sampleData = [];
    
    try {
      data = formSheet.getDataRange().getValues();
      totalRows = data.length;
      Logger.log(`Total de filas en FORM_MATRICULA: ${totalRows}`);
      
      if (totalRows <= 1) {
        Logger.log('No hay datos en FORM_MATRICULA (solo headers)');
        headers = totalRows > 0 ? data[0] : [];
        return { 
          success: true, 
          message: 'No hay datos en FORM_MATRICULA',
          totalRows: totalRows,
          dataRows: 0,
          headers: headers
        };
      }
      
      headers = data[0];
      const rows = data.slice(1);
      dataRows = rows.length;
      
      Logger.log('Headers encontrados:', headers);
      Logger.log(`Filas de datos: ${dataRows}`);
      
      // Analizar las primeras 3 filas
      sampleData = rows.slice(0, 3).map((row, index) => {
        const obj = {};
        headers.forEach((header, headerIndex) => {
          obj[header] = row[headerIndex] || '';
        });
        return {
          rowNumber: index + 2,
          data: obj
        };
      });
      
      Logger.log('Datos de muestra procesados:', sampleData.length);
      
    } catch (dataError) {
      Logger.log('Error obteniendo datos de FORM_MATRICULA: ' + dataError.toString());
      return {
        success: false,
        message: 'Error obteniendo datos: ' + dataError.toString()
      };
    }
    
    const result = {
      success: true,
      message: `✅ Diagnóstico completado: ${dataRows} filas de datos encontradas`,
      totalRows: totalRows,
      dataRows: dataRows,
      headers: headers,
      sampleData: sampleData
    };
    
    Logger.log('Resultado final FORM_MATRICULA:', result);
    return result;
    
  } catch (error) {
    Logger.log('Error crítico diagnosticando FORM_MATRICULA: ' + error.toString());
    return {
      success: false,
      message: 'Error crítico: ' + error.toString()
    };
  }
}

/**
 * Función para diagnosticar todas las hojas del spreadsheet
 */
function diagnoseAllSheets() {
  try {
    Logger.log('=== DIAGNOSTICANDO TODAS LAS HOJAS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    Logger.log(`Total de hojas encontradas: ${sheets.length}`);
    
    const sheetInfo = [];
    
    for (let i = 0; i < sheets.length; i++) {
      try {
        const sheet = sheets[i];
        const sheetName = sheet.getName();
        
        Logger.log(`Procesando hoja: ${sheetName}`);
        
        let totalRows = 0;
        let lastRow = 0;
        let lastCol = 0;
        let headers = [];
        let hasData = false;
        
        try {
          const data = sheet.getDataRange().getValues();
          totalRows = data.length;
          lastRow = sheet.getLastRow();
          lastCol = sheet.getLastColumn();
          headers = data.length > 0 ? data[0] : [];
          hasData = data.length > 1;
          
          Logger.log(`Hoja ${sheetName}: ${totalRows} filas, ${lastCol} columnas`);
        } catch (dataError) {
          Logger.log(`Error obteniendo datos de ${sheetName}: ${dataError.toString()}`);
          totalRows = 0;
          lastRow = 0;
          lastCol = 0;
          headers = [];
          hasData = false;
        }
        
        sheetInfo.push({
          name: sheetName,
          totalRows: totalRows,
          lastRow: lastRow,
          lastCol: lastCol,
          hasData: hasData,
          headers: headers
        });
        
      } catch (sheetError) {
        Logger.log(`Error procesando hoja ${i}: ${sheetError.toString()}`);
        sheetInfo.push({
          name: `Hoja ${i + 1} (Error)`,
          totalRows: 0,
          lastRow: 0,
          lastCol: 0,
          hasData: false,
          headers: [],
          error: sheetError.toString()
        });
      }
    }
    
    Logger.log('Información de hojas procesada:', sheetInfo);
    
    const result = {
      success: true,
      message: `✅ Diagnóstico completado: ${sheets.length} hojas encontradas`,
      totalSheets: sheets.length,
      sheets: sheetInfo
    };
    
    Logger.log('Resultado final:', result);
    return result;
    
  } catch (error) {
    Logger.log('Error crítico diagnosticando hojas: ' + error.toString());
    return {
      success: false,
      message: 'Error crítico: ' + error.toString()
    };
  }
}

/**
 * Función de diagnóstico simple y básica
 */
function simpleDiagnostic() {
  try {
    Logger.log('=== DIAGNÓSTICO SIMPLE ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    const result = {
      success: true,
      message: 'Diagnóstico simple completado',
      totalSheets: sheets.length,
      sheetNames: sheets.map(sheet => sheet.getName())
    };
    
    Logger.log('Resultado simple:', result);
    return result;
    
  } catch (error) {
    Logger.log('Error en diagnóstico simple: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Función para verificar solo FORM_MATRICULA de forma simple
 */
function simpleCheckFormMatricula() {
  try {
    Logger.log('=== VERIFICACIÓN SIMPLE FORM_MATRICULA ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!formSheet) {
      return {
        success: false,
        message: 'Hoja FORM_MATRICULA no encontrada'
      };
    }
    
    const lastRow = formSheet.getLastRow();
    const lastCol = formSheet.getLastColumn();
    
    const result = {
      success: true,
      message: 'FORM_MATRICULA encontrada',
      lastRow: lastRow,
      lastCol: lastCol,
      hasData: lastRow > 1
    };
    
    Logger.log('Resultado FORM_MATRICULA:', result);
    return result;
    
  } catch (error) {
    Logger.log('Error verificando FORM_MATRICULA: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Función simple para verificar datos
 */
function checkData() {
  try {
    Logger.log('=== VERIFICANDO DATOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      Logger.log('Hoja de Aprobaciones no existe');
      return { success: false, message: 'Hoja de Aprobaciones no existe' };
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    Logger.log(`Total de filas en la hoja: ${data.length}`);
    
    if (data.length > 1) {
      const headers = data[0];
      const rows = data.slice(1);
      
      Logger.log('Headers:', headers);
      Logger.log(`Filas de datos: ${rows.length}`);
      
      return {
        success: true,
        totalRows: data.length,
        dataRows: rows.length,
        headers: headers,
        message: `✅ Datos encontrados: ${rows.length} registros`
      };
    } else {
      Logger.log('Solo hay headers, no hay datos');
      return {
        success: true,
        totalRows: data.length,
        dataRows: 0,
        headers: data.length > 0 ? data[0] : [],
        message: 'Solo hay headers, no hay datos'
      };
    }
    
  } catch (error) {
    Logger.log('Error verificando datos: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Procesa datos desde la hoja FORM_MATRICULA con mapeo mejorado
 */
function processFormMatriculaDataImproved() {
  try {
    Logger.log('=== PROCESANDO DATOS DE FORM_MATRICULA (MEJORADO) ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!formSheet) {
      Logger.log('Hoja FORM_MATRICULA no encontrada');
      return { success: false, message: 'Hoja FORM_MATRICULA no encontrada', processed: 0, total: 0 };
    }
    
    const data = formSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No hay datos en FORM_MATRICULA (solo headers)');
      return { success: true, message: 'No hay datos en FORM_MATRICULA', processed: 0, total: 0 };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers encontrados:', headers);
    Logger.log(`Filas de datos: ${rows.length}`);
    
    // Crear mapa de headers para búsqueda rápida
    const headerIndexMap = {};
    headers.forEach((header, idx) => {
      if (header !== null && header !== undefined && header !== '') {
        headerIndexMap[String(header).trim()] = idx;
      }
    });
    
    Logger.log('HeaderIndexMap creado con', Object.keys(headerIndexMap).length, 'entradas');
    Logger.log('Ejemplo de headers en mapa:', Object.keys(headerIndexMap).slice(0, 10).join(', '));
    
    // Función auxiliar para procesar archivos
    function processFile(fileData, type, name) {
      if (!fileData || fileData.toString().trim() === '') {
        return null;
      }
      
      const fileString = fileData.toString().trim();
      
      if (fileString.includes('drive.google.com')) {
        const match = fileString.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : fileString;
      }
      
      if (fileString.length > 10 && !fileString.includes(' ') && !fileString.includes('{')) {
        return fileString;
      }
      
      if (fileString.includes('{') || fileString.includes('[')) {
        try {
          const parsed = JSON.parse(fileString);
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstFile = parsed[0];
            if (typeof firstFile === 'string') {
              return firstFile;
            } else if (firstFile && typeof firstFile === 'object') {
              if (firstFile.id) {
                return firstFile.id;
              }
              if (firstFile.url) {
                const match = firstFile.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                return match ? match[1] : firstFile.url;
              }
            }
          } else if (parsed && typeof parsed === 'object') {
            if (parsed.id) {
              return parsed.id;
            }
            if (parsed.url) {
              const match = parsed.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
              return match ? match[1] : parsed.url;
            }
          }
        } catch (error) {
          Logger.log(`⚠️ Error parseando archivo ${type}:`, error);
        }
      }
      
      Logger.log(`⚠️ No se pudo extraer ID del archivo ${type}:`, fileString.substring(0, 100));
      return null;
    }
    
    // Crear o limpiar hoja de Aprobaciones
    let approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      approvalsSheet = ss.insertSheet('Aprobaciones');
    }
    
    // Configurar headers de Aprobaciones
    const approvalsHeaders = [
      'ID',
      'Nombre completo del jugador',
      'Apellidos del Jugador',
      'Edad',
      'Número de identificación',
      'Teléfono de contacto',
      'Categoría',
      'Marca temporal',
      'Estado',
      'Fuente',
      'Nombre del Torneo',
      'Archivos Adjuntos',
      'Nombre completo del padre/tutor',
      'Teléfono del Tutor',
      'Dirección de correo electrónico',
      'Dirección completa',
      'Método de pago',
      'Fecha de pago',
      'Comprobante de pago',
      'Fecha de nacimiento',
      'Genero del jugador',
      'Talla de uniforme',
      'ID de Familia',
      'Es Primer Jugador',
      'Número de Respuesta',
      'Timestamp de Respuesta'
    ];
    
    approvalsSheet.clear();
    approvalsSheet.getRange(1, 1, 1, approvalsHeaders.length).setValues([approvalsHeaders]);
    
    let processedCount = 0;
    let errorCount = 0;
    
    rows.forEach((row, index) => {
      try {
        Logger.log(`Procesando fila ${index + 1}:`, row);
        
        const getValue = (name, fallbackIndex) => {
          const idx = headerIndexMap[name];
          if (idx !== undefined && idx !== -1) {
            return row[idx];
          }
          if (typeof fallbackIndex === 'number' && row[fallbackIndex] !== undefined) {
            return row[fallbackIndex];
          }
          return '';
        };
        
        const timestamp = getValue('Marca temporal', 0) || new Date();
        const tutorEmail = getValue('Dirección de correo electrónico', 1) || '';
        const tutorName = getValue('Nombre completo del padre/tutor', 2) || '';
        const tutorPhone = getValue('Teléfono de contacto', 3) || '';
        const tutorAddress = getValue('Dirección completa', 4) || '';
        const paymentMethod = getValue('Método de pago', 5) || '';
        const paymentDate = getValue('Fecha de pago', 6) || '';
        const paymentProof = getValue('Comprobante de pago', 7) || '';
        const playerName = getValue('Nombre completo del jugador', 8) || '';
        const birthDate = getValue('Fecha de nacimiento', 9) || '';
        const gender = getValue('Genero del jugador', 10) || '';
        const playerId = getValue('Número de identificación', 11) || '';
        const frontId = getValue('Copia identificación Frente J1', 12) || '';
        const backId = getValue('Copia identificación Reverso J1', 13) || '';
        const uniformSize = getValue('Talla de uniforme', 14) || '';
        const fileT = getValue('Documento T', 19) || row[19] || '';
        const fileU = getValue('Documento U', 20) || row[20] || '';
        const fileAA = getValue('Adjunto AA', 26) || row[26] || '';
        const fileAB = getValue('Adjunto AB', 27) || row[27] || '';
        
        if (!playerName || !String(playerName).trim()) {
          Logger.log(`⚠️ Fila ${index + 1} sin nombre principal, se omite`);
          return;
        }
        
        const ageNumber = computeAgeFromBirthDate(birthDate);
        const category = computeCategoryFromAgeGender(ageNumber, gender, birthDate) || '';
        const familyId = generateFamilyId();
        
        const appendFamilyPlayer = ({ name, age, identification, categoryValue, filesList, birthDateValue, genderValue, uniformValue, isFirst }) => {
          if (!name || !String(name).trim()) {
            Logger.log('⚠️ Jugador adicional sin nombre, se omite');
            return false;
          }
          
          const sanitizedAge = (age !== undefined && age !== null && age !== '' && age !== 'N/A') ? age : '';
          let resolvedCategory = categoryValue;
          if ((!resolvedCategory || !String(resolvedCategory).trim()) && (sanitizedAge !== '' || birthDateValue)) {
            resolvedCategory = computeCategoryFromAgeGender(sanitizedAge, genderValue, birthDateValue);
          }
          
          const attachments = Array.isArray(filesList) ? filesList.filter(Boolean) : [];
          
          const approvalRow = [
            generatePlayerId(),
            name,
            '',
            sanitizedAge,
            identification || '',
            tutorPhone || '',
            resolvedCategory || '',
            timestamp,
            'Pendiente',
            'FORM_MATRICULA',
            '',
            JSON.stringify(attachments),
            tutorName || '',
            tutorPhone || '',
            tutorEmail || '',
            tutorAddress || '',
            paymentMethod || '',
            paymentDate || '',
            paymentProof || '',
            birthDateValue || '',
            genderValue || '',
            uniformValue || '',
            familyId,
            isFirst,
            index + 1,
            JSON.stringify(timestamp)
          ];
          
          approvalsSheet.appendRow(approvalRow);
          processedCount++;
          Logger.log(`Jugador ${isFirst ? 'principal' : 'adicional'} agregado: ${name}`);
          return true;
        };
        
        const primaryFiles = [];
        const frontFile = processFile(frontId, 'front_id', 'Cédula Frente');
        if (frontFile) primaryFiles.push(frontFile);
        const backFile = processFile(backId, 'back_id', 'Cédula Reverso');
        if (backFile) primaryFiles.push(backFile);
        const comprobanteFile = processFile(paymentProof, 'payment_proof', 'Comprobante de Pago');
        if (comprobanteFile) primaryFiles.push(comprobanteFile);
        const tFileProcessed = processFile(fileT, 'document_t', 'Doc Tutor');
        if (tFileProcessed) primaryFiles.push(tFileProcessed);
        const uFileProcessed = processFile(fileU, 'document_u', 'Documento U');
        if (uFileProcessed) primaryFiles.push(uFileProcessed);
        const aaFileProcessed = processFile(fileAA, 'document_aa', 'Adjunto AA');
        if (aaFileProcessed) primaryFiles.push(aaFileProcessed);
        const abFileProcessed = processFile(fileAB, 'document_ab', 'Adjunto AB');
        if (abFileProcessed) primaryFiles.push(abFileProcessed);
        
        appendFamilyPlayer({
          name: playerName,
          age: ageNumber,
          identification: playerId,
          categoryValue: category,
          filesList: primaryFiles,
          birthDateValue: birthDate,
          genderValue: gender,
          uniformValue: uniformSize,
          isFirst: true
        });
        
        const appendAdditionalPlayer = (playerNumber) => {
          const nameKey = `Nombre completo del jugador ${playerNumber}`;
          const nameValue = getValue(nameKey);
          if (!nameValue || !String(nameValue).trim()) {
            return false;
          }
          
          const birthKey = `Fecha de nacimiento jugador ${playerNumber}`;
          const idKey = playerNumber === 2 ? 'Número identificación jugador 2' : 'Número identificación jugador 3';
          const uniformKey = `Talla de uniforme jugador ${playerNumber}`;
          const frontKey = playerNumber === 2 ? 'Copia identificación Frente J2' : 'Copia identificación Frente J3';
          const backKey = playerNumber === 2 ? 'Copia identificación Reverso J2' : 'Copia identificación Reverso J3';
          const genderKey = playerNumber === 2 ? 'Genero del jugador 2' : 'Genero del jugador 3';
          
          const birthValue = getValue(birthKey);
          const genderValue = getValue(genderKey) || '';
          const additionalAge = computeAgeFromBirthDate(birthValue);
          const additionalCategory = computeCategoryFromAgeGender(additionalAge, genderValue, birthValue);
          
          const additionalFiles = [];
          const frontAdditional = processFile(getValue(frontKey), `front_j${playerNumber}`, `Cédula Frente Jugador ${playerNumber}`);
          if (frontAdditional) additionalFiles.push(frontAdditional);
          const backAdditional = processFile(getValue(backKey), `back_j${playerNumber}`, `Cédula Reverso Jugador ${playerNumber}`);
          if (backAdditional) additionalFiles.push(backAdditional);
          const sharedPayment = processFile(paymentProof, 'payment_proof', 'Comprobante de Pago');
          if (sharedPayment) additionalFiles.push(sharedPayment);
          
          appendFamilyPlayer({
            name: nameValue,
            age: additionalAge,
            identification: getValue(idKey),
            categoryValue: additionalCategory,
            filesList: additionalFiles,
            birthDateValue: birthValue,
            genderValue: genderValue,
            uniformValue: getValue(uniformKey),
            isFirst: false
          });
          
          return true;
        };
        
        appendAdditionalPlayer(2);
        appendAdditionalPlayer(3);
        
      } catch (error) {
        Logger.log(`❌ Error procesando fila ${index + 1}: ${error.toString()}`);
        Logger.log(`Stack trace: ${error.stack || 'No disponible'}`);
        errorCount++;
      }
    });
    
    SpreadsheetApp.flush();
    Utilities.sleep(1000);
    
    const finalData = approvalsSheet.getDataRange().getValues();
    const finalRows = finalData.length - 1;
    
    Logger.log(`📊 RESUMEN DE PROCESAMIENTO:`);
    Logger.log(`   - Filas procesadas: ${processedCount}`);
    Logger.log(`   - Errores: ${errorCount}`);
    Logger.log(`   - Filas totales en Aprobaciones (incluyendo headers): ${finalData.length}`);
    Logger.log(`   - Filas de datos en Aprobaciones: ${finalRows}`);
    
    return {
      success: true,
      message: `✅ Procesamiento mejorado completado: ${processedCount} jugadores procesados`,
      processed: processedCount,
      total: rows.length,
      errors: errorCount,
      finalRows: finalRows
    };
    
  } catch (error) {
    Logger.log('Error crítico procesando FORM_MATRICULA: ' + error.toString());
    return { success: false, message: 'Error crítico: ' + error.toString(), processed: 0, total: 0 };
  }
}

/**
 * Actualiza la categoría de todos los jugadores aprobados
 */
function updateAllPlayerCategories() {
  try {
    Logger.log('=== INICIANDO ACTUALIZACIÓN DE CATEGORÍAS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return {
        success: false,
        message: 'Hoja de Jugadores no encontrada'
      };
    }
    
    const data = playersSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        message: 'No hay jugadores para actualizar',
        updated: 0,
        total: 0
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Crear mapa normalizado para búsquedas flexibles (ignora mayúsculas, acentos y espacios)
    const normalizeHeader = header => {
      return String(header || '')
        .normalize('NFD')
        .replace(/[^\p{Letter}\p{Number}]+/gu, '')
        .toLowerCase();
    };
    
    const columnMap = {};
    headers.forEach((header, idx) => {
      if (header && header.trim() !== '') {
        columnMap[header] = idx;
      }
    });
    
    const normalizedColumnMap = {};
    Object.keys(columnMap).forEach(header => {
      const normalized = normalizeHeader(header);
      if (normalized && normalizedColumnMap[normalized] === undefined) {
        normalizedColumnMap[normalized] = columnMap[header];
      }
    });
    
    const getColumnIndex = (...aliases) => {
      for (let i = 0; i < aliases.length; i += 1) {
        const alias = aliases[i];
        if (!alias) continue;
        const idx = normalizedColumnMap[normalizeHeader(alias)];
        if (idx !== undefined) {
          return idx;
        }
      }
      return undefined;
    };
    
    const categoryIdx = getColumnIndex('Categoría', 'Categoria', 'Categoria');
    const genderIdx = getColumnIndex('Género', 'Genero', 'Sexo');
    const ageIdx = getColumnIndex('Edad');
    const birthIdx = getColumnIndex('Fecha Nacimiento', 'Fecha de Nacimiento', 'FechaNacimiento', 'Birth Date');
    const idIdx = getColumnIndex('ID');
    const nameIdx = getColumnIndex('Nombre');
    const lastNameIdx = getColumnIndex('Apellidos', 'Apellido');
    
    Logger.log('Índices de columnas encontrados:');
    Logger.log('  - Categoría: ' + categoryIdx);
    Logger.log('  - Género: ' + genderIdx);
    Logger.log('  - Edad: ' + ageIdx);
    Logger.log('  - Fecha Nacimiento: ' + birthIdx);
    Logger.log('  - ID: ' + idIdx);
    Logger.log('  - Nombre: ' + nameIdx);
    
    if (categoryIdx === undefined || genderIdx === undefined) {
      return {
        success: false,
        message: 'No se encontraron las columnas Categoría o Género en la hoja de Jugadores'
      };
    }
    
    // Verificar que la columna de género existe y tiene valores
    if (genderIdx === undefined) {
      Logger.log('❌ ERROR: No se encontró la columna Género');
      return {
        success: false,
        message: 'No se encontró la columna Género en la hoja de Jugadores'
      };
    }
    
    let updated = 0;
    const today = new Date();
    const changes = [];
    let genderValidationIssues = [];
    
    rows.forEach((row, index) => {
      const playerId = idIdx !== undefined ? row[idIdx] : `Fila ${index + 2}`;
      const playerName = nameIdx !== undefined ? row[nameIdx] : '';
      const playerLastName = lastNameIdx !== undefined ? row[lastNameIdx] : '';
      const playerFullName = `${playerName} ${playerLastName}`.trim() || playerId;
      
      // Leer género con validación
      const genderRaw = row[genderIdx];
      const gender = genderRaw ? String(genderRaw).trim() : '';
      
      // Validar que el género no esté vacío
      if (!gender) {
        genderValidationIssues.push({
          player: playerFullName,
          id: playerId,
          issue: 'Género vacío o no definido'
        });
        Logger.log(`⚠️ ${playerFullName} (${playerId}): Género vacío o no definido`);
      }
      
      // Normalizar género y obtener código
      const normalizedGender = normalizeGenderCode(gender);
      
      const birthValue = birthIdx !== undefined ? row[birthIdx] : '';
      let ageValue = ageIdx !== undefined ? row[ageIdx] : '';
      
      if ((!ageValue || isNaN(parseInt(ageValue, 10))) && birthValue) {
        const parsedBirth = parseBirthDate(birthValue);
        if (parsedBirth) {
          let ageNum = today.getFullYear() - parsedBirth.getFullYear();
          const monthDiff = today.getMonth() - parsedBirth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsedBirth.getDate())) {
            ageNum -= 1;
          }
          ageValue = ageNum;
        }
      }
      
      const currentCategory = row[categoryIdx] || '';
      const newCategory = calculatePlayerCategory(ageValue, gender, birthValue);
      
      // Log detallado del procesamiento, especialmente para el jugador problemático
      const isProblematicPlayer = playerId === 'PLR_1761344198280_1';
      if (isProblematicPlayer || newCategory !== currentCategory) {
        Logger.log(`🔍 Procesando ${playerFullName} (${playerId}):`);
        Logger.log(`   - Género leído de hoja: "${genderRaw}" (tipo: ${typeof genderRaw})`);
        Logger.log(`   - Género normalizado: "${normalizedGender}"`);
        Logger.log(`   - Edad: ${ageValue}`);
        Logger.log(`   - Fecha nacimiento: ${birthValue}`);
        const birthYear = birthValue ? (parseBirthDate(birthValue) ? parseBirthDate(birthValue).getFullYear() : 'N/A') : 'N/A';
        Logger.log(`   - Año nacimiento: ${birthYear}`);
        Logger.log(`   - Categoría actual: "${currentCategory}"`);
        Logger.log(`   - Categoría calculada: "${newCategory}"`);
        
        if (isProblematicPlayer) {
          Logger.log(`   ⚠️ JUGADOR PROBLEMÁTICO DETECTADO - Verificando clasificación de género`);
        }
      }
      
      if (newCategory && newCategory !== currentCategory) {
        changes.push({
          player: playerFullName,
          id: playerId,
          oldCategory: currentCategory || '(vacío)',
          newCategory: newCategory,
          gender: gender,
          normalizedGender: normalizedGender,
          birthYear: birthValue ? (parseBirthDate(birthValue) ? parseBirthDate(birthValue).getFullYear() : 'N/A') : 'N/A',
          age: ageValue
        });
        rows[index][categoryIdx] = newCategory;
        updated++;
        
        Logger.log(`  ✓ ${playerFullName} (${playerId}): "${currentCategory || '(vacío)'}" → "${newCategory}"`);
      }
    });
    
    // Reportar problemas de validación de género
    if (genderValidationIssues.length > 0) {
      Logger.log(`⚠️ Se encontraron ${genderValidationIssues.length} jugadores con género vacío o no definido:`);
      genderValidationIssues.forEach(issue => {
        Logger.log(`   - ${issue.player} (${issue.id}): ${issue.issue}`);
      });
    }
    
    Logger.log(`Total de jugadores procesados: ${rows.length}`);
    Logger.log(`Categorías actualizadas: ${updated}`);
    
    if (updated > 0) {
      playersSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      Logger.log('✓ Cambios guardados en la hoja de Jugadores');
    } else {
      Logger.log('ℹ️ No se encontraron categorías que requieran actualización');
    }
    
    return {
      success: true,
      message: `Categorías actualizadas para ${updated} jugador(es) de ${rows.length} total`,
      updated: updated,
      total: rows.length,
      changes: changes
    };
    
  } catch (error) {
    Logger.log('❌ Error actualizando categorías de jugadores: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Procesa datos desde la hoja FORM_TORNEO
 */
function processFormTorneoData() {
  try {
    Logger.log('=== PROCESANDO DATOS DE FORM_TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!formSheet) {
      Logger.log('Hoja FORM_TORNEO no encontrada');
      return { success: false, message: 'Hoja FORM_TORNEO no encontrada', processed: 0, total: 0 };
    }
    
    const data = formSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No hay datos en FORM_TORNEO (solo headers)');
      return { success: true, message: 'No hay datos en FORM_TORNEO', processed: 0, total: 0 };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers encontrados:', headers);
    Logger.log(`Filas de datos: ${rows.length}`);
    
    // Obtener o crear hoja de Aprobaciones
    let approvalsSheet = ss.getSheetByName('Aprobaciones');
    if (!approvalsSheet) {
      approvalsSheet = ss.insertSheet('Aprobaciones');
      
      // Configurar headers de Aprobaciones si es nueva
      const approvalsHeaders = [
        'ID',
        'Nombre completo del jugador',
        'Apellidos del Jugador',
        'Edad',
        'Número de identificación',
        'Teléfono de contacto',
        'Categoría',
        'Marca temporal',
        'Estado',
        'Fuente',
        'Nombre del Torneo',
        'Archivos Adjuntos',
        'Nombre completo del padre/tutor',
        'Teléfono del Tutor',
        'Dirección de correo electrónico',
        'Dirección completa',
        'Método de pago',
        'Fecha de pago',
        'Comprobante de pago',
        'Fecha de nacimiento',
        'Genero del jugador',
        'Talla de uniforme',
        'ID de Familia',
        'Es Primer Jugador',
        'Número de Respuesta',
        'Timestamp de Respuesta'
      ];
      
      approvalsSheet.getRange(1, 1, 1, approvalsHeaders.length).setValues([approvalsHeaders]);
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Función auxiliar para procesar archivos
    function processFile(fileData, type, name) {
      if (!fileData || fileData.toString().trim() === '') {
        return null;
      }
      
      const fileString = fileData.toString().trim();
      
      // Si ya es una URL de Google Drive, usarla directamente
      if (fileString.includes('drive.google.com')) {
        const match = fileString.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : fileString;
      }
      
      // Si es un ID simple (sin espacios, longitud > 10)
      if (fileString.length > 10 && !fileString.includes(' ') && !fileString.includes('{')) {
        return fileString;
      }
      
      // Si es un objeto o array serializado, intentar extraer el ID
      if (fileString.includes('{') || fileString.includes('[')) {
        try {
          const parsed = JSON.parse(fileString);
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0].id || parsed[0].url || parsed[0];
          }
          
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed.id || parsed.url || fileString;
          }
        } catch (e) {
          Logger.log('Error parseando archivo:', e);
        }
      }
      
      return fileString;
    }
    
    rows.forEach((row, index) => {
      try {
        Logger.log(`Procesando fila ${index + 1} de FORM_TORNEO:`, row);
        
        // Mapear campos según la estructura del formulario de torneo
        const timestamp = row[0] || new Date();
        const tutorEmail = row[1] || '';
        const tournamentName = row[2] || '';
        const playerName = row[3] || '';
        const tutorName = row[4] || '';
        const paymentAmount = row[5] || '';
        const paymentMethod = row[6] || '';
        const paymentDate = row[7] || '';
        const paymentProof = row[8] || '';
        
        // Crear archivos adjuntos
        const files = [];
        
        // Comprobante de Pago
        const comprobanteFile = processFile(paymentProof, 'payment_proof', 'Comprobante de Pago');
        if (comprobanteFile) files.push(comprobanteFile);
        
        Logger.log(`Archivos procesados para ${playerName}:`, files);
        
        // Crear datos del jugador para torneo
        const playerData = [
          `PLR_TORNEO_${Date.now()}_${index}`, // ID
          playerName, // Nombre completo del jugador
          '', // Apellidos del Jugador (no separado en el formulario)
          '', // Edad (no disponible en formulario de torneo)
          '', // Número de identificación (no disponible)
          '', // Teléfono de contacto (no disponible directamente)
          '', // Categoría (no disponible)
          timestamp, // Marca temporal
          'Pendiente', // Estado
          'FORM_TORNEO', // Fuente
          tournamentName, // Nombre del Torneo
          JSON.stringify(files), // Archivos Adjuntos
          tutorName, // Nombre completo del padre/tutor
          '', // Teléfono del Tutor (no disponible)
          tutorEmail, // Dirección de correo electrónico
          '', // Dirección completa (no disponible)
          paymentMethod, // Método de pago
          paymentDate, // Fecha de pago
          paymentProof, // Comprobante de pago
          '', // Fecha de nacimiento (no disponible)
          '', // Genero del jugador (no disponible)
          '', // Talla de uniforme (no disponible)
          `FAM_TORNEO_${Date.now()}_${index}`, // ID de Familia
          true, // Es Primer Jugador
          index + 1, // Número de Respuesta
          JSON.stringify(timestamp) // Timestamp de Respuesta
        ];
        
        approvalsSheet.appendRow(playerData);
        processedCount++;
        
        Logger.log(`Jugador de torneo ${playerName} procesado exitosamente`);
        
      } catch (error) {
        Logger.log(`Error procesando fila ${index + 1} de FORM_TORNEO: ${error.toString()}`);
        errorCount++;
      }
    });
    
    SpreadsheetApp.flush();
    Utilities.sleep(1000);
    
    const finalData = approvalsSheet.getDataRange().getValues();
    const finalRows = finalData.length - 1;
    
    return {
      success: true,
      message: `✅ Procesamiento de torneos completado: ${processedCount} inscripciones procesadas`,
      processed: processedCount,
      total: rows.length,
      errors: errorCount,
      finalRows: finalRows
    };
    
  } catch (error) {
    Logger.log('Error crítico procesando FORM_TORNEO: ' + error.toString());
    return { success: false, message: 'Error crítico: ' + error.toString(), processed: 0, total: 0 };
  }
}

/**
 * Obtiene grupos familiares agrupados por tutor
 * SOLO INCLUYE JUGADORES APROBADOS (en hoja Jugadores)
 * SOLO MUESTRA FAMILIAS CON 2 O MÁS JUGADORES
 */
/**
 * Diagnostica los datos de archivos en FORM_MATRICULA
 */
function diagnoseFileData() {
  try {
    Logger.log('=== DIAGNOSTICANDO DATOS DE ARCHIVOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = ss.getSheetByName('FORM_MATRICULA');
    
    if (!formSheet) {
      Logger.log('Hoja FORM_MATRICULA no encontrada');
      return { success: false, message: 'Hoja FORM_MATRICULA no encontrada' };
    }
    
    const data = formSheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No hay datos en FORM_MATRICULA');
      return { success: false, message: 'No hay datos en FORM_MATRICULA' };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers encontrados:', headers);
    
    // Buscar las columnas de archivos
    const fileColumns = ['M', 'N', 'T', 'U', 'AA', 'AB'];
    const fileColumnIndexes = [12, 13, 19, 20, 26, 27];
    
    const diagnosis = {
      totalRows: rows.length,
      fileData: []
    };
    
    // Analizar las primeras 3 filas para ver qué tipo de datos hay
    for (let rowIndex = 0; rowIndex < Math.min(3, rows.length); rowIndex++) {
      const row = rows[rowIndex];
      const rowData = {
        rowNumber: rowIndex + 1,
        files: {}
      };
      
      fileColumnIndexes.forEach((colIndex, fileIndex) => {
        const columnLetter = fileColumns[fileIndex];
        const cellValue = row[colIndex];
        
        rowData.files[columnLetter] = {
          value: cellValue,
          type: typeof cellValue,
          isNull: cellValue === null,
          isUndefined: cellValue === undefined,
          isEmpty: cellValue === '',
          isObject: typeof cellValue === 'object',
          stringValue: cellValue ? cellValue.toString() : '',
          length: cellValue ? cellValue.toString().length : 0
        };
        
        Logger.log(`Fila ${rowIndex + 1}, Columna ${columnLetter}:`, {
          value: cellValue,
          type: typeof cellValue,
          stringValue: cellValue ? cellValue.toString() : 'empty'
        });
      });
      
      diagnosis.fileData.push(rowData);
    }
    
    Logger.log('Diagnóstico completo:', diagnosis);
    return { success: true, diagnosis: diagnosis };
    
  } catch (error) {
    Logger.log('Error diagnosticando archivos: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Obtiene estadísticas adicionales para el dashboard
 */
function getAdditionalDashboardStats() {
  try {
    Logger.log('=== OBTENIENDO ESTADÍSTICAS ADICIONALES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    let scholarshipPlayers = 0;
    let totalMonthlyFees = 0;
    let totalPlayers = 0;
    let totalEnrollments = 0;
    let retentionRate = 0;
    
    // Procesar jugadores activos
    if (playersSheet) {
      const playersData = playersSheet.getDataRange().getValues();
      if (playersData.length > 1) {
        const headers = playersData[0];
        const rows = playersData.slice(1);
        
        rows.forEach(row => {
          const playerType = row[headers.indexOf('Tipo')] || 'normal';
          const monthlyFee = parseFloat(row[headers.indexOf('Mensualidad')]) || 130;
          
          if (playerType === 'becado') {
            scholarshipPlayers++;
          } else {
            totalMonthlyFees += monthlyFee;
          }
          totalPlayers++;
        });
      }
    }
    
    // Procesar aprobaciones para matrículas del mes
    if (approvalsSheet) {
      const approvalsData = approvalsSheet.getDataRange().getValues();
      if (approvalsData.length > 1) {
        const headers = approvalsData[0];
        const rows = approvalsData.slice(1);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        rows.forEach(row => {
          const timestamp = row[headers.indexOf('Marca temporal')];
          if (timestamp instanceof Date) {
            if (timestamp.getMonth() === currentMonth && timestamp.getFullYear() === currentYear) {
              totalEnrollments++;
            }
          }
        });
      }
    }
    
    // Calcular promedio de mensualidad
    const averageMonthlyFee = totalPlayers > 0 ? totalMonthlyFees / (totalPlayers - scholarshipPlayers) : 0;
    
    // Calcular tasa de retención (simplificado)
    const totalActivePlayers = totalPlayers;
    const totalPendingApprovals = approvalsSheet ? approvalsSheet.getDataRange().getNumRows() - 1 : 0;
    retentionRate = totalActivePlayers > 0 ? Math.round((totalActivePlayers / (totalActivePlayers + totalPendingApprovals)) * 100) : 0;
    
    const stats = {
      scholarshipPlayers: scholarshipPlayers,
      averageMonthlyFee: averageMonthlyFee,
      totalEnrollments: totalEnrollments,
      retentionRate: retentionRate,
      totalActivePlayers: totalActivePlayers
    };
    
    Logger.log('Estadísticas adicionales calculadas:', stats);
    return stats;
    
  } catch (error) {
    Logger.log('Error obteniendo estadísticas adicionales: ' + error.toString());
    return {
      scholarshipPlayers: 0,
      averageMonthlyFee: 0,
      totalEnrollments: 0,
      retentionRate: 0,
      totalActivePlayers: 0
    };
  }
}