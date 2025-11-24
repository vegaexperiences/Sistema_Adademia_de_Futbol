/**
 * ========================================
 * ARCHIVO: StudentManager.gs
 * DESCRIPCIÓN: Gestión completa de jugadores/estudiantes de la academia
 * FUNCIONES: CRUD de jugadores, gestión de familias, estados, historial de pagos
 * ========================================
 */

/**
 * Formatea una cédula que Google Sheets interpretó como fecha
 * Ejemplo: Date(2004-04-04) → "4-4-4443"
 */
function formatCedulaFromDate(dateValue) {
  try {
    if (!dateValue || !(dateValue instanceof Date)) {
      return String(dateValue || '');
    }
    
    // Google Sheets convierte "4-4-4443" a fecha Abril 4, 4443
    // Necesitamos extraer: mes-día-año
    const month = dateValue.getMonth() + 1; // 0-indexed
    const day = dateValue.getDate();
    const year = dateValue.getFullYear();
    
    // Formato panameño: M-D-YYYY (sin ceros a la izquierda)
    return `${month}-${day}-${year}`;
    
  } catch (error) {
    Logger.log('Error formateando cédula desde fecha:', error.toString());
    return String(dateValue);
  }
}

/**
 * Obtiene todos los jugadores activos
 */
function getAllPlayers() {
  // Protección extrema: envolver TODO en try-catch
  let result = [];
  
  try {
    Logger.log('=== OBTENIENDO TODOS LOS JUGADORES ===');
    Logger.log('Paso 1: Obteniendo spreadsheet...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      Logger.log('❌ CRÍTICO: No se pudo obtener spreadsheet');
      return [];
    }
    Logger.log('✓ Spreadsheet obtenido');
    
    Logger.log('Paso 2: Listando hojas...');
    const allSheets = ss.getSheets().map(s => s.getName());
    Logger.log('✓ Hojas disponibles:', allSheets);
    
    Logger.log('Paso 3: Buscando hoja "Jugadores"...');
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      Logger.log('❌ ERROR: Hoja "Jugadores" no encontrada');
      Logger.log('❌ Hojas disponibles:', allSheets.join(', '));
      
      // Intentar encontrar una hoja similar
      const similarSheet = ss.getSheets().find(sheet => 
        sheet.getName().toLowerCase().includes('jugador')
      );
      
      if (similarSheet) {
        Logger.log(`⚠️ Se encontró hoja similar: "${similarSheet.getName()}"`);
        Logger.log('⚠️ Por favor, usa el menú "🔧 Herramientas" → "🔨 Reparar Hoja Jugadores"');
      }
      
      return [];
    }
    
    Logger.log('✓ Hoja "Jugadores" encontrada');
    
    Logger.log('Paso 4: Leyendo datos de la hoja...');
    const data = playersSheet.getDataRange().getValues();
    Logger.log('Total de filas en Jugadores:', data.length);
    
    if (data.length === 0) {
      Logger.log('⚠️ Hoja "Jugadores" está completamente vacía');
      return [];
    }
    
    if (data.length === 1) {
      Logger.log('⚠️ Hoja "Jugadores" solo tiene headers, sin datos');
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Log individual de cada header
    Logger.log('📋 Headers encontrados (' + headers.length + ' columnas):');
    headers.forEach((header, idx) => {
      Logger.log(`   Columna ${idx} (${String.fromCharCode(65 + idx)}): ${header}`);
    });
    Logger.log('Total de jugadores:', rows.length);
    
    // Verificar estructura de columnas - SOLO ADVERTENCIA, NO BLOQUEO
    const expectedColumns = ['ID', 'Nombre', 'Apellidos', 'Edad', 'Cédula', 'Teléfono', 'Categoría', 'Estado', 'Fecha Registro', 'Tutor', 'Email Tutor', 'Dirección'];
    const missingColumns = [];
    
    for (let i = 0; i < expectedColumns.length; i++) {
      if (headers[i] !== expectedColumns[i]) {
        missingColumns.push({
          position: i,
          expected: expectedColumns[i],
          found: headers[i] || '(vacío)'
        });
      }
    }
    
    if (missingColumns.length > 0) {
      Logger.log('⚠️ ADVERTENCIA: Estructura de columnas no coincide exactamente');
      Logger.log('⚠️ Diferencias encontradas:', missingColumns);
      Logger.log('ℹ️ El sistema intentará leer los datos de todas formas usando mapeo flexible');
      // NO RETORNAR ERROR - Continuar con el procesamiento
    } else {
      Logger.log('✅ Estructura de columnas correcta');
    }
    
    // DESACTIVADO TEMPORALMENTE: Obtener jugadores morosos (puede causar timeout)
    // TODO: Optimizar getPlayersWithOverdueStatus() para que sea más rápido
    const overduePlayerIds = [];
    Logger.log('ℹ️ Verificación de morosos desactivada temporalmente para velocidad');
    
    Logger.log('Paso 5: Creando mapa de columnas...');
    // Crear mapa de índices por nombre de columna para mapeo dinámico
    const columnMap = {};
    headers.forEach((header, idx) => {
      if (header && header.trim() !== '') {
        columnMap[header] = idx;
      }
    });

    // Crear mapa normalizado para búsquedas flexibles (ignora mayúsculas, acentos y espacios)
    const normalizeHeader = header => {
      return String(header || '')
        .normalize('NFD')
        .replace(/[^\p{Letter}\p{Number}]+/gu, '')
        .toLowerCase();
    };
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

    const isValidUrl = value => {
      if (!value) return false;
      const str = String(value).trim();
      return /^https?:\/\//i.test(str);
    };

    const VALID_PAYMENT_KEYWORDS = ['yappy', 'ach', 'efectivo', 'transferencia', 'cheque', 'tarjeta', 'nequi', 'cash', 'depósito', 'deposito', 'banco', 'sin definir', 'visa', 'mastercard', 'clabe'];

    const isKnownPaymentMethod = value => {
      if (!value) return false;
      const str = String(value).trim().toLowerCase();
      return VALID_PAYMENT_KEYWORDS.some(keyword => str.includes(keyword));
    };

    const isLikelyDateLike = value => {
      if (!value) return false;
      if (value instanceof Date) return true;
      const str = String(value).trim();
      return /\b(gmt|mon|tue|wed|thu|fri|sat|sun)\b/i.test(str) || /\d{4}-\d{2}-\d{2}T/.test(str);
    };

    const isMissingValue = value => {
      if (!value) return true;
      const str = String(value).trim().toLowerCase();
      return str === '' || str === 'no registrado' || str === 'pendiente' || str === 'n/a' || str === 'na';
    };

    const parseAttachmentUrls = raw => {
      const result = {
        jugador: '',
        tutor: '',
        extras: []
      };

      if (!raw) {
        return result;
      }

      const tryAssign = (entry, hint) => {
        if (!entry) return;
        const lowerHint = (hint || '').toLowerCase();
        const url = typeof entry === 'string' ? entry : entry.url || entry.link || entry.href || '';
        if (!isValidUrl(url)) return;

        if (!result.jugador && /jugador|player|menor|hijo|hija/.test(lowerHint)) {
          result.jugador = url;
          return;
        }
        if (!result.tutor && /tutor|padre|madre|parent|representante/.test(lowerHint)) {
          result.tutor = url;
          return;
        }

        result.extras.push(url);
      };

      const processEntry = entry => {
        if (!entry) return;

        if (typeof entry === 'string') {
          tryAssign(entry, entry);
          return;
        }

        if (typeof entry === 'object') {
          const hint = entry.name || entry.fileName || entry.description || entry.label || '';
          let url = entry.url || entry.link || entry.href || '';
          if (!isValidUrl(url) && (entry.id || entry.fileId)) {
            const fileId = entry.id || entry.fileId;
            url = `https://drive.google.com/file/d/${fileId}/view`;
          }
          if (isValidUrl(url)) {
            tryAssign({ url }, hint);
          } else {
            tryAssign('', hint);
          }
          return;
        }
      };

      const rawString = typeof raw === 'string' ? raw.trim() : raw;

      if (typeof rawString === 'string') {
        // Intentar parsear JSON
        try {
          const parsed = JSON.parse(rawString);
          if (Array.isArray(parsed)) {
            parsed.forEach(item => processEntry(item));
          } else if (parsed && typeof parsed === 'object') {
            // Estructura como { cedulaJugador: {...}, cedulaTutor: {...} }
            Object.keys(parsed).forEach(key => {
              const value = parsed[key];
              processEntry({ ...value, name: `${key}` });
            });
          }
        } catch (jsonError) {
          // Buscar URLs directamente si no es JSON válido
          const urlMatches = rawString.match(/https?:\/\/[^\s"']+/g);
          if (urlMatches) {
            urlMatches.forEach(url => processEntry(url));
          }
        }
      } else if (Array.isArray(rawString)) {
        rawString.forEach(item => processEntry(item));
      } else if (rawString && typeof rawString === 'object') {
        Object.keys(rawString).forEach(key => {
          processEntry({ ...rawString[key], name: key });
        });
      }

      // Fallback: usar extras si no se asignaron específicos
      if (!result.jugador && result.extras.length) {
        result.jugador = result.extras.shift();
      }
      if (!result.tutor && result.extras.length) {
        result.tutor = result.extras.shift();
      }

      return result;
    };

    const buildHistoricDataMap = () => {
      const map = {};
      try {
        const historicSheet = ss.getSheetByName('Historico_Completo');
        if (!historicSheet) {
          Logger.log('ℹ️ Hoja Historico_Completo no encontrada, no se cargará mapa de respaldo');
          return map;
        }

        const historicData = historicSheet.getDataRange().getValues();
        if (!historicData || historicData.length <= 1) {
          Logger.log('ℹ️ Historico_Completo sin datos suficientes para respaldo');
          return map;
        }

        const historicHeaders = historicData[0];
        const normalizedHistoricHeaders = historicHeaders.map(normalizeHeader);
        const rowsHistoric = historicData.slice(1);

        const indiceIdAprobacion = historicHeaders.indexOf('ID Aprobación');
        const indiceTutor = historicHeaders.indexOf('Nombre completo del padre/tutor');
        const indiceEmailTutor = historicHeaders.indexOf('Dirección de correo electrónico');
        const indiceDireccion = historicHeaders.indexOf('Dirección completa');
        const indiceMetodoPago = historicHeaders.indexOf('Método de pago');
        const indiceCedulaTutor = historicHeaders.indexOf('Número de identificación Padre/Tutor');
        const indiceFamiliaId = historicHeaders.indexOf('ID de Familia');
        const indiceArchivos = historicHeaders.indexOf('Archivos Adjuntos (JSON)');
        const telefonoTutorAliases = ['telefonotutor', 'telefonodecontacto', 'telefonocontacto', 'telefonotutorpapamama'];
        const indiceTelefonoTutor = normalizedHistoricHeaders.findIndex(nh => telefonoTutorAliases.includes(nh));

        rowsHistoric.forEach(row => {
          const playerId = indiceIdAprobacion !== -1 ? row[indiceIdAprobacion] : '';
          if (!playerId) {
            return;
          }

          map[playerId] = {
            tutor: indiceTutor !== -1 ? String(row[indiceTutor] || '') : '',
            emailTutor: indiceEmailTutor !== -1 ? String(row[indiceEmailTutor] || '') : '',
            direccion: indiceDireccion !== -1 ? String(row[indiceDireccion] || '') : '',
            metodoPago: indiceMetodoPago !== -1 ? String(row[indiceMetodoPago] || '') : '',
            cedulaTutor: indiceCedulaTutor !== -1 ? String(row[indiceCedulaTutor] || '') : '',
            familiaId: indiceFamiliaId !== -1 ? String(row[indiceFamiliaId] || '') : '',
            telefonoTutor: indiceTelefonoTutor !== -1 ? String(row[indiceTelefonoTutor] || '') : '',
            attachments: indiceArchivos !== -1 ? parseAttachmentUrls(row[indiceArchivos]) : { jugador: '', tutor: '', extras: [] }
          };
        });

        Logger.log(`ℹ️ Mapa de respaldo cargado desde Histórico: ${Object.keys(map).length} registros`);
      } catch (error) {
        Logger.log('⚠️ Error cargando respaldo de histórico: ' + error.toString());
      }

      return map;
    };

    const historicBackupMap = buildHistoricDataMap();

    
    Logger.log('✓ Mapa de columnas creado:', Object.keys(columnMap).length, 'columnas');
    Logger.log('Columnas mapeadas:', Object.keys(columnMap).join(', '));
    
    Logger.log('Paso 6: Mapeando jugadores...');
    const players = rows.map((row, index) => {
      const player = {};
      
      // Mapear campos usando el mapa dinámico - más flexible
      player['ID'] = String(row[columnMap['ID']] || row[0] || '');
      player['Nombre'] = String(row[columnMap['Nombre']] || row[1] || '');
      player['Apellidos'] = String(row[columnMap['Apellidos']] || row[2] || '');
      player['Edad'] = row[columnMap['Edad']] || row[3] || '';
      
      // CÉDULAS: Convertir Date a string si es necesario (Google Sheets las interpreta como fechas)
      const cedulaValue = row[columnMap['Cédula']] || row[4] || '';
      player['Cédula'] = cedulaValue instanceof Date 
        ? formatCedulaFromDate(cedulaValue)
        : String(cedulaValue);
      
      player['Teléfono'] = String(row[columnMap['Teléfono']] || row[5] || '');
      player['Categoría'] = String(row[columnMap['Categoría']] || row[6] || '');
      player['Estado'] = String(row[columnMap['Estado']] || row[7] || '');
      
      // Fecha Registro: Convertir a string legible
      const fechaReg = row[columnMap['Fecha Registro']] || row[8] || '';
      player['Fecha Registro'] = fechaReg instanceof Date 
        ? fechaReg.toLocaleDateString('es-PA')
        : String(fechaReg);
      
      const tutorIdx = getColumnIndex('Tutor', 'Nombre completo del padre/tutor', 'Nombre del tutor', 'Tutor principal');
      const emailTutorIdx = getColumnIndex('Email Tutor', 'Correo Tutor', 'Dirección de correo electrónico');
      const telefonoTutorIdx = getColumnIndex('Teléfono Tutor', 'Telefono Tutor', 'Teléfono de contacto', 'Telefono de contacto');
      const direccionIdx = getColumnIndex('Dirección', 'Direccion', 'Dirección completa');
      const familiaIdx = getColumnIndex('Familia ID', 'ID Familia', 'Id Familia');
      const tipoIdx = getColumnIndex('Tipo', 'Tipo de Jugador');
      const descuentoIdx = getColumnIndex('Descuento %', 'Descuento', 'Porcentaje Descuento');
      const observacionesIdx = getColumnIndex('Observaciones', 'Notas', 'Comentarios');

      player['Tutor'] = String((tutorIdx !== undefined ? row[tutorIdx] : row[9]) || '');
      player['Email Tutor'] = String((emailTutorIdx !== undefined ? row[emailTutorIdx] : '') || '');
      player['Teléfono Tutor'] = String((telefonoTutorIdx !== undefined ? row[telefonoTutorIdx] : row[columnMap['Teléfono Tutor']] || row[columnMap['Telefono Tutor']] || '') || '');
      if (!player['Teléfono Tutor']) {
        player['Teléfono Tutor'] = player['Teléfono'];
      }
      player['Dirección'] = String((direccionIdx !== undefined ? row[direccionIdx] : (columnMap['Dirección'] !== undefined ? row[columnMap['Dirección']] : (columnMap['Direccion'] !== undefined ? row[columnMap['Direccion']] : ''))) || '');
      player['Familia ID'] = String((familiaIdx !== undefined ? row[familiaIdx] : row[12]) || '');
      player['Tipo'] = String((tipoIdx !== undefined ? row[tipoIdx] : row[13]) || 'normal');
      player['Descuento %'] = parseFloat((descuentoIdx !== undefined ? row[descuentoIdx] : (row[14] || 0)) || 0);
      player['Observaciones'] = String((observacionesIdx !== undefined ? row[observacionesIdx] : row[15]) || '');
      
      // Fecha Nacimiento: Convertir a string legible
      const fechaNac = row[columnMap['Fecha Nacimiento']] || row[16] || '';
      player['Fecha Nacimiento'] = fechaNac instanceof Date 
        ? fechaNac.toLocaleDateString('es-PA')
        : String(fechaNac);
      
      // Género: Buscar en múltiples posibles ubicaciones con saneamiento extra
      const generoIndices = [];
      if (columnMap['Género'] !== undefined) generoIndices.push(columnMap['Género']);
      if (columnMap['Genero'] !== undefined && columnMap['Genero'] !== columnMap['Género']) generoIndices.push(columnMap['Genero']);

      const generoDelJugadorIdx = headers.findIndex(header => String(header || '').toLowerCase() === 'genero del jugador');
      if (generoDelJugadorIdx !== -1 && !generoIndices.includes(generoDelJugadorIdx)) {
        generoIndices.push(generoDelJugadorIdx);
      }

      let generoString = '';
      const isInvalidGenero = str => {
        if (!str) return true;
        const lower = str.toLowerCase();
        if (lower === 'masculino' || lower === 'femenino' || lower === 'otro') {
          return false;
        }
        return str.trim().startsWith('[') || str.indexOf('http') !== -1;
      };

      for (let i = 0; i < generoIndices.length; i += 1) {
        const idx = generoIndices[i];
        if (idx === undefined || idx === null) continue;
        const raw = row[idx];
        const str = raw instanceof Date ? '' : String(raw || '').trim();
        if (str && !isInvalidGenero(str)) {
          generoString = str;
          break;
        }
        if (str && !generoString) {
          generoString = str;
        }
      }

      if ((!generoString || isInvalidGenero(generoString)) && row.length > 17) {
        const fallbackRaw = row[17];
        const fallbackStr = fallbackRaw instanceof Date ? '' : String(fallbackRaw || '').trim();
        if (fallbackStr && !isInvalidGenero(fallbackStr)) {
          generoString = fallbackStr;
        }
      }

      player['Género'] = generoString;
      
      // Método Pago Preferido: columna S es índice 19 (no 18), así que NO usar fallback row[18]
      const metodoPagoIdx = getColumnIndex('Método Pago Preferido', 'Método de pago', 'Metodo de pago', 'Metodo Pago Preferido', 'Método pago preferido');
      let metodoPago = metodoPagoIdx !== undefined ? row[metodoPagoIdx] : '';
      metodoPago = metodoPago instanceof Date ? '' : (metodoPago || '');

      if (metodoPago) {
        const metodoStr = String(metodoPago).trim();
        if (isKnownPaymentMethod(metodoStr)) {
          const capitalized = metodoStr.charAt(0).toUpperCase() + metodoStr.slice(1).toLowerCase();
          player['Método Pago Preferido'] = capitalized;
        } else {
          player['Método Pago Preferido'] = metodoStr;
        }
      } else {
        player['Método Pago Preferido'] = '';
      }
      
      // CÉDULA TUTOR: Convertir Date a string si es necesario
      const cedulaTutorValue = row[columnMap['Cédula Tutor']] || row[19] || '';
      player['Cédula Tutor'] = cedulaTutorValue instanceof Date 
        ? formatCedulaFromDate(cedulaTutorValue)
        : String(cedulaTutorValue);
      
      // Mensualidad Personalizada: Asegurar que sea número
      const mensualidadValue = row[columnMap['Mensualidad Personalizada']] || row[20] || '';
      player['Mensualidad Personalizada'] = mensualidadValue && mensualidadValue !== '' 
        ? parseFloat(mensualidadValue) 
        : '';
      
      // URL Cédula Jugador: columna V es índice 21
      const urlCedulaJugadorIdx = getColumnIndex('URL Cédula Jugador', 'Cedula Jugador URL', 'URL Cedula Jugador');
      const urlCedulaTutorIdx = getColumnIndex('URL Cédula Tutor', 'Cedula Tutor URL', 'URL Cedula Tutor');
      let urlCedulaJugador = urlCedulaJugadorIdx !== undefined ? row[urlCedulaJugadorIdx] : '';
      let urlCedulaTutor = urlCedulaTutorIdx !== undefined ? row[urlCedulaTutorIdx] : '';

      // Si los valores no parecen URLs válidas, intentar reconstruir desde el JSON de adjuntos
      const attachmentsIdx = getColumnIndex('Archivos Adjuntos', 'Archivos', 'Documentos Adjuntos', 'Adjuntos');
      const attachmentsRaw = attachmentsIdx !== undefined ? row[attachmentsIdx] : '';
      const attachmentInfo = parseAttachmentUrls(attachmentsRaw);

      if (!isValidUrl(urlCedulaJugador)) {
        urlCedulaJugador = attachmentInfo.jugador || (attachmentInfo.extras.length ? attachmentInfo.extras[0] : '');
      }
      if (!isValidUrl(urlCedulaTutor)) {
        urlCedulaTutor = attachmentInfo.tutor || (attachmentInfo.extras.length > 1 ? attachmentInfo.extras[1] : attachmentInfo.extras[0] || '');
      }

      player['URL Cédula Jugador'] = urlCedulaJugador || '';
      player['URL Cédula Tutor'] = urlCedulaTutor || '';

      const historicInfo = historicBackupMap[player['ID']];
      if (historicInfo) {
        if (isLikelyDateLike(player['Tutor']) || isMissingValue(player['Tutor'])) {
          player['Tutor'] = historicInfo.tutor || player['Tutor'];
        }

        if (isMissingValue(player['Email Tutor'])) {
          player['Email Tutor'] = historicInfo.emailTutor || player['Email Tutor'];
        }

        if (isMissingValue(player['Teléfono Tutor'])) {
          player['Teléfono Tutor'] = historicInfo.telefonoTutor || player['Teléfono Tutor'] || player['Teléfono'];
        }

        if (isMissingValue(player['Dirección'])) {
          player['Dirección'] = historicInfo.direccion || player['Dirección'];
        }

        if (isMissingValue(player['Familia ID']) || player['Familia ID'] === 'Sin asignar') {
          player['Familia ID'] = historicInfo.familiaId || player['Familia ID'];
        }

        if (!isKnownPaymentMethod(player['Método Pago Preferido']) && isKnownPaymentMethod(historicInfo.metodoPago)) {
          const metodoStr = historicInfo.metodoPago.trim();
          player['Método Pago Preferido'] = metodoStr.charAt(0).toUpperCase() + metodoStr.slice(1).toLowerCase();
        }

        if (isMissingValue(player['Cédula Tutor']) && historicInfo.cedulaTutor) {
          player['Cédula Tutor'] = historicInfo.cedulaTutor;
        }

        if (!isValidUrl(player['URL Cédula Jugador']) && historicInfo.attachments.jugador) {
          player['URL Cédula Jugador'] = historicInfo.attachments.jugador;
        }

        if (!isValidUrl(player['URL Cédula Tutor']) && historicInfo.attachments.tutor) {
          player['URL Cédula Tutor'] = historicInfo.attachments.tutor;
        }

        if (!player['URL Cédula Jugador'] && historicInfo.attachments.extras.length) {
          player['URL Cédula Jugador'] = historicInfo.attachments.extras[0];
        }

        if (!player['URL Cédula Tutor'] && historicInfo.attachments.extras.length > 1) {
          player['URL Cédula Tutor'] = historicInfo.attachments.extras[1];
        }
      }
      
      // Agregar estado de morosidad
      player['Moroso'] = overduePlayerIds.includes(player['ID']);
      
      // Log de cada jugador para debugging completo
      if (index < 3) {
        Logger.log(`Jugador ${index + 1} mapeado:`, {
          ID: player.ID,
          Nombre: player.Nombre,
          Tipo: player.Tipo,
          Género: player.Género,
          MensualidadPersonalizada: player['Mensualidad Personalizada'],
          Moroso: player.Moroso,
          TotalCampos: Object.keys(player).length
        });
      }
      
      // DEBUG: Verificar solo columnas problemáticas
      if (index === 0 && player.ID) {
        Logger.log('🔍 DEBUG primer jugador:');
        Logger.log('   Género mapeado:', player.Género);
        Logger.log('   Género en columnMap:', columnMap['Género']);
        Logger.log('   Genero en columnMap:', columnMap['Genero']);
        Logger.log('   Row[17]:', row[17] ? 'Tiene valor' : 'Vacío');
        Logger.log('   Row[18]:', row[18] ? 'Tiene valor' : 'Vacío');
      }
      
      return player;
    });
    
    Logger.log('Paso 7: Filtrando jugadores de torneo...');
    
    // Filtrar jugadores de torneo (no deben aparecer en la gestión principal)
    const regularPlayers = players.filter(player => {
      const playerId = player['ID'] || '';
      const isTournamentPlayer = playerId.includes('TORNEO');
      
      if (isTournamentPlayer) {
        Logger.log(`🏆 Jugador de torneo excluido: ${playerId}`);
      }
      
      return !isTournamentPlayer;
    });
    
    Logger.log(`✅ Filtrados: ${players.length} → ${regularPlayers.length} jugadores (excluidos ${players.length - regularPlayers.length} de torneo)`);
    
    Logger.log('Paso 8: Sanitizando para serialización...');
    
    // CRÍTICO: Convertir TODOS los valores a tipos serializables
    const sanitizedPlayers = regularPlayers.map((player, idx) => {
      const clean = {};
      
      for (let key in player) {
        if (player.hasOwnProperty(key)) {
          const value = player[key];
          
          // Convertir Date a string
          if (value instanceof Date) {
            clean[key] = value.toISOString().split('T')[0]; // YYYY-MM-DD
          }
          // Convertir null/undefined a string vacío
          else if (value === null || value === undefined) {
            clean[key] = '';
          }
          // Convertir números a string o número (no dejar como undefined)
          else if (typeof value === 'number') {
            clean[key] = value;
          }
          // Todo lo demás a string
          else {
            clean[key] = String(value);
          }
        }
      }
      
      return clean;
    });
    
    Logger.log('Paso 9: Finalizando...');
    Logger.log(`✅ ÉXITO: Devolviendo ${sanitizedPlayers.length} jugadores sanitizados`);
    
    if (sanitizedPlayers.length > 0) {
      Logger.log('Primeros 2 IDs:', sanitizedPlayers.slice(0, 2).map(p => p.ID));
      Logger.log('Tipo del primer jugador:', typeof sanitizedPlayers[0]);
      Logger.log('Es objeto plano?:', sanitizedPlayers[0].constructor.name === 'Object');
    }
    
    result = sanitizedPlayers;
    Logger.log(`📤 RETORNANDO: ${result.length} jugadores`);
    return result;
    
  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO obteniendo jugadores: ' + error.toString());
    Logger.log('Línea de error:', error.lineNumber || 'desconocida');
    Logger.log('Stack completo:', error.stack);
    Logger.log('Tipo de error:', typeof error);
    Logger.log('Nombre del error:', error.name);
    
    // GARANTIZAR que SIEMPRE devuelve un array
    result = [];
    Logger.log('📤 RETORNANDO array vacío por error');
    return result;
  }
}

// Asegurar que la función SIEMPRE existe y está disponible
if (typeof getAllPlayers !== 'function') {
  Logger.log('❌ CRÍTICO: getAllPlayers no está definida como función');
}

// Wrapper con protección adicional
function getAllPlayersProtected() {
  try {
    const result = getAllPlayers();
    
    // Validación adicional
    if (!result) {
      Logger.log('⚠️ getAllPlayers() devolvió null/undefined, retornando array vacío');
      return [];
    }
    
    if (!Array.isArray(result)) {
      Logger.log('⚠️ getAllPlayers() no devolvió un array, retornando array vacío');
      return [];
    }
    
    return result;
  } catch (error) {
    Logger.log('❌ Error en wrapper getAllPlayersProtected:', error.toString());
    return [];
  }
}

/**
 * Obtiene detalles completos del jugador incluyendo información del tutor
 */
function getPlayerFullDetails(playerId) {
  try {
    Logger.log('=== OBTENIENDO DETALLES COMPLETOS DEL JUGADOR ===');
    Logger.log('ID:', playerId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      Logger.log('ERROR: Hoja de Jugadores no encontrada');
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('ERROR: Hoja de Jugadores vacía');
      return { success: false, message: 'No hay jugadores en el sistema' };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers:', headers);
    Logger.log('Total de jugadores:', rows.length);
    
    // Buscar jugador por ID
    const idIndex = headers.indexOf('ID');
    
    if (idIndex === -1) {
      Logger.log('ERROR: Columna ID no encontrada');
      return { success: false, message: 'Estructura de hoja incorrecta' };
    }
    
    const rowIndex = rows.findIndex(row => String(row[idIndex]) === String(playerId));
    
    if (rowIndex === -1) {
      Logger.log('ERROR: Jugador no encontrado:', playerId);
      return { success: false, message: 'Jugador no encontrado' };
    }
    
    const row = rows[rowIndex];
    const player = {};
    
    // Mapear todos los campos usando índices fijos (nueva estructura de 21 columnas)
    player['ID'] = String(row[0] || '');
    player['Nombre'] = String(row[1] || '');
    player['Apellidos'] = String(row[2] || '');
    player['Edad'] = row[3] || '';
    player['Cédula'] = String(row[4] || '');
    player['Teléfono'] = row[5] || '';
    player['Categoría'] = String(row[6] || '');
    player['Estado'] = String(row[7] || '');
    player['Fecha Registro'] = row[8] instanceof Date ? row[8].toISOString() : String(row[8] || '');
    player['Tutor'] = String(row[9] || '');
    player['Email Tutor'] = String(row[10] || '');
    player['Dirección'] = String(row[11] || '');
    player['Familia ID'] = String(row[12] || '');
    player['Tipo'] = String(row[13] || 'normal');
    player['Descuento %'] = row[14] || 0;
    player['Observaciones'] = String(row[15] || '');
    player['Fecha Nacimiento'] = row[16] || '';
    player['Género'] = String(row[17] || '');
    player['Método Pago Preferido'] = String(row[18] || '');
    player['Cédula Tutor'] = String(row[19] || '');
    player['Mensualidad Personalizada'] = row[20] || '';
    
    Logger.log('✅ Jugador encontrado:', player['Nombre'], player['Apellidos']);
    Logger.log('✅ Detalles completos obtenidos exitosamente');
    
    return {
      success: true,
      player: player
    };
    
  } catch (error) {
    Logger.log('Error obteniendo detalles: ' + error.toString());
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * Obtiene un jugador por ID
 */
function getPlayerById(playerId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return null;
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    const playerRow = data.find(row => row[0] === playerId);
    
    if (!playerRow) {
      return null;
    }
    
    const player = {};
    headers.forEach((header, index) => {
      player[header] = playerRow[index];
    });
    
    return player;
    
  } catch (error) {
    Logger.log('Error obteniendo jugador por ID: ' + error.toString());
    return null;
  }
}

/**
 * FUNCIONES MOVIDAS A PaymentManager.gs
 * - getPlayerPaymentHistory
 * - updatePlayerMonthlyFee
 * - addExtraChargeToPlayer
 * Usar las versiones en PaymentManager.gs
 */

/**
 * Obtiene jugadores por estado
 */
function getPlayersByState(state) {
  try {
    const allPlayers = getAllPlayers();
    return allPlayers.filter(player => player.Estado === state);
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores por estado: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene jugadores por categoría
 */
function getPlayersByCategory(category) {
  try {
    const allPlayers = getAllPlayers();
    return allPlayers.filter(player => player.Categoría === category);
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores por categoría: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene jugadores becados
 */
function getScholarshipPlayers() {
  try {
    const allPlayers = getAllPlayers();
    return allPlayers.filter(player => player.Tipo === 'becado');
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores becados: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene jugadores por familia
 */
function getPlayersByFamily(familyId) {
  try {
    const allPlayers = getAllPlayers();
    return allPlayers.filter(player => player['Familia ID'] === familyId);
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores por familia: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene todos los jugadores activos con la misma cédula de tutor
 * Retorna array ordenado por ID para determinar el primero en la familia
 */
function getPlayersByTutorCedula(cedulaTutor) {
  try {
    if (!cedulaTutor || cedulaTutor === '' || cedulaTutor === 'Sin asignar') {
      return [];
    }
    
    // Normalizar cédula para comparación
    const normalizedCedula = String(cedulaTutor).trim().toLowerCase();
    
    const allPlayers = getAllPlayers();
    const playersWithSameTutor = allPlayers.filter(player => {
      // Solo jugadores activos
      if (player.Estado !== 'Activo') {
        return false;
      }
      
      // Normalizar cédula del jugador para comparación
      const playerCedula = String(player['Cédula Tutor'] || '').trim().toLowerCase();
      
      return playerCedula === normalizedCedula && playerCedula !== '';
    });
    
    // Ordenar por ID para mantener consistencia
    return playersWithSameTutor.sort((a, b) => {
      if (a.ID < b.ID) return -1;
      if (a.ID > b.ID) return 1;
      return 0;
    });
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores por cédula de tutor: ' + error.toString());
    return [];
  }
}

/**
 * Actualiza el estado de un jugador
 */
function updatePlayerState(playerId, newState) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('Hoja de Jugadores no encontrada');
    }
    
    const data = playersSheet.getDataRange().getValues();
    const playerRowIndex = data.findIndex(row => row[0] === playerId);
    
    if (playerRowIndex === -1) {
      throw new Error('Jugador no encontrado');
    }
    
    // Validar estado
    const validStates = getPlayerStates();
    if (!validStates.includes(newState)) {
      throw new Error('Estado no válido');
    }
    
    // Actualizar estado
    playersSheet.getRange(playerRowIndex + 1, 8).setValue(newState); // Columna Estado
    
    // Registrar cambio en logs
    logPlayerStateChange(playerId, newState);
    
    Logger.log(`Estado del jugador ${playerId} actualizado a: ${newState}`);
    return true;
    
  } catch (error) {
    Logger.log('Error actualizando estado del jugador: ' + error.toString());
    return false;
  }
}

/**
 * Activa un jugador
 */
function activatePlayer(playerId) {
  return updatePlayerState(playerId, 'Activo');
}

/**
 * Desactiva un jugador
 */
function deactivatePlayer(playerId) {
  return updatePlayerState(playerId, 'Inactivo');
}

/**
 * Suspende un jugador
 */
function suspendPlayer(playerId, reason = '') {
  try {
    const success = updatePlayerState(playerId, 'Suspendido');
    if (success && reason) {
      updatePlayerObservations(playerId, `Suspendido: ${reason}`);
    }
    return success;
  } catch (error) {
    Logger.log('Error suspendiendo jugador: ' + error.toString());
    return false;
  }
}

/**
 * Actualiza las observaciones de un jugador
 */
function updatePlayerObservations(playerId, observations) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('Hoja de Jugadores no encontrada');
    }
    
    const data = playersSheet.getDataRange().getValues();
    const playerRowIndex = data.findIndex(row => row[0] === playerId);
    
    if (playerRowIndex === -1) {
      throw new Error('Jugador no encontrado');
    }
    
    // Actualizar observaciones
    playersSheet.getRange(playerRowIndex + 1, 14).setValue(observations); // Columna Observaciones
    
    Logger.log(`Observaciones del jugador ${playerId} actualizadas`);
    return true;
    
  } catch (error) {
    Logger.log('Error actualizando observaciones del jugador: ' + error.toString());
    return false;
  }
}

/**
 * Aplica un descuento a un jugador
 */
function applyPlayerDiscount(playerId, discountPercentage, startDate, endDate = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('Hoja de Jugadores no encontrada');
    }
    
    const data = playersSheet.getDataRange().getValues();
    const playerRowIndex = data.findIndex(row => row[0] === playerId);
    
    if (playerRowIndex === -1) {
      throw new Error('Jugador no encontrado');
    }
    
    // Validar descuento
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('El descuento debe estar entre 0 y 100%');
    }
    
    // Actualizar descuento
    playersSheet.getRange(playerRowIndex + 1, 13).setValue(discountPercentage); // Columna Descuento %
    
    // Registrar descuento en logs
    logPlayerDiscount(playerId, discountPercentage, startDate, endDate);
    
    Logger.log(`Descuento del ${discountPercentage}% aplicado al jugador ${playerId}`);
    return true;
    
  } catch (error) {
    Logger.log('Error aplicando descuento al jugador: ' + error.toString());
    return false;
  }
}

// FUNCIÓN ELIMINADA - getPlayerPaymentHistory ahora está en PaymentManager.gs

/**
 * Obtiene el estado de cuenta de un jugador
 */
function getPlayerAccountStatus(playerId) {
  try {
    const paymentHistory = getPlayerPaymentHistory(playerId);
    const player = getPlayerById(playerId);
    
    if (!player) {
      throw new Error('Jugador no encontrado');
    }
    
    const financialConfig = getFinancialConfig();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calcular pagos del mes actual
    const currentMonthPayments = paymentHistory.filter(payment => {
      const paymentDate = new Date(payment.Fecha);
      return paymentDate.getMonth() === currentMonth && 
             paymentDate.getFullYear() === currentYear &&
             payment.Estado === 'Pagado';
    });
    
    // Calcular monto esperado para el mes
    let expectedAmount = 0;
    if (player.Tipo === 'becado') {
      expectedAmount = 0;
    } else {
      const familyPlayers = getPlayersByFamily(player['Familia ID']);
      const isFirstInFamily = familyPlayers[0] && familyPlayers[0].ID === playerId;
      
      if (isFirstInFamily) {
        expectedAmount = financialConfig.MONTHLY_FEE;
      } else {
        expectedAmount = financialConfig.FAMILY_MONTHLY_FEE;
      }
      
      // Aplicar descuento si existe
      if (player['Descuento %'] && player['Descuento %'] > 0) {
        expectedAmount = expectedAmount * (1 - player['Descuento %'] / 100);
      }
    }
    
    // Calcular monto pagado en el mes
    const paidAmount = currentMonthPayments.reduce((total, payment) => {
      return total + (parseFloat(payment.Monto) || 0);
    }, 0);
    
    // Calcular saldo pendiente
    const pendingAmount = expectedAmount - paidAmount;
    
    return {
      playerId: playerId,
      playerName: `${player.Nombre} ${player.Apellidos}`,
      expectedAmount: expectedAmount,
      paidAmount: paidAmount,
      pendingAmount: pendingAmount,
      isUpToDate: pendingAmount <= 0,
      lastPaymentDate: paymentHistory.length > 0 ? paymentHistory[0].Fecha : null,
      paymentHistory: paymentHistory.slice(0, 10) // Últimos 10 pagos
    };
    
  } catch (error) {
    Logger.log('Error obteniendo estado de cuenta: ' + error.toString());
    return null;
  }
}

/**
 * Obtiene información de una familia
 */
function getFamilyInfo(familyId) {
  try {
    const familyPlayers = getPlayersByFamily(familyId);
    
    if (familyPlayers.length === 0) {
      return null;
    }
    
    // Obtener información del tutor (del primer jugador)
    const firstPlayer = familyPlayers[0];
    const tutorInfo = {
      name: firstPlayer.Tutor || '',
      phone: firstPlayer.Teléfono || '',
      email: ''
    };
    
    // Calcular totales financieros de la familia
    let totalExpected = 0;
    let totalPaid = 0;
    let totalPending = 0;
    
    familyPlayers.forEach(player => {
      const accountStatus = getPlayerAccountStatus(player.ID);
      if (accountStatus) {
        totalExpected += accountStatus.expectedAmount;
        totalPaid += accountStatus.paidAmount;
        totalPending += accountStatus.pendingAmount;
      }
    });
    
    return {
      familyId: familyId,
      tutor: tutorInfo,
      players: familyPlayers,
      totalPlayers: familyPlayers.length,
      totalExpected: totalExpected,
      totalPaid: totalPaid,
      totalPending: totalPending,
      isUpToDate: totalPending <= 0
    };
    
  } catch (error) {
    Logger.log('Error obteniendo información de familia: ' + error.toString());
    return null;
  }
}

/**
 * Obtiene todas las familias
 */
function getAllFamilies() {
  try {
    const allPlayers = getAllPlayers();
    const familyIds = [...new Set(allPlayers.map(player => player['Familia ID']).filter(id => id))];
    
    return familyIds.map(familyId => getFamilyInfo(familyId)).filter(family => family !== null);
    
  } catch (error) {
    Logger.log('Error obteniendo familias: ' + error.toString());
    return [];
  }
}

/**
 * Busca jugadores por criterios
 */
function searchPlayers(criteria) {
  try {
    const allPlayers = getAllPlayers();
    let filteredPlayers = allPlayers;
    
    // Filtrar por nombre
    if (criteria.name) {
      const nameFilter = criteria.name.toLowerCase();
      filteredPlayers = filteredPlayers.filter(player => 
        player.Nombre.toLowerCase().includes(nameFilter) ||
        player.Apellidos.toLowerCase().includes(nameFilter)
      );
    }
    
    // Filtrar por cédula
    if (criteria.cedula) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.Cédula.includes(criteria.cedula)
      );
    }
    
    // Filtrar por estado
    if (criteria.state) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.Estado === criteria.state
      );
    }
    
    // Filtrar por categoría
    if (criteria.category) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.Categoría === criteria.category
      );
    }
    
    // Filtrar por tipo
    if (criteria.type) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.Tipo === criteria.type
      );
    }
    
    return filteredPlayers;
    
  } catch (error) {
    Logger.log('Error buscando jugadores: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene estadísticas de jugadores
 */
function getPlayerStatistics() {
  try {
    const allPlayers = getAllPlayers();
    
    const stats = {
      total: allPlayers.length,
      active: 0,
      inactive: 0,
      pending: 0,
      scholarship: 0,
      suspended: 0,
      byCategory: {},
      byGender: { M: 0, F: 0 },
      families: 0
    };
    
    const familyIds = new Set();
    
    allPlayers.forEach(player => {
      // Contar por estado
      switch (player.Estado) {
        case 'Activo':
          stats.active++;
          break;
        case 'Inactivo':
          stats.inactive++;
          break;
        case 'Pendiente':
          stats.pending++;
          break;
        case 'Suspendido':
          stats.suspended++;
          break;
      }
      
      // Contar por tipo
      if (player.Tipo === 'becado') {
        stats.scholarship++;
      }
      
      // Contar por categoría
      if (player.Categoría) {
        stats.byCategory[player.Categoría] = (stats.byCategory[player.Categoría] || 0) + 1;
      }
      
      // Contar por género
      if (player.Categoría) {
        const gender = player.Categoría.includes('M') ? 'M' : 'F';
        stats.byGender[gender]++;
      }
      
      // Contar familias
      if (player['Familia ID']) {
        familyIds.add(player['Familia ID']);
      }
    });
    
    stats.families = familyIds.size;
    
    return stats;
    
  } catch (error) {
    Logger.log('Error obteniendo estadísticas de jugadores: ' + error.toString());
    return null;
  }
}

/**
 * Registra un cambio de estado de jugador en logs
 */
function logPlayerStateChange(playerId, newState) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.getRange(1, 1, 1, 4).setValues([['Tipo', 'Jugador ID', 'Detalle', 'Fecha']]);
    }
    
    logsSheet.appendRow([
      'player_state_change',
      playerId,
      `Estado cambiado a: ${newState}`,
      new Date()
    ]);
    
  } catch (error) {
    Logger.log('Error registrando cambio de estado: ' + error.toString());
  }
}

