/**
 * ========================================
 * ARCHIVO: FamilyManager.gs
 * DESCRIPCIÓN: Gestión de grupos familiares
 * FUNCIONES: Detalles de familia, pagos grupales, historial familiar
 * ========================================
 */

/**
 * Helpers
 */
function sanitizeTutorName(value) {
  if (!value && value !== 0) {
    return '';
  }

  if (value instanceof Date) {
    return '';
  }

  const str = String(value).trim();
  if (!str) {
    return '';
  }

  if (/GMT|UTC/.test(str) && /\d{4}/.test(str)) {
    return '';
  }

  if (/^pendiente$/i.test(str)) {
    return '';
  }

  return str;
}

function slugify(value) {
  if (!value && value !== 0) {
    return '';
  }

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

function generateUniqueFamilyId(base, usedIds) {
  const sanitizedBase = slugify(base) || 'AUTO';
  let candidate = sanitizedBase.startsWith('FAM_') ? sanitizedBase : `FAM_${sanitizedBase}`;
  let counter = 1;

  while (usedIds.has(candidate)) {
    counter += 1;
    candidate = `${sanitizedBase.startsWith('FAM_') ? sanitizedBase : `FAM_${sanitizedBase}`}_${counter}`;
  }

  usedIds.add(candidate);
  return candidate;
}

function buildFamilyDisplayName(tutorName, tutorCedula) {
  const sanitized = sanitizeTutorName(tutorName);
  if (sanitized) {
    return sanitized;
  }

  if (tutorCedula) {
    return `Tutor ${tutorCedula}`;
  }

  return 'Tutor sin nombre';
}


function extractTutorNameFromRow(row, headers) {
  // Intentar columna "Tutor" directa
  const tutorIdx = headers.indexOf('Tutor');
  if (tutorIdx !== -1) {
    const direct = sanitizeTutorName(row[tutorIdx]);
    if (direct) {
      return direct;
    }
  }

  // Buscar otras columnas que contengan "tutor" y "nombre"
  const lowerHeaders = headers.map(header => String(header || '').toLowerCase());
  for (let i = 0; i < lowerHeaders.length; i += 1) {
    const header = lowerHeaders[i];
    if (!header) {
      continue;
    }

    const containsTutor = header.indexOf('tutor') !== -1;
    const containsPadre = header.indexOf('padre') !== -1;
    const containsNombre = header.indexOf('nombre') !== -1;

    if ((containsTutor && containsNombre) || (containsPadre && containsNombre)) {
      const value = sanitizeTutorName(row[i]);
      if (value) {
        return value;
      }
    }
  }

  return '';
}

/**
 * OBTENER DETALLES COMPLETOS DE UNA FAMILIA
 * Busca por familyId O por cédula del tutor (si familyId está vacío o es generado)
 */
function getFamilyDetails(familyId) {
  try {
    Logger.log('=== OBTENIENDO DETALLES DE FAMILIA ===');
    Logger.log('Familia ID:', familyId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: false, message: 'No hay jugadores en el sistema' };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Obtener índices de columnas
    const familyIdIdx = headers.indexOf('Familia ID');
    const cedulaTutorIdx = headers.indexOf('Cédula Tutor');
    const tutorIdx = headers.indexOf('Tutor');
    const estadoIdx = headers.indexOf('Estado');
    
    // Extraer identificador del tutor si el familyId es del formato FAM_XXXX
    let searchKey = null;
    if (familyId && familyId.startsWith('FAM_')) {
      searchKey = familyId.substring(4).replace(/_/g, ' '); // Quitar "FAM_" y reemplazar guiones bajos con espacios
    }
    
    Logger.log('Buscando familia con key:', searchKey);
    Logger.log('Total de filas de jugadores:', rows.length);
    
    // Buscar todos los jugadores de esta familia
    const familyPlayers = [];
    let tutorInfo = null;
    let jugadoresRevisados = 0;
    let jugadoresActivos = 0;
    
    rows.forEach(row => {
      jugadoresRevisados++;
      const playerFamilyId = String(row[familyIdIdx] || '');
      const cedulaTutor = String(row[cedulaTutorIdx] || '').trim();
      const tutorName = String(row[tutorIdx] || '').trim().toLowerCase();
      const estado = String(row[estadoIdx] || '').toLowerCase();
      
      // Solo jugadores activos
      if (estado !== 'activo') {
        Logger.log(`Jugador #${jugadoresRevisados}: Estado "${estado}" - Omitido`);
        return;
      }
      
      jugadoresActivos++;
      
      // Buscar por:
      // 1. FamilyId exacto (si existe en la hoja)
      // 2. Por cédula del tutor (si searchKey coincide con cédula)
      // 3. Por nombre del tutor (comparación insensible a mayúsculas)
      const matchesFamilyId = playerFamilyId === familyId;
      const matchesCedula = searchKey && cedulaTutor === searchKey;
      const matchesName = searchKey && tutorName === searchKey.toLowerCase();
      
      Logger.log(`Comparando: tutorName="${tutorName}" con searchKey="${searchKey ? searchKey.toLowerCase() : 'null'}" - Match: ${matchesName}`);
      
      if (matchesFamilyId || matchesCedula || matchesName) {
        // Obtener el nombre original del tutor (no en minúsculas)
        const tutorNameOriginal = String(row[tutorIdx] || '').trim();
        
        const player = {
          'ID': String(row[0] || ''),
          'Nombre': String(row[1] || ''),
          'Apellidos': String(row[2] || ''),
          'Edad': row[3] || '',
          'Cédula': String(row[4] || ''),
          'Teléfono': row[5] || '',
          'Categoría': String(row[6] || ''),
          'Estado': String(row[7] || ''),
          'Fecha Registro': row[8] instanceof Date ? row[8].toISOString() : String(row[8] || ''),
          'Tutor': tutorNameOriginal,
          'Email Tutor': String(row[10] || ''),
          'Dirección': String(row[11] || ''),
          'Familia ID': playerFamilyId,
          'Tipo': String(row[13] || 'normal'),
          'Descuento %': row[14] || 0,
          'Observaciones': String(row[15] || ''),
          'Fecha Nacimiento': row[16] || '',
          'Género': String(row[17] || ''),
          'Método Pago Preferido': String(row[18] || ''),
          'Cédula Tutor': cedulaTutor,
          'Mensualidad Personalizada': row[20] || ''
        };
        
        familyPlayers.push(player);
        
        // Guardar info del tutor (es la misma para todos)
        if (!tutorInfo) {
          tutorInfo = {
            nombre: tutorNameOriginal,
            email: player['Email Tutor'],
            telefono: player['Teléfono'],
            direccion: player['Dirección'],
            cedula: player['Cédula Tutor']
          };
        }
      }
    });
    
    Logger.log(`Resumen de búsqueda:`);
    Logger.log(`- Jugadores revisados: ${jugadoresRevisados}`);
    Logger.log(`- Jugadores activos: ${jugadoresActivos}`);
    Logger.log(`- Jugadores encontrados en familia: ${familyPlayers.length}`);
    
    if (familyPlayers.length === 0) {
      Logger.log('❌ No se encontraron jugadores para esta familia');
      return { success: false, message: 'No se encontraron jugadores para esta familia. Verifica que los jugadores tengan estado "Activo" y que el nombre del tutor coincida exactamente.' };
    }
    
    Logger.log(`✅ Familia encontrada: ${familyPlayers.length} jugadores`);
    Logger.log('📊 Calculando mensualidad familiar total...');
    
    // Obtener configuración financiera actual
    const financialConfig = getFinancialConfig();
    const mensualidadIndividual = financialConfig.MONTHLY_FEE || 130;
    const mensualidadFamiliar = financialConfig.FAMILY_MONTHLY_FEE || 110.50;
    
    Logger.log(`📊 Configuración de precios: Individual=$${mensualidadIndividual}, Familiar=$${mensualidadFamiliar}`);
    
    const totalAmount = familyPlayers.reduce((sum, p, index) => {
          let mensualidad = 0;
          
          // 1. Si es becado, no paga nada
          if (p.Tipo === 'becado') {
            mensualidad = 0;
            Logger.log(`Jugador ${p.Nombre}: Becado → $0.00`);
          }
          // 2. Si tiene mensualidad personalizada, usar ese valor
          else if (p['Mensualidad Personalizada'] && parseFloat(p['Mensualidad Personalizada']) > 0) {
            mensualidad = parseFloat(p['Mensualidad Personalizada']);
            Logger.log(`Jugador ${p.Nombre}: Mensualidad Personalizada → $${mensualidad.toFixed(2)}`);
          }
          // 3. Si tiene descuento porcentual, aplicarlo al precio base correspondiente
          else if (p['Descuento %'] && parseFloat(p['Descuento %']) > 0) {
            const descuento = parseFloat(p['Descuento %']);
            // Determinar precio base según posición en familia
            const precioBase = index === 0 ? mensualidadIndividual : mensualidadFamiliar;
            mensualidad = precioBase * (1 - descuento / 100);
            Logger.log(`Jugador ${p.Nombre}: Descuento ${descuento}% sobre $${precioBase} → $${mensualidad.toFixed(2)}`);
          }
          // 4. Aplicar precio según posición en familia (primer jugador = individual, resto = familiar)
          else {
            mensualidad = index === 0 ? mensualidadIndividual : mensualidadFamiliar;
            Logger.log(`Jugador ${p.Nombre}: ${index === 0 ? 'Individual' : 'Familiar'} → $${mensualidad.toFixed(2)}`);
          }
          
          return sum + mensualidad;
        }, 0);
    
    Logger.log(`💰 Mensualidad Familiar Total: $${totalAmount.toFixed(2)}/mes`);
    
    return {
      success: true,
      family: {
        familyId: familyId,
        tutor: tutorInfo,
        players: familyPlayers,
        totalPlayers: familyPlayers.length,
        totalAmount: totalAmount
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error obteniendo detalles de familia: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * PROCESAR REEMBOLSO PARA UN PAGO CON DISCREPANCIA
 */
function processRefundForPayment(paymentData) {
  try {
    Logger.log('=== PROCESANDO REEMBOLSO ===');
    Logger.log('Datos del pago:', JSON.stringify(paymentData, null, 2));
    
    const { jugadorId, tipo, montoOriginal, montoCorrecto, montoReembolso, requiereReembolso, rowIndex } = paymentData;
    
    if (!requiereReembolso) {
      return { success: false, message: 'Este pago no requiere reembolso' };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      return { success: false, message: 'Hoja de Pagos no encontrada' };
    }
    
    // Obtener datos del jugador
    const playersSheet = ss.getSheetByName('Jugadores');
    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    const playersData = playersSheet.getDataRange().getValues();
    const playerHeaders = playersData[0];
    const playerRows = playersData.slice(1);
    
    const playerIdIdx = playerHeaders.indexOf('ID');
    const playerNameIdx = playerHeaders.indexOf('Nombre');
    const playerApellidosIdx = playerHeaders.indexOf('Apellidos');
    
    let playerName = 'Jugador Desconocido';
    playerRows.forEach(row => {
      if (String(row[playerIdIdx] || '') === jugadorId) {
        const nombre = String(row[playerNameIdx] || '');
        const apellidos = String(row[playerApellidosIdx] || '');
        playerName = `${nombre} ${apellidos}`.trim();
      }
    });
    
    const now = new Date();
    const fechaActual = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    if (montoOriginal > montoCorrecto) {
      // Pago excesivo - crear reembolso
      const reembolsoRow = [
        jugadorId,                    // Jugador ID
        `Reembolso - ${tipo}`,       // Tipo
        montoReembolso,              // Monto (positivo para reembolso)
        fechaActual,                 // Fecha
        'Reembolsado',               // Estado
        'Sistema',                   // Método Pago
        `Reembolso automático por pago excesivo. Original: $${montoOriginal}, Correcto: $${montoCorrecto}`, // Referencia
        now                          // Timestamp
      ];
      
      paymentsSheet.appendRow(reembolsoRow);
      
      // Actualizar el pago original para reflejar el monto correcto
      const paymentsData = paymentsSheet.getDataRange().getValues();
      const montoIdx = paymentsData[0].indexOf('Monto');
      
      if (montoIdx !== -1 && rowIndex && rowIndex <= paymentsData.length) {
        paymentsSheet.getRange(rowIndex, montoIdx + 1).setValue(montoCorrecto);
        Logger.log(`✅ Pago original actualizado a $${montoCorrecto} en fila ${rowIndex}`);
      }
      
      Logger.log(`✅ Reembolso creado: $${montoReembolso} para ${playerName}`);
      
      return {
        success: true,
        message: `Reembolso procesado exitosamente. Monto reembolsado: $${montoReembolso}`,
        reembolso: {
          monto: montoReembolso,
          tipo: 'Reembolso',
          jugador: playerName,
          fecha: fechaActual
        }
      };
      
    } else {
      // Pago insuficiente - crear pago adicional
      const pagoAdicionalRow = [
        jugadorId,                    // Jugador ID
        `Pago Adicional - ${tipo}`,  // Tipo
        montoReembolso,              // Monto faltante
        fechaActual,                 // Fecha
        'Pendiente',                 // Estado
        'Por Definir',               // Método Pago
        `Pago adicional requerido. Original: $${montoOriginal}, Total requerido: $${montoCorrecto}`, // Referencia
        now                          // Timestamp
      ];
      
      paymentsSheet.appendRow(pagoAdicionalRow);
      
      Logger.log(`✅ Pago adicional creado: $${montoReembolso} para ${playerName}`);
      
      return {
        success: true,
        message: `Pago adicional creado. Monto pendiente: $${montoReembolso}`,
        pagoAdicional: {
          monto: montoReembolso,
          tipo: 'Pago Adicional',
          jugador: playerName,
          fecha: fechaActual
        }
      };
    }
    
  } catch (error) {
    Logger.log('❌ Error procesando reembolso: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * VERIFICAR CÁLCULO DE MENSUALIDAD FAMILIAR
 */
function verifyFamilyMonthlyCalculation(familyId) {
  try {
    Logger.log('=== VERIFICANDO CÁLCULO DE MENSUALIDAD FAMILIAR ===');
    Logger.log('Familia ID:', familyId);
    
    // Obtener detalles de la familia
    const familyDetails = getFamilyDetails(familyId);
    
    if (!familyDetails.success) {
      return { success: false, message: familyDetails.message };
    }
    
    const family = familyDetails.family;
    const financialConfig = getFinancialConfig();
    
    const calculation = {
      familyId: familyId,
      totalPlayers: family.players.length,
      mensualidadIndividual: financialConfig.MONTHLY_FEE || 130,
      mensualidadFamiliar: financialConfig.FAMILY_MONTHLY_FEE || 110.50,
      players: [],
      totalCalculated: 0
    };
    
    // Calcular mensualidad de cada jugador
    family.players.forEach((player, index) => {
      let mensualidad = 0;
      let razon = '';
      
      if (player.Tipo === 'becado') {
        mensualidad = 0;
        razon = 'Becado';
      } else if (player['Mensualidad Personalizada'] && parseFloat(player['Mensualidad Personalizada']) > 0) {
        mensualidad = parseFloat(player['Mensualidad Personalizada']);
        razon = `Personalizada (${mensualidad})`;
      } else if (player['Descuento %'] && parseFloat(player['Descuento %']) > 0) {
        const descuento = parseFloat(player['Descuento %']);
        const precioBase = index === 0 ? calculation.mensualidadIndividual : calculation.mensualidadFamiliar;
        mensualidad = precioBase * (1 - descuento / 100);
        razon = `Descuento ${descuento}% sobre $${precioBase}`;
      } else {
        mensualidad = index === 0 ? calculation.mensualidadIndividual : calculation.mensualidadFamiliar;
        razon = index === 0 ? 'Individual' : 'Familiar';
      }
      
      calculation.players.push({
        nombre: `${player.Nombre} ${player.Apellidos}`,
        posicion: index + 1,
        tipo: player.Tipo,
        mensualidadPersonalizada: player['Mensualidad Personalizada'],
        descuento: player['Descuento %'],
        mensualidad: mensualidad,
        razon: razon
      });
      
      calculation.totalCalculated += mensualidad;
    });
    
    Logger.log('📊 Cálculo detallado:', JSON.stringify(calculation, null, 2));
    
    return {
      success: true,
      calculation: calculation,
      message: `Cálculo verificado. Total: $${calculation.totalCalculated.toFixed(2)}/mes`
    };
    
  } catch (error) {
    Logger.log('❌ Error verificando cálculo familiar: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * VERIFICAR PRECIOS ACTUALES DE CONFIGURACIÓN
 */
function verifyCurrentPrices() {
  try {
    Logger.log('=== VERIFICANDO PRECIOS ACTUALES ===');
    
    const financialConfig = getFinancialConfig();
    const systemConfig = SYSTEM_CONFIG.FINANCIAL;
    
    const prices = {
      matricula: {
        configurado: financialConfig.ENROLLMENT_FEE,
        porDefecto: systemConfig.ENROLLMENT_FEE,
        fuente: financialConfig.ENROLLMENT_FEE ? 'Configuración Personalizada' : 'Valor por Defecto'
      },
      mensualidad: {
        configurado: financialConfig.MONTHLY_FEE,
        porDefecto: systemConfig.MONTHLY_FEE,
        fuente: financialConfig.MONTHLY_FEE ? 'Configuración Personalizada' : 'Valor por Defecto'
      },
      mensualidadFamiliar: {
        configurado: financialConfig.FAMILY_MONTHLY_FEE,
        porDefecto: systemConfig.FAMILY_MONTHLY_FEE,
        fuente: financialConfig.FAMILY_MONTHLY_FEE ? 'Configuración Personalizada' : 'Valor por Defecto'
      }
    };
    
    Logger.log('📊 PRECIOS ACTUALES:');
    Logger.log(`🎓 Matrícula: $${prices.matricula.configurado} (${prices.matricula.fuente})`);
    Logger.log(`📅 Mensualidad: $${prices.mensualidad.configurado} (${prices.mensualidad.fuente})`);
    Logger.log(`👨‍👩‍👧‍👦 Mensualidad Familiar: $${prices.mensualidadFamiliar.configurado} (${prices.mensualidadFamiliar.fuente})`);
    
    return {
      success: true,
      prices: prices,
      message: `Precios verificados. Matrícula: $${prices.matricula.configurado}, Mensualidad: $${prices.mensualidad.configurado}`
    };
    
  } catch (error) {
    Logger.log('❌ Error verificando precios: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * OBTENER HISTORIAL DE PAGOS DE TODA LA FAMILIA
 */
function getFamilyPaymentHistory(familyId) {
  try {
    Logger.log('=== OBTENIENDO HISTORIAL FAMILIAR ===');
    Logger.log('Familia ID:', familyId);
    
    // Primero obtener los detalles de la familia
    const familyDetails = getFamilyDetails(familyId);
    
    if (!familyDetails.success) {
      return familyDetails;
    }
    
    const family = familyDetails.family;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      return {
        success: true,
        family: family,
        payments: [],
        totals: {
          pagado: 0,
          pendiente: 0,
          cobrosExtras: 0,
          total: 0
        }
      };
    }
    
    const paymentsData = paymentsSheet.getDataRange().getValues();
    
    if (paymentsData.length <= 1) {
      return {
        success: true,
        family: family,
        payments: [],
        totals: {
          pagado: 0,
          pendiente: 0,
          cobrosExtras: 0,
          total: 0
        }
      };
    }
    
    const headers = paymentsData[0];
    const rows = paymentsData.slice(1);
    
    // Obtener IDs de todos los jugadores de la familia
    const playerIds = family.players.map(p => p.ID);
    Logger.log('IDs de jugadores en la familia:', playerIds);
    
    // Buscar pagos de cualquier jugador de la familia
    const familyPayments = [];
    let totalPagado = 0;
    let totalPendiente = 0;
    let totalCobrosExtras = 0;
    
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const montoIdx = headers.indexOf('Monto');
    const fechaIdx = headers.indexOf('Fecha');
    const estadoIdx = headers.indexOf('Estado');
    const referenciaIdx = headers.indexOf('Referencia');
    const metodoIdx = headers.indexOf('Método Pago');
    
    rows.forEach(row => {
      const jugadorId = String(row[jugadorIdIdx] || '');
      
      if (playerIds.includes(jugadorId)) {
        const monto = parseFloat(row[montoIdx] || 0);
        const estado = String(row[estadoIdx] || '');
        const referencia = String(row[referenciaIdx] || '');
        const tipo = String(row[tipoIdx] || '');
        
        // Encontrar nombre del jugador
        const player = family.players.find(p => p.ID === jugadorId);
        const playerName = player ? `${player.Nombre} ${player.Apellidos}` : jugadorId;
        
        // Calcular monto correcto del jugador según el tipo de pago
        let montoCorrecto = 130;
        let advertencia = '';
        let requiereReembolso = false;
        let montoReembolso = 0;
        let montoCorrectoFinal = 0;
        
        if (player && (tipo === 'Mensualidad' || tipo === 'Matrícula')) {
          // Obtener configuración financiera actual
          const financialConfig = getFinancialConfig();
          
          if (tipo === 'Matrícula') {
            // Para matrículas, usar el precio de configuración
            const precioMatricula = financialConfig.ENROLLMENT_FEE || 130;
            montoCorrecto = precioMatricula;
            
            // Si tiene descuento en matrícula, aplicarlo
            if (player['Descuento %'] && parseFloat(player['Descuento %']) > 0) {
              const descuento = parseFloat(player['Descuento %']);
              montoCorrecto = precioMatricula * (1 - descuento / 100);
            }
          } else if (tipo === 'Mensualidad') {
            // Para mensualidades, usar la lógica completa
            const precioMensualidad = financialConfig.MONTHLY_FEE || 130;
            
            // 1. Si es becado → $0
            if (player.Tipo === 'becado') {
              montoCorrecto = 0;
            }
            // 2. Si tiene mensualidad personalizada → usar ese valor
            else if (player['Mensualidad Personalizada'] && parseFloat(player['Mensualidad Personalizada']) > 0) {
              montoCorrecto = parseFloat(player['Mensualidad Personalizada']);
            }
            // 3. Si tiene descuento % → aplicar al precio base
            else if (player['Descuento %'] && parseFloat(player['Descuento %']) > 0) {
              const descuento = parseFloat(player['Descuento %']);
              montoCorrecto = precioMensualidad * (1 - descuento / 100);
            }
            // 4. Por defecto → precio base de configuración
            else {
              montoCorrecto = precioMensualidad;
            }
          }
          
          // Comparar monto del pago con monto correcto
          const diferencia = Math.abs(monto - montoCorrecto);
          if (diferencia > 0.01) { // Tolerancia de 1 centavo por redondeo
            requiereReembolso = true;
            
            if (monto > montoCorrecto) {
              // Pago excesivo - requiere reembolso
              montoReembolso = monto - montoCorrecto;
              montoCorrectoFinal = montoCorrecto;
              advertencia = `⚠️ Pago excesivo. Reembolso requerido: $${montoReembolso.toFixed(2)}`;
            } else {
              // Pago insuficiente - requiere pago adicional
              montoReembolso = montoCorrecto - monto;
              montoCorrectoFinal = montoCorrecto;
              advertencia = `⚠️ Pago insuficiente. Falta: $${montoReembolso.toFixed(2)}`;
            }
            
            Logger.log(`⚠️ ALERTA: ${tipo} de ${playerName} tiene monto $${monto} pero debería ser $${montoCorrecto.toFixed(2)}`);
            Logger.log(`   Tipo jugador: ${player.Tipo}, Mensualidad Personalizada: ${player['Mensualidad Personalizada']}, Descuento: ${player['Descuento %']}%`);
            Logger.log(`   Requiere reembolso: ${requiereReembolso}, Monto reembolso: $${montoReembolso.toFixed(2)}`);
          } else {
            montoCorrectoFinal = monto;
          }
        }
        
        const payment = {
          'Jugador ID': jugadorId,
          'Jugador Nombre': playerName,
          'Tipo': tipo,
          'Monto': monto,
          'Monto Correcto': montoCorrecto,
          'Monto Correcto Final': montoCorrectoFinal,
          'Tiene Discrepancia': advertencia !== '',
          'Requiere Reembolso': requiereReembolso,
          'Monto Reembolso': montoReembolso,
          'Advertencia': advertencia,
          'Fecha': row[fechaIdx] instanceof Date ? row[fechaIdx].toISOString() : String(row[fechaIdx] || ''),
          'Estado': estado,
          'Método': String(row[metodoIdx] || ''),
          'Referencia': referencia,
          'Row Index': rows.indexOf(row) + 2 // +2 porque la primera fila es headers y empezamos desde 1
        };
        
        familyPayments.push(payment);
        
        // Clasificar pagos
        const esCobro = referencia === 'Cobro Extra' || estado === 'Cobro Registrado';
        
        if (estado === 'Pagado') {
          totalPagado += monto;
        } else if (estado === 'Pendiente') {
          totalPendiente += monto;
        } else if (esCobro) {
          totalCobrosExtras += monto;
        }
      }
    });
    
    Logger.log(`✅ Historial familiar: ${familyPayments.length} pagos encontrados`);
    
    return {
      success: true,
      family: family,
      payments: familyPayments,
      totals: {
        pagado: totalPagado,
        pendiente: totalPendiente,
        cobrosExtras: totalCobrosExtras,
        total: totalPagado + totalPendiente + totalCobrosExtras
      }
    };
    
  } catch (error) {
    Logger.log('❌ Error obteniendo historial familiar: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * CREAR GRUPO FAMILIAR COMPLETO (Tutor + Múltiples Jugadores)
 * Crea todos los jugadores de una familia de una sola vez
 */
function createFamilyGroup(familyGroupData) {
  try {
    Logger.log('=== CREANDO GRUPO FAMILIAR COMPLETO ===');
    Logger.log('Tutor:', familyGroupData.tutor.name);
    Logger.log('Jugadores a crear:', familyGroupData.players.length);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }
    
    // Asegurar que existan las columnas para URLs de cédulas
    ensureCedulaColumnsExist(playersSheet);
    
    const tutorData = familyGroupData.tutor;
    const playersData = familyGroupData.players;
    
    // Generar ID de familia basado en cédula del tutor
    const familyId = `FAM_${tutorData.cedula}`;
    
    // Procesar archivo de cédula del tutor
    let tutorCedulaUrl = '';
    if (tutorData.cedulaFileData) {
      const tutorFileResult = uploadCedulaFile(tutorData.cedulaFileData, familyId, 'tutor');
      if (tutorFileResult.success) {
        tutorCedulaUrl = tutorFileResult.url;
      }
    }
    
    const newPlayers = [];
    let playersCreated = 0;
    
    // Crear cada jugador
    for (let i = 0; i < playersData.length; i++) {
      const player = playersData[i];
      
      // Generar ID único para el jugador
      const playerId = 'PLR_' + Date.now() + '_' + (i * 100 + Math.floor(Math.random() * 100));
      
      // Procesar archivo de cédula del jugador
      let playerCedulaUrl = '';
      if (player.cedulaFileData) {
        const playerFileResult = uploadCedulaFile(player.cedulaFileData, playerId, 'jugador');
        if (playerFileResult.success) {
          playerCedulaUrl = playerFileResult.url;
        }
      }
      
      // Preparar fila de jugador
      const playerRow = [
        playerId,                           // A - ID
        player.name,                        // B - Nombre
        player.lastName,                    // C - Apellidos
        parseInt(player.age),               // D - Edad
        player.cedula,                      // E - Cédula
        '',                                 // F - Teléfono (del jugador, vacío por ahora)
        player.category,                    // G - Categoría
        'Activo',                           // H - Estado (todos activos al crear)
        new Date(),                         // I - Fecha Registro
        tutorData.name,                     // J - Tutor
        tutorData.email,                    // K - Email Tutor
        tutorData.address,                  // L - Dirección
        familyId,                           // M - Familia ID
        player.type || 'normal',            // N - Tipo
        0,                                  // O - Descuento %
        '',                                 // P - Observaciones
        player.birthdate || '',             // Q - Fecha Nacimiento
        player.gender,                      // R - Género
        '',                                 // S - Método Pago Preferido
        tutorData.cedula,                   // T - Cédula Tutor
        '',                                 // U - Mensualidad Personalizada
        playerCedulaUrl,                    // V - URL Cédula Jugador
        tutorCedulaUrl                      // W - URL Cédula Tutor
      ];
      
      newPlayers.push(playerRow);
      playersCreated++;
      
      // Registrar matrícula si no es becado
      if (player.type !== 'becado') {
        // Esperar a que se guarde el jugador antes de registrar matrícula
        Utilities.sleep(500);
      }
      
      Logger.log(`✅ Jugador ${i + 1} preparado: ${player.name} ${player.lastName}`);
    }
    
    // Escribir todos los jugadores de una vez
    if (newPlayers.length > 0) {
      playersSheet.getRange(
        playersSheet.getLastRow() + 1,
        1,
        newPlayers.length,
        newPlayers[0].length
      ).setValues(newPlayers);
      SpreadsheetApp.flush();
      
      Logger.log(`✅ ${newPlayers.length} jugadores escritos en la hoja`);
      
      // Registrar matrículas después de crear los jugadores
      newPlayers.forEach((playerRow, index) => {
        const playerId = playerRow[0];
        const tipo = playerRow[13]; // Columna N - Tipo
        
        if (tipo !== 'becado') {
          registerEnrollmentFee(playerId, false);
        }
      });
    }
    
    Logger.log(`✅ Grupo familiar creado: ${familyId} con ${playersCreated} jugadores`);
    
    return {
      success: true,
      message: `Grupo familiar creado exitosamente`,
      familyId: familyId,
      playersCreated: playersCreated,
      tutorCedulaUploaded: !!tutorCedulaUrl
    };
    
  } catch (error) {
    Logger.log('❌ Error creando grupo familiar: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}


/**
 * Crear o actualizar automáticamente los grupos familiares basados en los tutores
 */
function autoCreateFamilyGroups() {
  try {
    Logger.log('=== AUTOCREANDO GRUPOS FAMILIARES ===');

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
        message: 'No hay jugadores registrados',
        familiesProcessed: 0,
        familiesCreated: 0,
        playersUpdated: 0,
        families: []
      };
    }

    const headers = data[0];
    const rows = data.slice(1);

    const tutorIdx = headers.indexOf('Tutor');
    const cedulaTutorIdx = headers.indexOf('Cédula Tutor');
    const familyIdIdx = headers.indexOf('Familia ID');
    const estadoIdx = headers.indexOf('Estado');
    const emailTutorIdx = headers.indexOf('Email Tutor');
    const telefonoIdx = headers.indexOf('Teléfono');
    const direccionIdx = headers.indexOf('Dirección');

    if (tutorIdx === -1 || familyIdIdx === -1 || estadoIdx === -1) {
      return {
        success: false,
        message: 'No se encontraron las columnas requeridas (Tutor, Familia ID, Estado) en la hoja de Jugadores'
      };
    }

    const usedFamilyIds = new Set();
    rows.forEach(row => {
      if (familyIdIdx !== -1) {
        const currentId = (row[familyIdIdx] || '').toString().trim();
        if (currentId) {
          usedFamilyIds.add(currentId);
        }
      }
    });

    const familiesMap = new Map();

    rows.forEach((row, rowIndex) => {
      const state = (row[estadoIdx] || '').toString().toLowerCase();
      if (state !== 'activo') {
        return;
      }

      const extractedTutor = extractTutorNameFromRow(row, headers);
      const sanitizedTutor = sanitizeTutorName(extractedTutor);
      const cedulaTutor = cedulaTutorIdx !== -1 ? (row[cedulaTutorIdx] || '').toString().trim() : '';

      if (!sanitizedTutor && !cedulaTutor) {
        return;
      }

      const key = cedulaTutor ? `CEDULA:${cedulaTutor}` : `TUTOR:${sanitizedTutor.toLowerCase()}`;

      if (!familiesMap.has(key)) {
        familiesMap.set(key, {
          rows: [],
          rowIndexes: [],
          tutorNames: new Set(),
          cedula: cedulaTutor,
          email: '',
          phone: '',
          address: '',
          existingIds: new Set()
        });
      }

      const family = familiesMap.get(key);
      family.rows.push(row);
      family.rowIndexes.push(rowIndex);

      if (sanitizedTutor) {
        family.tutorNames.add(sanitizedTutor);
      }
      if (!family.cedula && cedulaTutor) {
        family.cedula = cedulaTutor;
      }

      const email = emailTutorIdx !== -1 ? (row[emailTutorIdx] || '').toString().trim() : '';
      if (email && !family.email) {
        family.email = email;
      }

      const phone = telefonoIdx !== -1 ? (row[telefonoIdx] || '').toString().trim() : '';
      if (phone && !family.phone) {
        family.phone = phone;
      }

      const address = direccionIdx !== -1 ? (row[direccionIdx] || '').toString().trim() : '';
      if (address && !family.address) {
        family.address = address;
      }

      if (familyIdIdx !== -1) {
        const currentFamilyId = (row[familyIdIdx] || '').toString().trim();
        if (currentFamilyId) {
          family.existingIds.add(currentFamilyId);
        }
      }
    });

    const rowsToUpdate = new Set();
    const familiesResult = [];
    let playersUpdated = 0;
    let familiesProcessed = 0;
    let newFamiliesCount = 0;

    familiesMap.forEach(family => {
      if (family.rows.length < 2) {
        return;
      }

      familiesProcessed += 1;

      const validExistingIds = Array.from(family.existingIds).filter(id => id && !/^pendiente$/i.test(id));
      let finalFamilyId;

      if (validExistingIds.length > 0) {
        finalFamilyId = validExistingIds[0];
      } else {
        const baseId = family.cedula || (family.tutorNames.size ? Array.from(family.tutorNames)[0] : 'AUTO');
        finalFamilyId = generateUniqueFamilyId(baseId, usedFamilyIds);
        newFamiliesCount += 1;
      }

      const tutorDisplayName = buildFamilyDisplayName(
        family.tutorNames.size ? Array.from(family.tutorNames)[0] : '',
        family.cedula
      );

      family.rowIndexes.forEach(rowIndex => {
        const row = rows[rowIndex];
        let rowChanged = false;

        if (familyIdIdx !== -1) {
          const currentId = (row[familyIdIdx] || '').toString().trim();
          if (currentId !== finalFamilyId) {
            row[familyIdIdx] = finalFamilyId;
            rowChanged = true;
            playersUpdated += 1;
          }
        }

        if (tutorIdx !== -1) {
          const currentTutor = sanitizeTutorName(row[tutorIdx]);
          if (!currentTutor) {
            row[tutorIdx] = tutorDisplayName;
            rowChanged = true;
          }
        }

        if (cedulaTutorIdx !== -1 && family.cedula) {
          const currentCedula = (row[cedulaTutorIdx] || '').toString().trim();
          if (!currentCedula) {
            row[cedulaTutorIdx] = family.cedula;
            rowChanged = true;
          }
        }

        if (emailTutorIdx !== -1 && family.email) {
          const currentEmail = (row[emailTutorIdx] || '').toString().trim();
          if (!currentEmail) {
            row[emailTutorIdx] = family.email;
            rowChanged = true;
          }
        }

        if (telefonoIdx !== -1 && family.phone) {
          const currentPhone = (row[telefonoIdx] || '').toString().trim();
          if (!currentPhone) {
            row[telefonoIdx] = family.phone;
            rowChanged = true;
          }
        }

        if (direccionIdx !== -1 && family.address) {
          const currentAddress = (row[direccionIdx] || '').toString().trim();
          if (!currentAddress) {
            row[direccionIdx] = family.address;
            rowChanged = true;
          }
        }

        if (rowChanged) {
          rowsToUpdate.add(rowIndex);
        }
      });

      familiesResult.push({
        familyId: finalFamilyId,
        tutorName: tutorDisplayName,
        tutorCedula: family.cedula || '',
        players: family.rows.length,
        newFamily: validExistingIds.length === 0
      });
    });

    rowsToUpdate.forEach(rowIndex => {
      playersSheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rows[rowIndex]]);
    });
    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'Procesamiento de grupos familiares completado',
      familiesProcessed: familiesProcessed,
      familiesCreated: newFamiliesCount,
      playersUpdated: playersUpdated,
      families: familiesResult
    };
  } catch (error) {
    Logger.log('❌ Error auto creando grupos familiares: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}


function createFamilyGroupsByTutor() {
  const result = autoCreateFamilyGroups();
  if (result && result.success) {
    return Object.assign({}, result, {
      message: 'Agrupamiento por tutor completado'
    });
  }
  return result;
}

/**
 * Obtener jugadores disponibles para asignación manual de grupos familiares
 */
function getPlayersForFamilySelection() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');

    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }

    const data = playersSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, players: [] };
    }

    const headers = data[0];
    const rows = data.slice(1);

    const idIdx = headers.indexOf('ID');
    const nombreIdx = headers.indexOf('Nombre');
    const apellidosIdx = headers.indexOf('Apellidos');
    const tutorIdx = headers.indexOf('Tutor');
    const cedulaTutorIdx = headers.indexOf('Cédula Tutor');
    const emailTutorIdx = headers.indexOf('Email Tutor');
    const telefonoIdx = headers.indexOf('Teléfono');
    const direccionIdx = headers.indexOf('Dirección');
    const familyIdIdx = headers.indexOf('Familia ID');
    const estadoIdx = headers.indexOf('Estado');
    const categoriaIdx = headers.indexOf('Categoría');
    const tipoIdx = headers.indexOf('Tipo');

    const players = [];

    rows.forEach(row => {
      const playerId = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
      if (!playerId) {
        return;
      }

      const state = estadoIdx !== -1 ? (row[estadoIdx] || '').toString().toLowerCase() : '';
      if (state && state !== 'activo') {
        return;
      }

      const firstName = nombreIdx !== -1 ? String(row[nombreIdx] || '').trim() : '';
      const lastName = apellidosIdx !== -1 ? String(row[apellidosIdx] || '').trim() : '';
      const fullName = `${firstName} ${lastName}`.trim();

      const rawTutor = tutorIdx !== -1 ? row[tutorIdx] : '';
      const cedulaTutor = cedulaTutorIdx !== -1 ? (row[cedulaTutorIdx] || '').toString().trim() : '';
      const tutorName = buildFamilyDisplayName(rawTutor, cedulaTutor);

      players.push({
        id: playerId,
        name: fullName || 'Sin nombre',
        tutorName: tutorName,
        tutorCedula: cedulaTutor,
        tutorEmail: emailTutorIdx !== -1 ? (row[emailTutorIdx] || '').toString().trim() : '',
        tutorPhone: telefonoIdx !== -1 ? (row[telefonoIdx] || '').toString().trim() : '',
        tutorAddress: direccionIdx !== -1 ? (row[direccionIdx] || '').toString().trim() : '',
        familyId: familyIdIdx !== -1 ? (row[familyIdIdx] || '').toString().trim() : '',
        state: state || 'activo',
        category: categoriaIdx !== -1 ? (row[categoriaIdx] || '').toString().trim() : '',
        type: tipoIdx !== -1 ? (row[tipoIdx] || '').toString().trim() : ''
      });
    });

    players.sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      players: players
    };
  } catch (error) {
    Logger.log('❌ Error obteniendo jugadores para selección familiar: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Asignar jugadores existentes a un grupo familiar específico
 */
function assignPlayersToFamilyGroup(familyData) {
  try {
    Logger.log('=== ASIGNANDO JUGADORES A GRUPO FAMILIAR ===');

    if (!familyData || !familyData.playerIds || familyData.playerIds.length === 0) {
      return { success: false, message: 'No se seleccionaron jugadores' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');

    if (!playersSheet) {
      return { success: false, message: 'Hoja de Jugadores no encontrada' };
    }

    const data = playersSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: 'No hay jugadores para actualizar' };
    }

    const headers = data[0];
    const rows = data.slice(1);

    const idIdx = headers.indexOf('ID');
    const tutorIdx = headers.indexOf('Tutor');
    const cedulaTutorIdx = headers.indexOf('Cédula Tutor');
    const emailTutorIdx = headers.indexOf('Email Tutor');
    const telefonoIdx = headers.indexOf('Teléfono');
    const direccionIdx = headers.indexOf('Dirección');
    const familyIdIdx = headers.indexOf('Familia ID');

    if (idIdx === -1 || familyIdIdx === -1) {
      return { success: false, message: 'No se encontraron las columnas requeridas (ID, Familia ID)' };
    }

    const requestedPlayerIds = new Set(familyData.playerIds.map(id => String(id).trim()));

    const usedFamilyIds = new Set();
    rows.forEach(row => {
      const existingFamilyId = familyIdIdx !== -1 ? (row[familyIdIdx] || '').toString().trim() : '';
      if (existingFamilyId) {
        usedFamilyIds.add(existingFamilyId);
      }
    });

    let finalFamilyId = '';
    if (familyData.familyId && familyData.familyId.trim()) {
      finalFamilyId = familyData.familyId.trim();
      if (!finalFamilyId.startsWith('FAM_')) {
        finalFamilyId = `FAM_${slugify(finalFamilyId)}`;
      }
    } else if (familyData.tutorCedula && familyData.tutorCedula.trim()) {
      finalFamilyId = generateUniqueFamilyId(familyData.tutorCedula, usedFamilyIds);
    } else if (familyData.tutorName && familyData.tutorName.trim()) {
      finalFamilyId = generateUniqueFamilyId(familyData.tutorName, usedFamilyIds);
    } else {
      finalFamilyId = generateUniqueFamilyId('AUTO', usedFamilyIds);
    }

    const tutorName = familyData.tutorName ? familyData.tutorName.trim() : '';
    const tutorCedula = familyData.tutorCedula ? familyData.tutorCedula.trim() : '';
    const tutorEmail = familyData.tutorEmail ? familyData.tutorEmail.trim() : '';
    const tutorPhone = familyData.tutorPhone ? familyData.tutorPhone.trim() : '';
    const tutorAddress = familyData.tutorAddress ? familyData.tutorAddress.trim() : '';

    const rowsToUpdate = new Set();
    let playersUpdated = 0;

    rows.forEach((row, rowIndex) => {
      const playerId = String(row[idIdx] || '').trim();
      if (!requestedPlayerIds.has(playerId)) {
        return;
      }

      let rowChanged = false;

      if (familyIdIdx !== -1) {
        const currentId = (row[familyIdIdx] || '').toString().trim();
        if (currentId !== finalFamilyId) {
          row[familyIdIdx] = finalFamilyId;
          rowChanged = true;
        }
      }

      if (tutorIdx !== -1 && tutorName) {
        const currentTutor = sanitizeTutorName(row[tutorIdx]);
        if (!currentTutor || currentTutor !== tutorName) {
          row[tutorIdx] = tutorName;
          rowChanged = true;
        }
      }

      if (cedulaTutorIdx !== -1 && tutorCedula) {
        const currentCedula = (row[cedulaTutorIdx] || '').toString().trim();
        if (currentCedula !== tutorCedula) {
          row[cedulaTutorIdx] = tutorCedula;
          rowChanged = true;
        }
      }

      if (emailTutorIdx !== -1 && tutorEmail) {
        const currentEmail = (row[emailTutorIdx] || '').toString().trim();
        if (currentEmail !== tutorEmail) {
          row[emailTutorIdx] = tutorEmail;
          rowChanged = true;
        }
      }

      if (telefonoIdx !== -1 && tutorPhone) {
        const currentPhone = (row[telefonoIdx] || '').toString().trim();
        if (currentPhone !== tutorPhone) {
          row[telefonoIdx] = tutorPhone;
          rowChanged = true;
        }
      }

      if (direccionIdx !== -1 && tutorAddress) {
        const currentAddress = (row[direccionIdx] || '').toString().trim();
        if (currentAddress !== tutorAddress) {
          row[direccionIdx] = tutorAddress;
          rowChanged = true;
        }
      }

      if (rowChanged) {
        rowsToUpdate.add(rowIndex);
        playersUpdated += 1;
      }

      requestedPlayerIds.delete(playerId);
    });

    rowsToUpdate.forEach(rowIndex => {
      playersSheet.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rows[rowIndex]]);
    });
    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'Jugadores asignados al grupo familiar',
      familyId: finalFamilyId,
      playersUpdated: playersUpdated,
      notFound: Array.from(requestedPlayerIds)
    };
  } catch (error) {
    Logger.log('❌ Error asignando jugadores a familia: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Obtener grupos familiares agrupados por tutor
 * Incluye solo jugadores activos con 2 o más miembros por familia
 */
function getFamilyGroups() {
  try {
    Logger.log('=== OBTENIENDO GRUPOS FAMILIARES ===');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');

    if (!playersSheet) {
      Logger.log('⚠️ No se encontró hoja de Jugadores');
      return [];
    }

    const playersData = playersSheet.getDataRange().getValues();
    if (playersData.length <= 1) {
      Logger.log('⚠️ No hay jugadores aprobados en el sistema');
      return [];
    }

    const headers = playersData[0];
    const rows = playersData.slice(1);

    const tutorIdx = headers.indexOf('Tutor');
    const familyIdIdx = headers.indexOf('Familia ID');
    const emailTutorIdx = headers.indexOf('Email Tutor');
    const telefonoIdx = headers.indexOf('Teléfono');
    const direccionIdx = headers.indexOf('Dirección');
    const cedulaTutorIdx = headers.indexOf('Cédula Tutor');
    const nombreIdx = headers.indexOf('Nombre');
    const apellidosIdx = headers.indexOf('Apellidos');
    const edadIdx = headers.indexOf('Edad');
    const categoriaIdx = headers.indexOf('Categoría');
    const idIdx = headers.indexOf('ID');
    const estadoIdx = headers.indexOf('Estado');
    const tipoIdx = headers.indexOf('Tipo');
    const mensualidadIdx = headers.indexOf('Mensualidad Personalizada');

    // Obtener configuración financiera para mensualidades
    const financialConfig = getFinancialConfig();

    const familyGroups = new Map();

    rows.forEach(row => {
      const rawTutor = tutorIdx !== -1 ? row[tutorIdx] : '';
      const sanitizedTutor = sanitizeTutorName(rawTutor);
      const cedulaTutor = cedulaTutorIdx !== -1 ? String(row[cedulaTutorIdx] || '').trim() : '';
      const estado = String(row[estadoIdx] || '').toLowerCase();

      if (estado !== 'activo') {
        return;
      }

      if (!sanitizedTutor && !cedulaTutor) {
        Logger.log('⚠️ Jugador sin datos de tutor, omitido');
        return;
      }

      const key = cedulaTutor ? `CEDULA:${cedulaTutor}` : `TUTOR:${sanitizedTutor.toLowerCase()}`;
      const generatedFamilyId = cedulaTutor
        ? `FAM_${cedulaTutor}`
        : `FAM_${slugify(sanitizedTutor || 'AUTO')}`;
      const existingFamilyId = familyIdIdx !== -1 ? String(row[familyIdIdx] || '').trim() : '';
      const finalFamilyId = existingFamilyId || generatedFamilyId;

      if (!familyGroups.has(key)) {
        familyGroups.set(key, {
          familyId: finalFamilyId,
          tutorName: buildFamilyDisplayName(sanitizedTutor, cedulaTutor),
          tutorEmail: emailTutorIdx !== -1 ? (row[emailTutorIdx] || '').toString().trim() : '',
          tutorPhone: telefonoIdx !== -1 ? (row[telefonoIdx] || '').toString().trim() : '',
          tutorAddress: direccionIdx !== -1 ? (row[direccionIdx] || '').toString().trim() : '',
          tutorCedula: cedulaTutor,
          players: [],
          totalAmount: 0,
          playersCount: 0
        });
      }

      const family = familyGroups.get(key);

      if (!family.tutorEmail && emailTutorIdx !== -1) {
        const email = (row[emailTutorIdx] || '').toString().trim();
        if (email) {
          family.tutorEmail = email;
        }
      }

      if (!family.tutorPhone && telefonoIdx !== -1) {
        const phone = (row[telefonoIdx] || '').toString().trim();
        if (phone) {
          family.tutorPhone = phone;
        }
      }

      if (!family.tutorAddress && direccionIdx !== -1) {
        const address = (row[direccionIdx] || '').toString().trim();
        if (address) {
          family.tutorAddress = address;
        }
      }

      if (!family.tutorCedula && cedulaTutor) {
        family.tutorCedula = cedulaTutor;
      }

      if (sanitizedTutor) {
        family.tutorName = sanitizedTutor;
      } else if (!family.tutorName || /^Tutor/.test(family.tutorName)) {
        family.tutorName = buildFamilyDisplayName(family.tutorName, family.tutorCedula);
      }

      if (!family.familyId || /^pendiente$/i.test(family.familyId)) {
        family.familyId = finalFamilyId;
      } else if (existingFamilyId && !/^pendiente$/i.test(existingFamilyId)) {
        family.familyId = existingFamilyId;
      }

      const playerType = String(row[tipoIdx] || 'normal');
      const mensualidadPersonalizada = parseFloat(row[mensualidadIdx]) || null;

      let monthlyFee = financialConfig.MONTHLY_FEE;

      if (playerType === 'becado') {
        monthlyFee = 0;
      } else if (mensualidadPersonalizada) {
        monthlyFee = mensualidadPersonalizada;
      } else {
        const isFirstPlayer = family.players.length === 0;
        monthlyFee = isFirstPlayer ? financialConfig.MONTHLY_FEE : financialConfig.FAMILY_MONTHLY_FEE;
      }

      const nombreCompleto = `${row[nombreIdx] || ''} ${row[apellidosIdx] || ''}`.trim();

      family.players.push({
        id: row[idIdx] || '',
        name: nombreCompleto,
        age: row[edadIdx] || '',
        category: row[categoriaIdx] || '',
        status: row[estadoIdx] || '',
        monthlyFee: monthlyFee,
        type: playerType
      });

      family.totalAmount += monthlyFee;
      family.playersCount += 1;
    });

    const result = Array.from(familyGroups.values()).filter(family => family.playersCount >= 2);

    result.forEach(family => {
      family.tutorName = buildFamilyDisplayName(family.tutorName, family.tutorCedula);
    });

    Logger.log(`✅ Grupos familiares encontrados: ${result.length} (de ${familyGroups.size} tutores totales)`);
    Logger.log('📊 Solo familias con 2+ jugadores activos');

    return result;

  } catch (error) {
    Logger.log('❌ Error obteniendo grupos familiares: ' + error.toString());
    return [];
  }
}

/**
 * REGISTRAR PAGO PARA TODA LA FAMILIA
 */
function registerFamilyPayment(familyId, playerPayments, paymentMethod, reference) {
  try {
    Logger.log('=== REGISTRANDO PAGO FAMILIAR ===');
    Logger.log('Familia ID:', familyId);
    Logger.log('Pagos:', JSON.stringify(playerPayments));
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      paymentsSheet = ss.insertSheet('Pagos');
      const headers = [
        'ID', 'Jugador ID', 'Tipo', 'Monto', 'Fecha', 'Estado',
        'Método Pago', 'Referencia', 'Observaciones', 'Descuento Aplicado'
      ];
      paymentsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      paymentsSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1e3a8a')
        .setFontColor('white');
    }
    
    const newPayments = [];
    const now = new Date();
    
    // Crear un pago para cada jugador
    playerPayments.forEach(payment => {
      const paymentId = 'PAY_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      
      const paymentRow = [
        paymentId,
        payment.playerId,
        'Mensualidad',
        parseFloat(payment.amount),
        now,
        'Pagado',
        paymentMethod || 'Efectivo',
        reference || 'Pago Familiar',
        'Pago de grupo familiar',
        'Usuario'
      ];
      
      newPayments.push(paymentRow);
    });
    
    // Escribir todos los pagos de una vez
    if (newPayments.length > 0) {
      paymentsSheet.getRange(
        paymentsSheet.getLastRow() + 1,
        1,
        newPayments.length,
        newPayments[0].length
      ).setValues(newPayments);
      SpreadsheetApp.flush();
    }
    
    Logger.log(`✅ ${newPayments.length} pagos familiares registrados`);
    
    return {
      success: true,
      message: `${newPayments.length} pagos registrados exitosamente`,
      paymentsCreated: newPayments.length
    };
    
  } catch (error) {
    Logger.log('❌ Error registrando pago familiar: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

