/**
 * ========================================
 * ARCHIVO: PaymentManager.gs
 * DESCRIPCIÓN: Gestión de pagos y mensualidades
 * FUNCIONES: Historial de pagos, cobros extras, mensualidades personalizadas, cobro automático
 * ========================================
 */

/**
 * REGISTRAR PAGO MANUAL (Genérico - cubre mensualidad, matrícula, cobros extras)
 * Esta es la función principal que se llama desde PlayersManager
 */
function registerManualPayment(playerId, amount, paymentMethod, reference) {
  try {
    Logger.log('=== REGISTRANDO PAGO MANUAL ===');
    Logger.log('Jugador ID:', playerId);
    Logger.log('Monto:', amount);
    Logger.log('Método:', paymentMethod);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let paymentsSheet = ss.getSheetByName('Pagos');
    
    // Crear hoja si no existe
    if (!paymentsSheet) {
      Logger.log('Creando hoja Pagos...');
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
    
    // Crear ID único
    const paymentId = 'PAY_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Crear fila de pago
    const paymentRow = [
      paymentId,                           // ID
      playerId,                            // Jugador ID
      'Mensualidad',                       // Tipo
      parseFloat(amount),                  // Monto
      new Date(),                          // Fecha
      'Pagado',                            // Estado
      paymentMethod || 'Efectivo',         // Método Pago
      reference || 'Pago Manual',          // Referencia
      'Pago manual registrado por usuario', // Observaciones
      'Usuario'                            // Creado Por
    ];
    
    paymentsSheet.appendRow(paymentRow);
    SpreadsheetApp.flush();
    
    Logger.log('✅ Pago manual registrado: ' + paymentId);
    
    return {
      success: true,
      message: 'Pago registrado exitosamente',
      paymentId: paymentId
    };
    
  } catch (error) {
    Logger.log('❌ ERROR en registerManualPayment: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * REGISTRAR PAGO DE MENSUALIDAD MANUALMENTE (Legacy - redirige a registerManualPayment)
 */
function registerMonthlyPayment(playerId, amount, paymentMethod, reference) {
  return registerManualPayment(playerId, amount, paymentMethod, reference);
}

/**
 * COBRO AUTOMÁTICO MENSUAL (Se ejecuta el día 1 de cada mes)
 * REDIRIGE A processMonthlyBilling() para usar lógica centralizada
 */
function chargeMonthlyFeesAutomatic() {
  Logger.log('=== chargeMonthlyFeesAutomatic - Redirigiendo a processMonthlyBilling ===');
  
  try {
    // Verificar fecha de inicio de generación de mensualidades
    const startDate = getMonthlyFeeGenerationStartDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);
    
    if (today < startDateNormalized) {
      Logger.log(`⏸️ Generación de mensualidades pausada hasta ${startDate.toLocaleDateString('es-ES')}. Fecha actual: ${today.toLocaleDateString('es-ES')}`);
      return {
        success: true,
        message: `Generación de mensualidades pausada hasta ${startDate.toLocaleDateString('es-ES')}`,
        processed: 0,
        errors: 0
      };
    }
    
    // Verificar si es día 1 del mes
    const dayOfMonth = today.getDate();
    
    if (dayOfMonth !== 1) {
      Logger.log(`⏭️ No es día 1 del mes (hoy es día ${dayOfMonth}). Saltando cobro automático.`);
      return {
        success: true,
        message: `No es día 1 del mes (hoy es día ${dayOfMonth})`,
        processed: 0,
        errors: 0
      };
    }
    
    Logger.log('✅ Es día 1 del mes. Ejecutando processMonthlyBilling()...');
    
    // Llamar a la función centralizada
    return processMonthlyBilling();
    
  } catch (error) {
    Logger.log('❌ ERROR en chargeMonthlyFeesAutomatic: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * FUNCIÓN DE PRUEBA: Simular cobro mensual
 */

/**
 * VERIFICAR SI UN JUGADOR TIENE PAGOS PENDIENTES (MOROSO)
 * Retorna true si tiene mensualidades pendientes CON SALDO > 0 después del día 5 del mes
 */
function isPlayerOverdue(playerId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      return false;
    }
    
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Solo marcar como moroso después del día 5
    if (currentDay <= 5) {
      return false;
    }
    
    const paymentsData = paymentsSheet.getDataRange().getValues();
    if (paymentsData.length < 2) {
      return false;
    }
    
    const headers = paymentsData[0];
    const rows = paymentsData.slice(1);
    
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const estadoIdx = headers.indexOf('Estado');
    const fechaIdx = headers.indexOf('Fecha');
    const montoIdx = headers.indexOf('Monto');
    
    // Calcular balance del mes actual
    let totalPendiente = 0;
    let totalPagado = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const jugadorId = String(row[jugadorIdIdx] || '');
      const tipo = String(row[tipoIdx] || '');
      const estado = String(row[estadoIdx] || '');
      const fecha = row[fechaIdx];
      const monto = parseFloat(row[montoIdx] || 0);
      
      if (jugadorId === playerId && tipo === 'Mensualidad') {
        // Verificar si es del mes actual
        if (fecha instanceof Date) {
          const paymentMonth = fecha.getMonth();
          const paymentYear = fecha.getFullYear();
          
          if (paymentMonth === currentMonth && paymentYear === currentYear) {
            if (estado === 'Pendiente') {
              totalPendiente += monto;
            } else if (estado === 'Pagado') {
              totalPagado += monto;
            }
          }
        }
      }
    }
    
    // Calcular saldo neto
    const saldoNeto = totalPendiente - totalPagado;
    
    // Solo es moroso si el saldo neto es mayor a 0
    const esMoroso = saldoNeto > 0;
    
    if (esMoroso) {
      Logger.log(`Jugador ${playerId} es MOROSO: Pendiente=$${totalPendiente}, Pagado=$${totalPagado}, Saldo=$${saldoNeto}`);
    }
    
    return esMoroso;
    
  } catch (error) {
    Logger.log('Error verificando morosidad: ' + error.toString());
    return false;
  }
}

/**
 * OBTENER TODOS LOS JUGADORES CON ESTADO DE MOROSIDAD
 */
function getPlayersWithOverdueStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return [];
    }
    
    const playersData = playersSheet.getDataRange().getValues();
    if (playersData.length < 2) {
      return [];
    }
    
    const headers = playersData[0];
    const rows = playersData.slice(1);
    
    const idIdx = headers.indexOf('ID');
    
    const overduePlayerIds = [];
    
    for (let i = 0; i < rows.length; i++) {
      const playerId = String(rows[i][idIdx] || '');
      if (playerId && isPlayerOverdue(playerId)) {
        overduePlayerIds.push(playerId);
      }
    }
    
    Logger.log(`Jugadores morosos encontrados: ${overduePlayerIds.length}`);
    return overduePlayerIds;
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores morosos: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene el historial de pagos de un jugador (versión simplificada)
 */
function getPlayerPaymentHistory(playerId) {
  Logger.log('=== INICIO getPlayerPaymentHistory ===');
  Logger.log('ID solicitado: ' + playerId);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Obtener jugador
    const playersSheet = ss.getSheetByName('Jugadores');
    if (!playersSheet) {
      Logger.log('ERROR: Hoja Jugadores no existe');
      return {
        success: false,
        message: 'Hoja Jugadores no encontrada',
        player: {},
        payments: []
      };
    }
    
    const playersData = playersSheet.getDataRange().getValues();
    if (playersData.length < 2) {
      Logger.log('ERROR: Hoja Jugadores vacía');
      return {
        success: false,
        message: 'No hay jugadores',
        player: {},
        payments: []
      };
    }
    
    const playersHeaders = playersData[0];
    const playersRows = playersData.slice(1);
    
    // Buscar jugador
    const idCol = playersHeaders.indexOf('ID');
    let jugadorRow = null;
    let jugadorIndex = -1;
    
    for (let i = 0; i < playersRows.length; i++) {
      if (playersRows[i][idCol] === playerId) {
        jugadorRow = playersRows[i];
        jugadorIndex = i;
        break;
      }
    }
    
    if (!jugadorRow) {
      Logger.log('ERROR: Jugador no encontrado: ' + playerId);
      return {
        success: false,
        message: 'Jugador no encontrado: ' + playerId,
        player: {},
        payments: []
      };
    }
    
    Logger.log('Jugador encontrado en fila: ' + jugadorIndex);
    
    // Crear objeto jugador (usando índices fijos como en getAllPlayers)
    const jugador = {
      'ID': jugadorRow[0] || '',
      'Nombre': jugadorRow[1] || '',
      'Apellidos': jugadorRow[2] || '',
      'Edad': jugadorRow[3] || '',
      'Cédula': jugadorRow[4] || '',
      'Teléfono': jugadorRow[5] || '',
      'Categoría': jugadorRow[6] || '',
      'Estado': jugadorRow[7] || '',
      'Fecha Registro': jugadorRow[8] ? jugadorRow[8].toString() : '',
      'Tutor': jugadorRow[9] || '',
      'Familia ID': jugadorRow[10] || '',
      'Tipo': jugadorRow[11] || 'normal',
      'Descuento %': jugadorRow[12] || 0,
      'Observaciones': jugadorRow[13] || '',
      'Mensualidad Personalizada': jugadorRow[20] || ''  // Columna U (índice 20) - ACTUALIZADO SIN TALLA
    };
    
    Logger.log('Datos del jugador extraídos: ' + jugador.Nombre + ' ' + jugador.Apellidos);
    Logger.log('Mensualidad Personalizada: ' + jugador['Mensualidad Personalizada']);
    
    // 2. Obtener pagos
    const paymentsSheet = ss.getSheetByName('Pagos');
    let pagos = [];
    
    if (paymentsSheet) {
      Logger.log('Hoja Pagos encontrada');
      const paymentsData = paymentsSheet.getDataRange().getValues();
      
      if (paymentsData.length > 1) {
        const paymentsHeaders = paymentsData[0];
        const paymentsRows = paymentsData.slice(1);
        
        Logger.log('Total de pagos: ' + paymentsRows.length);
        Logger.log('Headers de Pagos:', paymentsHeaders);
        Logger.log('Buscando pagos para jugador: "' + playerId + '"');
        
        // Buscar en columna 1 (índice 1) que debería ser "ID Jugador"
        // Según el código de addExtraChargeToPlayer, el ID se guarda en columna 1
        for (let i = 0; i < paymentsRows.length; i++) {
          const pagoIdJugador = String(paymentsRows[i][1] || ''); // Columna B (índice 1)
          
          if (i < 3) {
            Logger.log('  Pago ' + (i + 1) + ' - ID Jugador (col 1): "' + pagoIdJugador + '"');
          }
          
          if (pagoIdJugador === playerId) {
            Logger.log('✓ Pago encontrado en fila: ' + i);
            const pago = {
              'ID Pago': String(paymentsRows[i][0] || ''),
              'ID Jugador': String(paymentsRows[i][1] || ''),
              'Tipo': String(paymentsRows[i][2] || ''),           // Tipo (ej: Uniforme)
              'Concepto': String(paymentsRows[i][2] || ''),       // Usar Tipo como Concepto
              'Monto': paymentsRows[i][3] || 0,
              'Fecha': paymentsRows[i][4] ? paymentsRows[i][4].toString() : '',
              'Estado': String(paymentsRows[i][5] || 'Pendiente'),
              'Método': String(paymentsRows[i][6] || ''),
              'Referencia': String(paymentsRows[i][7] || ''),
              'Descripción': String(paymentsRows[i][8] || ''),
              'Observaciones': String(paymentsRows[i][8] || ''),
              'Creado Por': String(paymentsRows[i][9] || '')
            };
            pagos.push(pago);
          }
        }
        
        Logger.log('Pagos encontrados para este jugador: ' + pagos.length);
      }
    } else {
      Logger.log('Hoja Pagos no existe');
    }
    
    // 3. Calcular totales para el jugador
    let totalPendiente = 0;
    let totalPagado = 0;
    const mensualidadPersonalizada = parseFloat(jugador['Mensualidad Personalizada']) || 130;
    
    pagos.forEach(pago => {
      const monto = parseFloat(pago.Monto) || 0;
      const estado = String(pago.Estado || '');
      
      if (estado === 'Pagado') {
        totalPagado += monto;
      } else if (estado === 'Pendiente') {
        totalPendiente += monto;
      }
    });
    
    // 4. Retornar resultado con formato esperado por el frontend
    Logger.log('=== FIN getPlayerPaymentHistory - EXITOSO ===');
    
    return {
      success: true,
      player: {
        id: jugador.ID,
        nombre: `${jugador.Nombre} ${jugador.Apellidos}`.trim(),
        mensualidadPersonalizada: mensualidadPersonalizada,
        totalPendiente: totalPendiente,
        totalPagado: totalPagado
      },
      payments: pagos.map(pago => ({
        fecha: pago.Fecha,
        tipo: pago.Tipo,
        monto: parseFloat(pago.Monto) || 0,
        estado: pago.Estado
      }))
    };
    
  } catch (error) {
    Logger.log('ERROR CRÍTICO: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    
    return {
      success: false,
      message: 'Error: ' + error.toString(),
      player: {},
      payments: []
    };
  }
}

/**
 * Actualiza la mensualidad personalizada de un jugador
 */
function updatePlayerMonthlyFee(playerId, newFee) {
  Logger.log('=== ACTUALIZANDO MENSUALIDAD ===');
  Logger.log('ID: ' + playerId);
  Logger.log('Nueva mensualidad: ' + newFee);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Buscar columna Mensualidad Personalizada
    let mensualidadCol = headers.indexOf('Mensualidad Personalizada');
    
    if (mensualidadCol === -1) {
      // Agregar columna
      mensualidadCol = headers.length;
      playersSheet.getRange(1, mensualidadCol + 1).setValue('Mensualidad Personalizada');
      Logger.log('Columna agregada en posición: ' + mensualidadCol);
    }
    
    // Buscar jugador
    const idCol = headers.indexOf('ID');
    let filaJugador = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === playerId) {
        filaJugador = i + 1; // +1 porque las filas empiezan en 1
        break;
      }
    }
    
    if (filaJugador === -1) {
      return { success: false, message: 'Jugador no encontrado' };
    }
    
    // Actualizar valor
    const valorAGuardar = newFee || '';
    playersSheet.getRange(filaJugador, mensualidadCol + 1).setValue(valorAGuardar);
    SpreadsheetApp.flush();
    
    Logger.log('Mensualidad actualizada exitosamente');
    Logger.log('Fila: ' + filaJugador + ', Columna: ' + (mensualidadCol + 1));
    Logger.log('Valor guardado: ' + valorAGuardar);
    Logger.log('Nueva mensualidad efectiva: $' + (newFee || 130));
    
    return {
      success: true,
      message: 'Mensualidad actualizada correctamente',
      newFee: newFee || 130,
      savedValue: valorAGuardar,
      column: mensualidadCol + 1,
      row: filaJugador
    };
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Agrega un cobro extra al jugador
 */
function addExtraChargeToPlayer(playerId, chargeType, amount, description) {
  Logger.log('=== AGREGANDO COBRO EXTRA ===');
  Logger.log('ID: ' + playerId);
  Logger.log('Tipo: ' + chargeType);
  Logger.log('Monto: ' + amount);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Obtener o crear hoja Pagos
    let paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      Logger.log('Creando hoja Pagos...');
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
      
      Logger.log('Hoja Pagos creada');
    }
    
    // Crear ID único
    const paymentId = 'PAY_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Crear fila (orden: ID, Jugador ID, Tipo, Monto, Fecha, Estado, Método Pago, Referencia, Observaciones, Descuento Aplicado)
    const paymentRow = [
      paymentId,           // ID
      playerId,            // Jugador ID
      chargeType,          // Tipo
      amount,              // Monto
      new Date(),          // Fecha
      'Cobro Registrado',  // Estado (NO pendiente - es un cargo ya aplicado)
      '',                  // Método Pago
      'Cobro Extra',       // Referencia
      description || '',   // Observaciones
      'Sistema'            // Descuento Aplicado (reutilizado como "Creado Por")
    ];
    
    paymentsSheet.appendRow(paymentRow);
    SpreadsheetApp.flush();
    
    Logger.log('Cobro agregado exitosamente: ' + paymentId);
    
    return {
      success: true,
      message: 'Cobro agregado',
      paymentId: paymentId
    };
    
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