/**
 * Registra un descuento aplicado a un jugador
 */
function logPlayerDiscount(playerId, percentage, startDate, endDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.getRange(1, 1, 1, 4).setValues([['Tipo', 'Jugador ID', 'Detalle', 'Fecha']]);
    }
    
    const detail = `Descuento ${percentage}% aplicado desde ${startDate}${endDate ? ` hasta ${endDate}` : ''}`;
    
    logsSheet.appendRow([
      'player_discount',
      playerId,
      detail,
      new Date()
    ]);
    
  } catch (error) {
    Logger.log('Error registrando descuento: ' + error.toString());
  }
}

/**
 * Exporta datos de jugadores a formato CSV
 */
function exportPlayersToCSV() {
  try {
    const players = getAllPlayers();
    
    if (players.length === 0) {
      return '';
    }
    
    const headers = Object.keys(players[0]);
    const csvContent = [
      headers.join(','),
      ...players.map(player => 
        headers.map(header => {
          const value = player[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
    
  } catch (error) {
    Logger.log('Error exportando jugadores: ' + error.toString());
    return '';
  }
}

/**
 * ========================================
 * FUNCIONES DE MENSUALIDADES PERSONALIZABLES
 * ========================================
 */

// FUNCIÓN ELIMINADA - updatePlayerMonthlyFee ahora está en PaymentManager.gs

/**
 * Obtiene la mensualidad personalizada de un jugador
 */
function getPlayerMonthlyFee(playerId) {
  try {
    const player = getPlayerById(playerId);
    
    if (!player) {
      return null;
    }
    
    // Verificar si tiene mensualidad personalizada
    const customFee = player['Mensualidad Personalizada'] || player['Mensualidad'];
    
    if (customFee && customFee > 0) {
      return {
        isCustom: true,
        amount: parseFloat(customFee),
        type: 'personalizada'
      };
    }
    
    // Si es becado, no paga nada
    if (player.Tipo === 'becado') {
      return {
        isCustom: true,
        amount: 0,
        type: 'becado'
      };
    }
    
    // Usar configuración por defecto
    // Verificar por cédula de tutor en lugar de solo Familia ID
    // Criterio: 2 o más jugadores con mismo tutor = familia real
    const financialConfig = getFinancialConfig();
    const cedulaTutor = player['Cédula Tutor'];
    const playersWithSameTutor = getPlayersByTutorCedula(cedulaTutor);
    const isRealFamily = playersWithSameTutor.length >= 2; // 2 o más jugadores = familia
    const isFirstInFamily = playersWithSameTutor.length > 0 && playersWithSameTutor[0].ID === playerId;
    
    // Si es familia real (2+ jugadores) y no es el primero, usa tarifa familiar
    // Si es familia real y es el primero, usa tarifa individual
    // Si no es familia real (1 jugador), usa tarifa individual
    const defaultAmount = (isRealFamily && !isFirstInFamily) ? 
      financialConfig.FAMILY_MONTHLY_FEE : 
      financialConfig.MONTHLY_FEE;
    
    const feeType = (isRealFamily && !isFirstInFamily) ? 'familiar' : 'individual';
    
    return {
      isCustom: false,
      amount: defaultAmount,
      type: feeType
    };
    
  } catch (error) {
    Logger.log('Error obteniendo mensualidad del jugador: ' + error.toString());
    return null;
  }
}

/**
 * Crea un backup completo de todos los jugadores
 * Guarda una copia en una hoja de backup y JSON con metadatos
 */
function backupAllPlayersComplete() {
  try {
    Logger.log('=== INICIANDO BACKUP COMPLETO DE JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('No se encontró la hoja de Jugadores');
    }
    
    // Obtener todos los datos de la hoja Jugadores
    const allData = playersSheet.getDataRange().getValues();
    
    if (allData.length <= 1) {
      throw new Error('No hay datos en la hoja de Jugadores (solo headers o vacía)');
    }
    
    const headers = allData[0];
    const rows = allData.slice(1);
    
    // Crear timestamp único para el nombre de la hoja
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const backupSheetName = `Backup_Jugadores_${timestamp}`;
    
    // Crear hoja de backup
    let backupSheet = ss.getSheetByName(backupSheetName);
    if (backupSheet) {
      // Si existe, eliminarla y recrearla
      ss.deleteSheet(backupSheet);
    }
    backupSheet = ss.insertSheet(backupSheetName);
    
    // Copiar headers
    backupSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    backupSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    
    // Copiar todos los datos
    if (rows.length > 0) {
      backupSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    // Guardar metadatos en JSON en una celda adicional
    const allPlayers = getAllPlayers();
    const backupData = {
      timestamp: now.toISOString(),
      version: '1.0',
      totalPlayers: allPlayers.length,
      totalRows: rows.length,
      headers: headers,
      metadata: {
        createdBy: Session.getActiveUser().getEmail(),
        timezone: Session.getScriptTimeZone(),
        sheetName: backupSheetName
      }
    };
    
    // Guardar JSON en la columna siguiente después de los datos
    const jsonRow = rows.length + 3;
    backupSheet.getRange(jsonRow, 1).setValue('=== METADATOS DEL BACKUP (JSON) ===');
    backupSheet.getRange(jsonRow + 1, 1).setValue(JSON.stringify(backupData, null, 2));
    
    Logger.log(`Backup completado: ${rows.length} jugadores guardados en hoja "${backupSheetName}"`);
    
    return {
      success: true,
      message: `Backup creado exitosamente`,
      sheetName: backupSheetName,
      totalPlayers: rows.length,
      timestamp: now.toISOString()
    };
    
  } catch (error) {
    Logger.log('Error creando backup de jugadores: ' + error.toString());
    return {
      success: false,
      message: 'Error creando backup: ' + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Analiza las asignaciones de familias y identifica inconsistencias
 * Identifica familias reales (2+ jugadores con mismo tutor) y jugadores con Familia ID incorrecto
 */
function analyzeFamilyAssignments() {
  try {
    Logger.log('=== ANALIZANDO ASIGNACIONES DE FAMILIAS ===');
    
    const allPlayers = getAllPlayers();
    const activePlayers = allPlayers.filter(player => player.Estado === 'Activo');
    
    // Agrupar jugadores por cédula de tutor
    const playersByTutor = new Map();
    
    activePlayers.forEach(player => {
      const cedulaTutor = String(player['Cédula Tutor'] || '').trim().toLowerCase();
      
      if (!cedulaTutor || cedulaTutor === '' || cedulaTutor === 'sin asignar') {
        return; // Saltar jugadores sin cédula de tutor
      }
      
      if (!playersByTutor.has(cedulaTutor)) {
        playersByTutor.set(cedulaTutor, []);
      }
      
      playersByTutor.get(cedulaTutor).push(player);
    });
    
    // Identificar familias reales y jugadores a limpiar
    const realFamilies = [];
    const playersToClean = [];
    const soloPlayers = [];
    
    playersByTutor.forEach((players, cedulaTutor) => {
      // Ordenar jugadores por ID para mantener consistencia
      players.sort((a, b) => {
        if (a.ID < b.ID) return -1;
        if (a.ID > b.ID) return 1;
        return 0;
      });
      
      // Criterio: 2 o más jugadores = familia real
      if (players.length >= 2) {
        // Es una familia real
        realFamilies.push({
          cedulaTutor: cedulaTutor,
          players: players.map(p => ({
            id: p.ID,
            nombre: `${p.Nombre} ${p.Apellidos}`,
            familiaId: p['Familia ID'] || 'Sin asignar',
            estado: p.Estado
          })),
          totalPlayers: players.length
        });
        
        // Verificar si algún jugador tiene Familia ID pero no debería tenerlo asignado
        // (esto se maneja en la limpieza)
      } else {
        // Es un jugador solo (1 jugador)
        const player = players[0];
        soloPlayers.push({
          id: player.ID,
          nombre: `${player.Nombre} ${player.Apellidos}`,
          cedulaTutor: cedulaTutor,
          familiaId: player['Familia ID'] || 'Sin asignar',
          estado: player.Estado
        });
        
        // Si tiene Familia ID y no debería tenerlo, agregarlo a playersToClean
        if (player['Familia ID'] && 
            player['Familia ID'] !== '' && 
            player['Familia ID'] !== 'sin grupo familiar' &&
            player['Familia ID'] !== 'Sin asignar') {
          playersToClean.push({
            id: player.ID,
            nombre: `${player.Nombre} ${player.Apellidos}`,
            cedulaTutor: cedulaTutor,
            familiaIdActual: player['Familia ID'],
            razon: 'Jugador solo (1 jugador con este tutor) no debe tener Familia ID'
          });
        }
      }
    });
    
    // También verificar jugadores activos que tienen Familia ID pero la cédula de tutor no coincide
    // con otros jugadores en esa familia
    activePlayers.forEach(player => {
      const familiaId = player['Familia ID'];
      if (familiaId && 
          familiaId !== '' && 
          familiaId !== 'sin grupo familiar' &&
          familiaId !== 'Sin asignar') {
        
        // Verificar si este jugador ya está en playersToClean
        const yaMarcado = playersToClean.find(p => p.id === player.ID);
        if (yaMarcado) {
          return; // Ya está marcado para limpieza
        }
        
        // Buscar jugadores con mismo Familia ID
        const playersWithSameFamilyId = activePlayers.filter(p => 
          p['Familia ID'] === familiaId && p.ID !== player.ID
        );
        
        if (playersWithSameFamilyId.length === 0) {
          // Este jugador tiene un Familia ID que nadie más tiene
          playersToClean.push({
            id: player.ID,
            nombre: `${player.Nombre} ${player.Apellidos}`,
            cedulaTutor: String(player['Cédula Tutor'] || '').trim(),
            familiaIdActual: familiaId,
            razon: 'Familia ID único (ningún otro jugador tiene este ID)'
          });
        } else {
          // Verificar si todos los jugadores con este Familia ID tienen la misma cédula de tutor
          const cedulaTutor = String(player['Cédula Tutor'] || '').trim().toLowerCase();
          const todosMismaCedula = playersWithSameFamilyId.every(p => 
            String(p['Cédula Tutor'] || '').trim().toLowerCase() === cedulaTutor
          );
          
          if (!todosMismaCedula || cedulaTutor === '') {
            // Los jugadores con este Familia ID no tienen la misma cédula de tutor
            playersToClean.push({
              id: player.ID,
              nombre: `${player.Nombre} ${player.Apellidos}`,
              cedulaTutor: cedulaTutor || 'Sin cédula',
              familiaIdActual: familiaId,
              razon: 'Familia ID con cédulas de tutor inconsistentes'
            });
          }
        }
      }
    });
    
    const summary = {
      totalJugadoresActivos: activePlayers.length,
      familiasReales: realFamilies.length,
      totalJugadoresEnFamilias: realFamilies.reduce((sum, f) => sum + f.totalPlayers, 0),
      jugadoresSolo: soloPlayers.length,
      jugadoresALimpiar: playersToClean.length
    };
    
    Logger.log('Análisis completado:', summary);
    
    return {
      success: true,
      realFamilies: realFamilies,
      playersToClean: playersToClean,
      soloPlayers: soloPlayers,
      summary: summary
    };
    
  } catch (error) {
    Logger.log('Error analizando asignaciones de familias: ' + error.toString());
    return {
      success: false,
      message: 'Error en análisis: ' + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Limpia las asignaciones de Familia ID incorrectas
 * @param {boolean} confirm - Si es true, ejecuta la limpieza. Si es false, solo retorna reporte
 */
function cleanFamilyAssignments(confirm) {
  try {
    Logger.log('=== INICIANDO LIMPIEZA DE ASIGNACIONES DE FAMILIAS ===');
    Logger.log('Confirmación recibida:', confirm);
    
    // Primero obtener el análisis
    const analysis = analyzeFamilyAssignments();
    
    if (!analysis.success) {
      throw new Error(analysis.message || 'Error en análisis');
    }
    
    const playersToClean = analysis.playersToClean || [];
    
    if (playersToClean.length === 0) {
      return {
        success: true,
        message: 'No hay jugadores que necesiten limpieza',
        cleaned: 0,
        skipped: 0,
        summary: analysis.summary
      };
    }
    
    // Si confirm es false, solo retornar reporte
    if (confirm !== true) {
      return {
        success: true,
        preview: true,
        message: `Se encontraron ${playersToClean.length} jugadores que necesitan limpieza. Use confirm=true para ejecutar.`,
        playersToClean: playersToClean,
        summary: analysis.summary
      };
    }
    
    // Ejecutar limpieza
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('No se encontró la hoja de Jugadores');
    }
    
    const allData = playersSheet.getDataRange().getValues();
    const headers = allData[0];
    const rows = allData.slice(1);
    
    const idIdx = headers.indexOf('ID');
    const familiaIdIdx = headers.indexOf('Familia ID');
    
    if (idIdx === -1 || familiaIdIdx === -1) {
      throw new Error('No se encontraron las columnas necesarias (ID o Familia ID)');
    }
    
    let cleaned = 0;
    let skipped = 0;
    const cleanedPlayers = [];
    
    // Crear mapa de IDs a limpiar para búsqueda rápida
    const idsToClean = new Set(playersToClean.map(p => p.id));
    
    // Actualizar cada fila
    rows.forEach((row, index) => {
      const playerId = String(row[idIdx] || '').trim();
      
      if (idsToClean.has(playerId)) {
        const rowNumber = index + 2; // +2 porque index es 0-based y hay header en fila 1
        
        // Actualizar Familia ID a 'sin grupo familiar'
        playersSheet.getRange(rowNumber, familiaIdIdx + 1).setValue('sin grupo familiar');
        cleaned++;
        
        const player = playersToClean.find(p => p.id === playerId);
        cleanedPlayers.push({
          id: playerId,
          nombre: player ? player.nombre : 'Desconocido',
          familiaIdAnterior: player ? player.familiaIdActual : '',
          razon: player ? player.razon : ''
        });
        
        Logger.log(`Jugador ${playerId} actualizado: Familia ID = 'sin grupo familiar'`);
      }
    });
    
    Logger.log(`Limpieza completada: ${cleaned} jugadores actualizados`);
    
    return {
      success: true,
      message: `Limpieza completada exitosamente`,
      cleaned: cleaned,
      skipped: skipped,
      cleanedPlayers: cleanedPlayers,
      summary: {
        ...analysis.summary,
        jugadoresLimpiados: cleaned
      }
    };
    
  } catch (error) {
    Logger.log('Error en limpieza de asignaciones de familias: ' + error.toString());
    return {
      success: false,
      message: 'Error en limpieza: ' + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Procesa el cobro mensual automático para todos los jugadores
 * Esta función se ejecuta el día 1 de cada mes
 */
function processMonthlyBilling() {
  try {
    Logger.log('=== INICIANDO COBRO MENSUAL AUTOMÁTICO ===');
    
    // Verificar fecha de inicio de generación de mensualidades
    const startDate = getMonthlyFeeGenerationStartDate();
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);
    
    if (currentDate < startDateNormalized) {
      Logger.log(`⏸️ Generación de mensualidades pausada hasta ${startDate.toLocaleDateString('es-ES')}. Fecha actual: ${currentDate.toLocaleDateString('es-ES')}`);
      return {
        success: true,
        processed: 0,
        errors: 0,
        total: 0,
        results: [],
        message: `Generación de mensualidades pausada hasta ${startDate.toLocaleDateString('es-ES')}`
      };
    }
    
    const allPlayers = getAllPlayers();
    const activePlayers = allPlayers.filter(player => player.Estado === 'Activo');
    
    Logger.log(`Procesando cobro para ${activePlayers.length} jugadores activos`);
    
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let processedCount = 0;
    let errorCount = 0;
    const results = [];
    
    activePlayers.forEach(player => {
      try {
        const monthlyFeeInfo = getPlayerMonthlyFee(player.ID);
        
        if (!monthlyFeeInfo) {
          Logger.log(`No se pudo obtener información de mensualidad para ${player.ID}`);
          errorCount++;
          return;
        }
        
        // Si es becado, no se cobra nada
        if (monthlyFeeInfo.type === 'becado') {
          Logger.log(`Jugador ${player.ID} es becado, no se cobra mensualidad`);
          processedCount++;
          return;
        }
        
        // Verificar si ya se cobró este mes
        const existingPayment = checkExistingMonthlyPayment(player.ID, currentMonth, currentYear);
        if (existingPayment) {
          Logger.log(`Jugador ${player.ID} ya tiene cobro para este mes`);
          processedCount++;
          return;
        }
        
        // Crear registro de cobro mensual
        const paymentRecord = {
          playerId: player.ID,
          playerName: `${player.Nombre} ${player.Apellidos}`,
          amount: monthlyFeeInfo.amount,
          type: 'Mensualidad',
          month: currentMonth + 1,
          year: currentYear,
          dueDate: new Date(currentYear, currentMonth, 1),
          status: 'Pendiente',
          description: `Mensualidad ${getMonthName(currentMonth)} ${currentYear} - ${monthlyFeeInfo.type}`
        };
        
        // Guardar en hoja de Pagos
        const success = createMonthlyPaymentRecord(paymentRecord);
        
        if (success) {
          processedCount++;
          results.push({
            playerId: player.ID,
            playerName: paymentRecord.playerName,
            amount: paymentRecord.amount,
            status: 'success'
          });
          Logger.log(`Cobro mensual creado para ${player.ID}: $${paymentRecord.amount}`);
        } else {
          errorCount++;
          results.push({
            playerId: player.ID,
            playerName: paymentRecord.playerName,
            amount: paymentRecord.amount,
            status: 'error'
          });
        }
        
      } catch (error) {
        Logger.log(`Error procesando jugador ${player.ID}: ${error.toString()}`);
        errorCount++;
      }
    });
    
    Logger.log(`=== COBRO MENSUAL COMPLETADO ===`);
    Logger.log(`Procesados: ${processedCount}, Errores: ${errorCount}`);
    
    // Registrar en logs
    logMonthlyBillingProcess(processedCount, errorCount, results);
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: activePlayers.length,
      results: results
    };
    
  } catch (error) {
    Logger.log('Error en cobro mensual automático: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Verifica si ya existe un cobro mensual para el jugador en el mes especificado
 */
function checkExistingMonthlyPayment(playerId, month, year) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      return false;
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Buscar columna de tipo de pago
    const typeColumnIndex = headers.findIndex(header => header === 'Tipo');
    const playerColumnIndex = headers.findIndex(header => header === 'Jugador ID');
    const dateColumnIndex = headers.findIndex(header => header === 'Fecha');
    
    if (typeColumnIndex === -1 || playerColumnIndex === -1 || dateColumnIndex === -1) {
      return false;
    }
    
    // Verificar si existe un pago de mensualidad para este jugador en este mes
    const existingPayment = data.find(row => {
      const rowPlayerId = row[playerColumnIndex];
      const rowType = row[typeColumnIndex];
      const rowDate = new Date(row[dateColumnIndex]);
      
      return rowPlayerId === playerId && 
             rowType === 'Mensualidad' &&
             rowDate.getMonth() === month &&
             rowDate.getFullYear() === year;
    });
    
    return !!existingPayment;
    
  } catch (error) {
    Logger.log('Error verificando pago mensual existente: ' + error.toString());
    return false;
  }
}

/**
 * Crea un registro de pago mensual en la hoja de Pagos
 */
function createMonthlyPaymentRecord(paymentRecord) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      paymentsSheet = ss.insertSheet('Pagos');
      setupPaymentsSheetHeaders();
    }
    
    // Generar ID único para el pago
    const paymentId = generatePaymentId();
    
    // Preparar datos para insertar
    const rowData = [
      paymentId,                                    // ID
      paymentRecord.playerId,                       // Jugador ID
      paymentRecord.playerName,                     // Jugador Nombre
      paymentRecord.amount,                         // Monto
      paymentRecord.type,                           // Tipo
      paymentRecord.description,                    // Descripción
      paymentRecord.dueDate,                        // Fecha de Vencimiento
      paymentRecord.status,                         // Estado
      '',                                           // Fecha de Pago
      '',                                           // Método de Pago
      '',                                           // Comprobante
      paymentRecord.month,                          // Mes
      paymentRecord.year,                           // Año
      new Date(),                                   // Fecha de Creación
      'Sistema Automático'                          // Creado por
    ];
    
    // Insertar en la hoja
    paymentsSheet.appendRow(rowData);
    
    Logger.log(`Registro de pago mensual creado: ${paymentId}`);
    return true;
    
  } catch (error) {
    Logger.log('Error creando registro de pago mensual: ' + error.toString());
    return false;
  }
}

/**
 * Configura los headers de la hoja de Pagos
 */
function setupPaymentsSheetHeaders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      paymentsSheet = ss.insertSheet('Pagos');
    }
    
    const headers = [
      'ID',
      'Jugador ID',
      'Jugador Nombre',
      'Monto',
      'Tipo',
      'Descripción',
      'Fecha de Vencimiento',
      'Estado',
      'Fecha de Pago',
      'Método de Pago',
      'Comprobante',
      'Mes',
      'Año',
      'Fecha de Creación',
      'Creado por'
    ];
    
    // Limpiar hoja y agregar headers
    paymentsSheet.clear();
    paymentsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Formatear headers
    const headerRange = paymentsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    
    Logger.log('Headers de la hoja de Pagos configurados');
    
  } catch (error) {
    Logger.log('Error configurando headers de pagos: ' + error.toString());
  }
}

/**
 * Genera un ID único para pagos
 */
function generatePaymentId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `PAY_${timestamp}_${random}`;
}

/**
 * Obtiene el nombre del mes
 */
function getMonthName(monthIndex) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthIndex];
}

/**
 * Registra el proceso de cobro mensual en logs
 */
function logMonthlyBillingProcess(processed, errors, results) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.getRange(1, 1, 1, 4).setValues([['Tipo', 'Detalle', 'Fecha', 'Datos']]);
    }
    
    const detail = `Cobro mensual automático: ${processed} procesados, ${errors} errores`;
    const data = JSON.stringify(results);
    
    logsSheet.appendRow([
      'monthly_billing',
      detail,
      new Date(),
      data
    ]);
    
  } catch (error) {
    Logger.log('Error registrando proceso de cobro mensual: ' + error.toString());
  }
}

/**
 * Registra un cambio de mensualidad personalizada
 */
function logPlayerMonthlyFeeChange(playerId, newFee) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.getRange(1, 1, 1, 4).setValues([['Tipo', 'Jugador ID', 'Detalle', 'Fecha']]);
    }
    
    logsSheet.appendRow([
      'monthly_fee_change',
      playerId,
      `Mensualidad personalizada actualizada a $${newFee}`,
      new Date()
    ]);
    
  } catch (error) {
    Logger.log('Error registrando cambio de mensualidad: ' + error.toString());
  }
}

/**
 * Obtiene el historial de generación de mensualidades (últimos 12 meses)
 */
function getMonthlyBillingHistory() {
  try {
    Logger.log('=== OBTENIENDO HISTORIAL DE GENERACIÓN DE MENSUALIDADES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      Logger.log('⚠️ No existe hoja de Logs');
      return {
        success: true,
        history: []
      };
    }
    
    const data = logsSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('⚠️ No hay logs registrados');
      return {
        success: true,
        history: []
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Filtrar solo logs de tipo 'monthly_billing'
    const billingLogs = rows
      .filter(row => row[0] === 'monthly_billing')
      .map(row => {
        let resultados = [];
        try {
          resultados = JSON.parse(row[3] || '[]');
        } catch (e) {
          resultados = [];
        }
        
        return {
          tipo: row[0],
          detalle: row[1],
          fecha: row[2] instanceof Date ? row[2].toISOString() : String(row[2]),
          resultados: resultados
        };
      })
      .reverse() // Más recientes primero
      .slice(0, 12); // Últimos 12 registros
    
    Logger.log(`✅ ${billingLogs.length} registros de generación encontrados`);
    
    return {
      success: true,
      history: billingLogs
    };
    
  } catch (error) {
    Logger.log('❌ Error obteniendo historial de mensualidades: ' + error.toString());
    return {
      success: false,
      message: error.toString(),
      history: []
    };
  }
}

/**
 * CREAR JUGADOR CON TODOS LOS DATOS (Incluye tutor y archivos)
 * Función completa que simula el proceso del formulario pero manualmente
 */
function createPlayerWithFullData(playerData) {
  try {
    Logger.log('=== CREANDO JUGADOR CON DATOS COMPLETOS ===');
    Logger.log('Datos recibidos:', JSON.stringify(playerData, null, 2));
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    // Asegurar que existan las columnas para URLs de cédulas
    ensureCedulaColumnsExist(playersSheet);
    
    // Generar ID único para el jugador
    const playerId = 'PLR_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Procesar y subir archivos de cédula a Google Drive
    let playerCedulaUrl = '';
    let tutorCedulaUrl = '';
    
    if (playerData.playerCedulaFileData) {
      const playerFileResult = uploadCedulaFile(playerData.playerCedulaFileData, playerId, 'jugador');
      if (playerFileResult.success) {
        playerCedulaUrl = playerFileResult.url;
      }
    }
    
    if (playerData.tutorCedulaFileData) {
      const tutorFileResult = uploadCedulaFile(playerData.tutorCedulaFileData, playerId, 'tutor');
      if (tutorFileResult.success) {
        tutorCedulaUrl = tutorFileResult.url;
      }
    }
    
    // Generar ID de familia basado en cédula del tutor
    const familyId = playerData.tutorCedula ? `FAM_${playerData.tutorCedula}` : '';
    
    // Preparar fila de jugador (según estructura de la hoja Jugadores)
    const playerRow = [
      playerId,                           // A - ID
      playerData.name,                    // B - Nombre
      playerData.lastName,                // C - Apellidos
      parseInt(playerData.age),           // D - Edad
      playerData.cedula,                  // E - Cédula
      playerData.phone || '',             // F - Teléfono
      playerData.category,                // G - Categoría
      playerData.state || 'Activo',       // H - Estado
      new Date(),                         // I - Fecha Registro
      playerData.tutorName,               // J - Tutor
      playerData.tutorEmail,              // K - Email Tutor
      playerData.tutorAddress,            // L - Dirección
      familyId,                           // M - Familia ID
      playerData.type || 'normal',        // N - Tipo
      0,                                  // O - Descuento %
      playerData.observations || '',      // P - Observaciones
      playerData.birthdate || '',         // Q - Fecha Nacimiento
      playerData.gender,                  // R - Género
      '',                                 // S - Método Pago Preferido
      playerData.tutorCedula,             // T - Cédula Tutor
      '',                                 // U - Mensualidad Personalizada
      playerCedulaUrl,                    // V - URL Cédula Jugador
      tutorCedulaUrl                      // W - URL Cédula Tutor
    ];
    
    playersSheet.appendRow(playerRow);
    SpreadsheetApp.flush();
    
    Logger.log(`✅ Jugador creado: ${playerId}`);
    
    // Registrar matrícula si no es becado
    if (playerData.type !== 'becado' && playerData.state === 'Activo') {
      registerEnrollmentFee(playerId, false);
    }
    
    return {
      success: true,
      message: 'Jugador creado exitosamente',
      playerId: playerId,
      filesUploaded: {
        playerCedula: !!playerCedulaUrl,
        tutorCedula: !!tutorCedulaUrl
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error creando jugador: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * FUNCIÓN DE DEBUG PARA updatePlayer
 */
function debugUpdatePlayer() {
  try {
    Logger.log('=== DEBUG: Verificando estructura de updatePlayer ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      Logger.log('❌ Hoja "Jugadores" no encontrada');
      return { success: false, message: 'Hoja no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Log individual de cada header
    Logger.log('📋 Headers encontrados (' + headers.length + ' columnas):');
    headers.forEach((header, index) => {
      Logger.log('   Columna ' + (index + 1) + ': ' + header);
    });
    
    // Verificar índices de columnas clave
    const nombreIdx = headers.indexOf('Nombre');
    const apellidosIdx = headers.indexOf('Apellidos');
    const cedulaIdx = headers.indexOf('Cédula');
    const telefonoIdx = headers.indexOf('Teléfono');
    const tipoIdx = headers.indexOf('Tipo'); // La columna se llama "Tipo", no "Tipo de Jugador"
    const descuentoIdx = headers.indexOf('Descuento %');
    const observacionesIdx = headers.indexOf('Observaciones');
    
    Logger.log('🔍 Índices de columnas:');
    Logger.log('   Nombre: ' + nombreIdx);
    Logger.log('   Apellidos: ' + apellidosIdx);
    Logger.log('   Cédula: ' + cedulaIdx);
    Logger.log('   Teléfono: ' + telefonoIdx);
    Logger.log('   Tipo: ' + tipoIdx);
    Logger.log('   Descuento %: ' + descuentoIdx);
    Logger.log('   Observaciones: ' + observacionesIdx);
    
    // Verificar si hay datos
    Logger.log('📊 Total de filas de datos: ' + (data.length - 1));
    
    return { success: true, headers: headers, indices: { nombreIdx, apellidosIdx, cedulaIdx, telefonoIdx, tipoIdx, descuentoIdx, observacionesIdx } };
    
  } catch (error) {
    Logger.log('❌ Error en debug: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ACTUALIZAR JUGADOR (versión simple para edición de perfil)
 */
function updatePlayer(playerData) {
  try {
    Logger.log('=== ACTUALIZANDO JUGADOR ===');
    Logger.log('Player Data recibido:', playerData);
    Logger.log('Tipo de playerData:', typeof playerData);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      Logger.log('❌ Hoja de Jugadores no encontrada');
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('📊 Total de filas en hoja:', rows.length);
    Logger.log('📋 Headers:', headers);
    
    // Buscar jugador por ID
    Logger.log('🔍 Buscando jugador con ID:', playerData.id);
    const playerRowIndex = rows.findIndex(row => String(row[0]) === String(playerData.id));
    
    if (playerRowIndex === -1) {
      Logger.log('❌ Jugador no encontrado con ID:', playerData.id);
      // Mostrar algunos IDs para debug
      Logger.log('📋 Primeros 5 IDs en la hoja:', rows.slice(0, 5).map(row => row[0]));
      return { success: false, message: 'Jugador no encontrado' };
    }
    
    Logger.log('✅ Jugador encontrado en fila:', playerRowIndex);
    
    const rowNumber = playerRowIndex + 2; // +2 porque slice(1) y las filas empiezan en 1
    
    // Actualizar campos usando los headers dinámicos
    const nombreIdx = headers.indexOf('Nombre');
    const apellidosIdx = headers.indexOf('Apellidos');
    const cedulaIdx = headers.indexOf('Cédula');
    const telefonoIdx = headers.indexOf('Teléfono');
    const tipoIdx = headers.indexOf('Tipo'); // La columna se llama "Tipo", no "Tipo de Jugador"
    const descuentoIdx = headers.indexOf('Descuento %');
    const observacionesIdx = headers.indexOf('Observaciones');
    const tutorIdx = headers.indexOf('Tutor');
    const emailTutorIdx = headers.indexOf('Email Tutor');
    const direccionIdx = headers.indexOf('Dirección');
    const direccionAltIdx = headers.indexOf('Direccion');
    const familiaIdIdx = headers.indexOf('Familia ID');
    const metodoPagoIdx = headers.indexOf('Método Pago Preferido');
    const metodoPagoAltIdx = headers.indexOf('Metodo Pago Preferido');
    const cedulaTutorIdx = headers.indexOf('Cédula Tutor');
    const telefonoTutorIdx = headers.indexOf('Teléfono Tutor');
    const telefonoTutorAltIdx = headers.indexOf('Telefono Tutor');
    const urlCedulaJugadorIdx = headers.indexOf('URL Cédula Jugador');
    const urlCedulaTutorIdx = headers.indexOf('URL Cédula Tutor');
    
    Logger.log('🔍 Índices de columnas encontrados:', {
      nombreIdx, apellidosIdx, cedulaIdx, telefonoIdx, tipoIdx, descuentoIdx, observacionesIdx,
      tutorIdx, emailTutorIdx, direccionIdx, direccionAltIdx, familiaIdIdx, metodoPagoIdx,
      metodoPagoAltIdx, cedulaTutorIdx, telefonoTutorIdx, telefonoTutorAltIdx, urlCedulaJugadorIdx, urlCedulaTutorIdx
    });
    
    // Actualizar cada campo si existe
    if (playerData.nombre && nombreIdx !== -1) {
      Logger.log('📝 Actualizando Nombre:', playerData.nombre);
      playersSheet.getRange(rowNumber, nombreIdx + 1).setValue(playerData.nombre);
    }
    
    if (playerData.apellidos && apellidosIdx !== -1) {
      Logger.log('📝 Actualizando Apellidos:', playerData.apellidos);
      playersSheet.getRange(rowNumber, apellidosIdx + 1).setValue(playerData.apellidos);
    }
    
    if (playerData.cedula && cedulaIdx !== -1) {
      Logger.log('📝 Actualizando Cédula:', playerData.cedula);
      playersSheet.getRange(rowNumber, cedulaIdx + 1).setValue(playerData.cedula);
    }
    
    if (playerData.telefono && telefonoIdx !== -1) {
      Logger.log('📝 Actualizando Teléfono:', playerData.telefono);
      playersSheet.getRange(rowNumber, telefonoIdx + 1).setValue(playerData.telefono);
    }
    
    if (playerData.tipo && tipoIdx !== -1) {
      Logger.log('📝 Actualizando Tipo:', playerData.tipo);
      playersSheet.getRange(rowNumber, tipoIdx + 1).setValue(playerData.tipo);
    }
    
    if (playerData.descuento !== undefined && descuentoIdx !== -1) {
      Logger.log('📝 Actualizando Descuento:', playerData.descuento);
      playersSheet.getRange(rowNumber, descuentoIdx + 1).setValue(playerData.descuento);
    }
    
    if (playerData.observaciones !== undefined && observacionesIdx !== -1) {
      Logger.log('📝 Actualizando Observaciones:', playerData.observaciones);
      playersSheet.getRange(rowNumber, observacionesIdx + 1).setValue(playerData.observaciones);
    }

    if (playerData.tutor !== undefined && tutorIdx !== -1) {
      Logger.log('📝 Actualizando Tutor:', playerData.tutor);
      playersSheet.getRange(rowNumber, tutorIdx + 1).setValue(playerData.tutor || '');
    }

    if (playerData.emailTutor !== undefined && emailTutorIdx !== -1) {
      Logger.log('📝 Actualizando Email Tutor:', playerData.emailTutor);
      playersSheet.getRange(rowNumber, emailTutorIdx + 1).setValue(playerData.emailTutor || '');
    }

    const direccionTargetIdx = direccionIdx !== -1 ? direccionIdx : direccionAltIdx;
    if (playerData.direccion !== undefined && direccionTargetIdx !== -1) {
      Logger.log('📝 Actualizando Dirección:', playerData.direccion);
      playersSheet.getRange(rowNumber, direccionTargetIdx + 1).setValue(playerData.direccion || '');
    }

    if (playerData.familiaId !== undefined && familiaIdIdx !== -1) {
      Logger.log('📝 Actualizando Familia ID:', playerData.familiaId);
      playersSheet.getRange(rowNumber, familiaIdIdx + 1).setValue(playerData.familiaId || '');
    }

    const metodoTargetIdx = metodoPagoIdx !== -1 ? metodoPagoIdx : metodoPagoAltIdx;
    if (playerData.metodoPago !== undefined && metodoTargetIdx !== -1) {
      Logger.log('📝 Actualizando Método Pago Preferido:', playerData.metodoPago);
      playersSheet.getRange(rowNumber, metodoTargetIdx + 1).setValue(playerData.metodoPago || '');
    }

    if (playerData.cedulaTutor !== undefined && cedulaTutorIdx !== -1) {
      Logger.log('📝 Actualizando Cédula Tutor:', playerData.cedulaTutor);
      playersSheet.getRange(rowNumber, cedulaTutorIdx + 1).setValue(playerData.cedulaTutor || '');
    }

    const telefonoTutorTargetIdx = telefonoTutorIdx !== -1 ? telefonoTutorIdx : telefonoTutorAltIdx;
    if (playerData.telefonoTutor !== undefined && telefonoTutorTargetIdx !== -1) {
      Logger.log('📝 Actualizando Teléfono Tutor:', playerData.telefonoTutor);
      playersSheet.getRange(rowNumber, telefonoTutorTargetIdx + 1).setValue(playerData.telefonoTutor || '');
    }

    if (playerData.urlCedulaJugador !== undefined && urlCedulaJugadorIdx !== -1) {
      Logger.log('📝 Actualizando URL Cédula Jugador:', playerData.urlCedulaJugador);
      playersSheet.getRange(rowNumber, urlCedulaJugadorIdx + 1).setValue(playerData.urlCedulaJugador || '');
    }

    if (playerData.urlCedulaTutor !== undefined && urlCedulaTutorIdx !== -1) {
      Logger.log('📝 Actualizando URL Cédula Tutor:', playerData.urlCedulaTutor);
      playersSheet.getRange(rowNumber, urlCedulaTutorIdx + 1).setValue(playerData.urlCedulaTutor || '');
    }
    
    SpreadsheetApp.flush();
    
    Logger.log('✅ Jugador actualizado exitosamente');
    return { success: true, message: 'Jugador actualizado exitosamente' };
    
  } catch (error) {
    Logger.log('❌ Error actualizando jugador:', error.toString());
    Logger.log('Stack trace:', error.stack);
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

/**
 * ACTUALIZAR JUGADOR CON DATOS COMPLETOS
 */
function updatePlayerWithFullData(playerId, playerData) {
  try {
    Logger.log('=== ACTUALIZANDO JUGADOR CON DATOS COMPLETOS ===');
    Logger.log('Player ID:', playerId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Buscar jugador
    const playerRowIndex = rows.findIndex(row => String(row[0]) === String(playerId));
    
    if (playerRowIndex === -1) {
      return { success: false, message: 'Jugador no encontrado' };
    }
    
    const rowNumber = playerRowIndex + 2; // +2 porque slice(1) y las filas empiezan en 1
    
    // Actualizar campos
    if (playerData.name) playersSheet.getRange(rowNumber, 2).setValue(playerData.name);
    if (playerData.lastName) playersSheet.getRange(rowNumber, 3).setValue(playerData.lastName);
    if (playerData.age) playersSheet.getRange(rowNumber, 4).setValue(parseInt(playerData.age));
    if (playerData.cedula) playersSheet.getRange(rowNumber, 5).setValue(playerData.cedula);
    if (playerData.phone !== undefined) playersSheet.getRange(rowNumber, 6).setValue(playerData.phone);
    if (playerData.category) playersSheet.getRange(rowNumber, 7).setValue(playerData.category);
    if (playerData.state) playersSheet.getRange(rowNumber, 8).setValue(playerData.state);
    if (playerData.tutorName) playersSheet.getRange(rowNumber, 10).setValue(playerData.tutorName);
    if (playerData.tutorEmail) playersSheet.getRange(rowNumber, 11).setValue(playerData.tutorEmail);
    if (playerData.tutorAddress) playersSheet.getRange(rowNumber, 12).setValue(playerData.tutorAddress);
    if (playerData.type) playersSheet.getRange(rowNumber, 14).setValue(playerData.type);
    if (playerData.observations !== undefined) playersSheet.getRange(rowNumber, 16).setValue(playerData.observations);
    if (playerData.birthdate) playersSheet.getRange(rowNumber, 17).setValue(playerData.birthdate);
    if (playerData.gender) playersSheet.getRange(rowNumber, 18).setValue(playerData.gender);
    if (playerData.tutorCedula) playersSheet.getRange(rowNumber, 20).setValue(playerData.tutorCedula);
    
    // Actualizar familia ID si cambió la cédula del tutor
    if (playerData.tutorCedula) {
      const familyId = `FAM_${playerData.tutorCedula}`;
      playersSheet.getRange(rowNumber, 13).setValue(familyId);
    }
    
    SpreadsheetApp.flush();
    
    Logger.log('✅ Jugador actualizado exitosamente');
    
    return {
      success: true,
      message: 'Jugador actualizado exitosamente'
    };
    
  } catch (error) {
    Logger.log('❌ Error actualizando jugador: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * ASEGURAR QUE EXISTAN LAS COLUMNAS PARA URLs DE CÉDULAS
 */
function ensureCedulaColumnsExist(playersSheet) {
  try {
    const headers = playersSheet.getRange(1, 1, 1, playersSheet.getLastColumn()).getValues()[0];
    
    const expectedHeaders = [
      'URL Cédula Jugador',   // Columna V (índice 21)
      'URL Cédula Tutor'      // Columna W (índice 22)
    ];
    
    let columnsAdded = false;
    
    // Verificar si existen las columnas
    if (!headers.includes('URL Cédula Jugador')) {
      const nextCol = headers.length + 1;
      playersSheet.getRange(1, nextCol).setValue('URL Cédula Jugador');
      Logger.log('✅ Columna "URL Cédula Jugador" agregada en posición ' + nextCol);
      columnsAdded = true;
    }
    
    if (!headers.includes('URL Cédula Tutor')) {
      const nextCol = headers.length + 1;
      playersSheet.getRange(1, nextCol).setValue('URL Cédula Tutor');
      Logger.log('✅ Columna "URL Cédula Tutor" agregada en posición ' + nextCol);
      columnsAdded = true;
    }
    
    if (columnsAdded) {
      SpreadsheetApp.flush();
    }
    
    return true;
    
  } catch (error) {
    Logger.log('⚠️ Error verificando columnas: ' + error.toString());
    return false;
  }
}

/**
 * SUBIR ARCHIVO DE CÉDULA A GOOGLE DRIVE
 */
function uploadCedulaFile(fileData, playerId, type) {
  try {
    Logger.log(`Subiendo archivo de cédula ${type} para jugador ${playerId}`);
    
    // Crear o obtener carpeta de cédulas
    const rootFolder = DriveApp.getRootFolder();
    let cedulasFolder;
    
    const folders = rootFolder.getFoldersByName('Cédulas');
    if (folders.hasNext()) {
      cedulasFolder = folders.next();
    } else {
      cedulasFolder = rootFolder.createFolder('Cédulas');
    }
    
    // Decodificar base64
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileData.data),
      fileData.mimeType,
      `${playerId}_cedula_${type}_${fileData.name}`
    );
    
    // Subir archivo
    const file = cedulasFolder.createFile(blob);
    
    // Hacer el archivo accesible
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileUrl = file.getUrl();
    
    Logger.log(`✅ Archivo subido: ${fileUrl}`);
    
    return {
      success: true,
      url: fileUrl,
      fileId: file.getId()
    };
    
  } catch (error) {
    Logger.log(`❌ Error subiendo archivo: ${error.toString()}`);
    return {
      success: false,
      message: error.toString(),
      url: ''
    };
  }
}

/**
 * RETIRAR UN JUGADOR DEL PLANTEL
 * Marca al jugador como "Retirado" y registra la fecha de retiro
 */
function retirePlayer(playerId, reason = '') {
  try {
    Logger.log(`=== RETIRANDO JUGADOR: ${playerId} ===`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return {
        success: false,
        message: 'Hoja de Jugadores no encontrada'
      };
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Buscar jugador
    const playerRowIndex = rows.findIndex(row => String(row[0]) === String(playerId));
    
    if (playerRowIndex === -1) {
      return {
        success: false,
        message: 'Jugador no encontrado'
      };
    }
    
    const actualRowIndex = playerRowIndex + 2; // +1 por header, +1 por índice 0
    
    // Índices de columnas
    const estadoIdx = headers.indexOf('Estado');
    const observacionesIdx = headers.indexOf('Observaciones');
    
    // Actualizar estado a "Retirado"
    if (estadoIdx !== -1) {
      playersSheet.getRange(actualRowIndex, estadoIdx + 1).setValue('Retirado');
    }
    
    // Agregar observación con fecha de retiro
    if (observacionesIdx !== -1) {
      const currentObs = String(rows[playerRowIndex][observacionesIdx] || '');
      const retireDate = new Date().toLocaleDateString('es-ES');
      const retireNote = `[${retireDate}] Retirado del plantel${reason ? ': ' + reason : ''}`;
      const newObs = currentObs ? `${currentObs}\n${retireNote}` : retireNote;
      playersSheet.getRange(actualRowIndex, observacionesIdx + 1).setValue(newObs);
    }
    
    SpreadsheetApp.flush();
    
    Logger.log(`✅ Jugador ${playerId} retirado exitosamente`);
    
    return {
      success: true,
      message: 'Jugador retirado exitosamente',
      playerId: playerId
    };
    
  } catch (error) {
    Logger.log('❌ Error retirando jugador: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * REACTIVAR UN JUGADOR RETIRADO
 * Cambia el estado de "Retirado" a "Activo"
 */
function reactivatePlayer(playerId, reason = '') {
  try {
    Logger.log(`=== REACTIVANDO JUGADOR: ${playerId} ===`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return {
        success: false,
        message: 'Hoja de Jugadores no encontrada'
      };
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Buscar jugador
    const playerRowIndex = rows.findIndex(row => String(row[0]) === String(playerId));
    
    if (playerRowIndex === -1) {
      return {
        success: false,
        message: 'Jugador no encontrado'
      };
    }
    
    const actualRowIndex = playerRowIndex + 2;
    
    // Índices de columnas
    const estadoIdx = headers.indexOf('Estado');
    const observacionesIdx = headers.indexOf('Observaciones');
    
    // Actualizar estado a "Activo"
    if (estadoIdx !== -1) {
      playersSheet.getRange(actualRowIndex, estadoIdx + 1).setValue('Activo');
    }
    
    // Agregar observación con fecha de reactivación
    if (observacionesIdx !== -1) {
      const currentObs = String(rows[playerRowIndex][observacionesIdx] || '');
      const reactivateDate = new Date().toLocaleDateString('es-ES');
      const reactivateNote = `[${reactivateDate}] Reactivado${reason ? ': ' + reason : ''}`;
      const newObs = currentObs ? `${currentObs}\n${reactivateNote}` : reactivateNote;
      playersSheet.getRange(actualRowIndex, observacionesIdx + 1).setValue(newObs);
    }
    
    SpreadsheetApp.flush();
    
    Logger.log(`✅ Jugador ${playerId} reactivado exitosamente`);
    
    // Cobrar nueva matrícula al reactivar
    try {
      Logger.log('💰 Cobrando nueva matrícula al jugador reactivado...');
      const enrollmentResult = registerEnrollmentFee(playerId, false);
      
      if (enrollmentResult && enrollmentResult.success) {
        Logger.log('✅ Matrícula de reactivación cargada exitosamente');
      } else {
        Logger.log('⚠️ No se pudo cargar la matrícula de reactivación');
      }
    } catch (enrollmentError) {
      Logger.log('⚠️ Error al cargar matrícula de reactivación: ' + enrollmentError.toString());
      // No fallar la reactivación si falla el cobro de matrícula
    }
    
    return {
      success: true,
      message: 'Jugador reactivado exitosamente',
      playerId: playerId
    };
    
  } catch (error) {
    Logger.log('❌ Error reactivando jugador: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}
