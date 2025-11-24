/**
 * ========================================
 * ARCHIVO: AccountingCore.gs
 * DESCRIPCIÓN: Core contable del sistema - Todo basado en jugadores
 * FUNCIONES: Matrícula, mensualidades, estado de cuenta por jugador, métricas globales
 * ========================================
 */

/**
 * REGISTRAR MATRÍCULA DE UN JUGADOR
 * Se ejecuta cuando un jugador es aprobado
 */
function registerEnrollmentFee(playerId, isScholarship = false) {
  try {
    Logger.log('=== REGISTRANDO MATRÍCULA ===');
    Logger.log('Jugador ID:', playerId);
    Logger.log('Es becado:', isScholarship);
    
    // Obtener tarifa de matrícula desde configuración
    const config = getFinancialConfig();
    Logger.log('📋 Configuración cargada:', config);
    
    // Usar ENROLLMENT_FEE (mayúsculas) de la estructura de Config.gs
    const enrollmentFee = parseFloat(config.ENROLLMENT_FEE || 80);
    Logger.log('💰 Tarifa de matrícula a aplicar:', enrollmentFee);
    
    // Si es becado, no cobrar matrícula
    if (isScholarship) {
      Logger.log('Jugador becado - sin cargo de matrícula');
      return {
        success: true,
        message: 'Jugador becado - sin cargo de matrícula',
        charged: 0
      };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let paymentsSheet = ss.getSheetByName('Pagos');
    
    // Crear hoja si no existe
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
    
    // Crear ID único
    const paymentId = 'ENR_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Crear cargo de matrícula (se registra como Pagado porque el jugador ya fue aprobado)
    const enrollmentRow = [
      paymentId,
      playerId,
      'Matrícula',
      enrollmentFee,
      new Date(),
      'Pagado', // Los pagos de matrícula se registran como pagados automáticamente
      'Sistema Automático',
      'Cargo Automático',
      'Matrícula de ingreso',
      0
    ];
    
    paymentsSheet.appendRow(enrollmentRow);
    SpreadsheetApp.flush();
    
    Logger.log(`✅ Matrícula registrada: $${enrollmentFee}`);
    
    return {
      success: true,
      message: `Matrícula registrada: $${enrollmentFee}`,
      paymentId: paymentId,
      amount: enrollmentFee
    };
    
  } catch (error) {
    Logger.log('❌ Error registrando matrícula: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * GARANTIZAR MATRÍCULA PAGADA PARA JUGADORES APROBADOS
 * Recorre la hoja de jugadores y genera cargos de matrícula pagados
 * para aquellos que no tienen un registro asociado todavía.
 */
function ensureEnrollmentFeesForApprovedPlayers(overrideFee) {
  try {
    Logger.log('=== ASEGURANDO MATRÍCULAS PARA JUGADORES ACEPTADOS ===');

    let enrollmentFee = null;
    if (overrideFee !== undefined && overrideFee !== null && overrideFee !== '') {
      const parsedOverride = parseFloat(overrideFee);
      if (isNaN(parsedOverride) || parsedOverride < 0) {
        throw new Error('Valor de matrícula proporcionado no es válido');
      }
      enrollmentFee = parsedOverride;
      Logger.log(`💰 Tarifa de matrícula proporcionada manualmente: $${enrollmentFee}`);
    }

    if (enrollmentFee === null) {
      const config = getFinancialConfig();
      Logger.log('📋 Configuración cargada:', config);
      enrollmentFee = parseFloat(config.ENROLLMENT_FEE || SYSTEM_CONFIG.FINANCIAL.ENROLLMENT_FEE || 0);
    }

    if (enrollmentFee === null || isNaN(enrollmentFee)) {
      throw new Error('Valor de matrícula inválido en la configuración');
    }

    Logger.log(`💵 Tarifa de matrícula utilizada: $${enrollmentFee}`);

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const playersSheet = ss.getSheetByName('Jugadores');
    if (!playersSheet) {
      return {
        success: false,
        message: 'Hoja de Jugadores no encontrada'
      };
    }

    const playersData = playersSheet.getDataRange().getValues();
    if (playersData.length <= 1) {
      return {
        success: true,
        message: 'No hay jugadores aprobados en el sistema',
        created: 0,
        processedPlayers: 0,
        enrollmentFee: enrollmentFee
      };
    }

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

    const paymentsData = paymentsSheet.getDataRange().getValues();
    const paymentHeaders = paymentsData.length > 0 ? paymentsData[0] : [
      'ID', 'Jugador ID', 'Tipo', 'Monto', 'Fecha', 'Estado',
      'Método Pago', 'Referencia', 'Observaciones', 'Descuento Aplicado'
    ];
    const paymentRows = paymentsData.length > 1 ? paymentsData.slice(1) : [];

    const paymentPlayerIdx = paymentHeaders.indexOf('Jugador ID');
    const paymentTypeIdx = paymentHeaders.indexOf('Tipo');

    if (paymentPlayerIdx === -1 || paymentTypeIdx === -1) {
      throw new Error('La hoja de Pagos no contiene las columnas requeridas (Jugador ID, Tipo)');
    }

    const playersHeaders = playersData[0];
    const playerIdIdx = playersHeaders.indexOf('ID');
    const playerTypeIdx = playersHeaders.indexOf('Tipo');
    const playerStateIdx = playersHeaders.indexOf('Estado');
    const playerNameIdx = playersHeaders.indexOf('Nombre');
    const playerLastNameIdx = playersHeaders.indexOf('Apellidos');

    if (playerIdIdx === -1) {
      throw new Error('La hoja de Jugadores no contiene la columna ID');
    }

    const enrollmentRegistered = new Set();
    paymentRows.forEach(row => {
      const playerId = String(row[paymentPlayerIdx] || '').trim();
      const tipoPago = String(row[paymentTypeIdx] || '').toLowerCase();
      if (!playerId) {
        return;
      }
      if (tipoPago.indexOf('matric') !== -1) {
        enrollmentRegistered.add(playerId);
      }
    });

    let alreadyRegistered = 0;
    let skippedScholarships = 0;
    let skippedInactive = 0;
    let invalidPlayers = 0;
    const rowsToAppend = [];
    const details = [];

    playersData.slice(1).forEach(row => {
      const playerId = String(row[playerIdIdx] || '').trim();
      if (!playerId) {
        invalidPlayers += 1;
        return;
      }

      if (enrollmentRegistered.has(playerId)) {
        alreadyRegistered += 1;
        return;
      }

      const playerType = playerTypeIdx !== -1 ? String(row[playerTypeIdx] || '').toLowerCase() : '';
      if (playerType === 'becado') {
        skippedScholarships += 1;
        return;
      }

      const playerState = playerStateIdx !== -1 ? String(row[playerStateIdx] || '').toLowerCase() : '';
      if (playerState && playerState !== 'activo') {
        skippedInactive += 1;
        return;
      }

      const paymentId = 'ENR_' + Utilities.getUuid();
      const fullName = [
        playerNameIdx !== -1 ? String(row[playerNameIdx] || '').trim() : '',
        playerLastNameIdx !== -1 ? String(row[playerLastNameIdx] || '').trim() : ''
      ].join(' ').trim();

      const enrollmentRow = [
        paymentId,
        playerId,
        'Matrícula',
        enrollmentFee,
        new Date(),
        'Pagado',
        'Sistema Automático',
        'Cargo Automático',
        'Matrícula retroactiva',
        0
      ];

      rowsToAppend.push(enrollmentRow);
      enrollmentRegistered.add(playerId);

      details.push({
        playerId: playerId,
        nombre: fullName
      });
    });

    if (rowsToAppend.length > 0) {
      paymentsSheet.getRange(
        paymentsSheet.getLastRow() + 1,
        1,
        rowsToAppend.length,
        rowsToAppend[0].length
      ).setValues(rowsToAppend);
      SpreadsheetApp.flush();
    }

    Logger.log(`✅ Matrículas generadas: ${rowsToAppend.length}`);
    Logger.log(`ℹ️ Ya registradas: ${alreadyRegistered}`);
    Logger.log(`ℹ️ Becados omitidos: ${skippedScholarships}`);
    Logger.log(`ℹ️ Jugadores inactivos omitidos: ${skippedInactive}`);

    return {
      success: true,
      message: `Matrículas aseguradas: ${rowsToAppend.length} nuevos registros`,
      created: rowsToAppend.length,
      alreadyRegistered: alreadyRegistered,
      skippedScholarships: skippedScholarships,
      skippedInactive: skippedInactive,
      invalidPlayers: invalidPlayers,
      processedPlayers: playersData.length - 1,
      enrollmentFee: enrollmentFee,
      sample: details.slice(0, 10)
    };
  } catch (error) {
    Logger.log('❌ Error asegurando matrículas: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * OBTENER ESTADO DE CUENTA DE UN JUGADOR
 * Retorna todos los cargos y pagos del jugador
 */
function getPlayerAccountStatement(playerId) {
  try {
    Logger.log('=== OBTENIENDO ESTADO DE CUENTA ===');
    Logger.log('Jugador ID:', playerId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    const statement = {
      playerId: playerId,
      cargos: [],      // Mensualidades, matrícula, cobros extras pendientes
      pagos: [],       // Pagos realizados
      totalCargos: 0,
      totalPagos: 0,
      saldo: 0
    };
    
    if (!paymentsSheet) {
      return statement;
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return statement;
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const montoIdx = headers.indexOf('Monto');
    const estadoIdx = headers.indexOf('Estado');
    const fechaIdx = headers.indexOf('Fecha');
    const referenciaIdx = headers.indexOf('Referencia');
    
    rows.forEach(row => {
      const jugadorId = String(row[jugadorIdIdx] || '');
      
      if (jugadorId === playerId) {
        const tipo = String(row[tipoIdx] || '');
        const monto = parseFloat(row[montoIdx] || 0);
        const estado = String(row[estadoIdx] || '');
        const fecha = row[fechaIdx];
        const referencia = String(row[referenciaIdx] || '');
        
        const transaction = {
          tipo: tipo,
          monto: monto,
          estado: estado,
          fecha: fecha instanceof Date ? fecha.toISOString() : String(fecha),
          referencia: referencia
        };
        
        // Clasificar transacciones CORRECTAMENTE
        const esCobro = estado === 'Cobro Registrado' || referencia === 'Cobro Extra';
        
        if (estado === 'Pendiente') {
          // Es un cargo pendiente de pago (Matrícula, Mensualidad)
          statement.cargos.push(transaction);
          statement.totalCargos += monto;
        } else if (estado === 'Pagado') {
          // Es un pago realizado (resta del saldo)
          statement.pagos.push(transaction);
          statement.totalPagos += monto;
        } else if (esCobro) {
          // Es un cargo extra ya aplicado (Uniforme, etc.) - suma al saldo
          statement.cargos.push(transaction);
          statement.totalCargos += monto;
        }
      }
    });
    
    // Calcular saldo neto
    statement.saldo = statement.totalCargos - statement.totalPagos;
    
    Logger.log(`Estado de cuenta - Cargos: $${statement.totalCargos}, Pagos: $${statement.totalPagos}, Saldo: $${statement.saldo}`);
    
    return statement;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo estado de cuenta: ' + error.toString());
    return {
      playerId: playerId,
      cargos: [],
      pagos: [],
      totalCargos: 0,
      totalPagos: 0,
      saldo: 0,
      error: error.toString()
    };
  }
}

/**
 * OBTENER MÉTRICAS CONTABLES GLOBALES
 * Suma todos los estados de cuenta de todos los jugadores
 */
function getGlobalAccountingMetrics() {
  try {
    Logger.log('=== OBTENIENDO MÉTRICAS CONTABLES GLOBALES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    const metrics = {
      // Ingresos (basados en pagos de jugadores)
      totalMatriculas: 0,
      totalMensualidades: 0,
      totalCobrosExtras: 0,
      totalIngresos: 0,
      
      // Pendientes (basados en cargos pendientes de jugadores)
      totalPendiente: 0,
      
      // Gastos (de la hoja de Gastos)
      totalGastos: 0,
      
      // Balance
      balanceNeto: 0,
      
      // Jugadores
      totalJugadores: 0,
      jugadoresMorosos: 0,
      jugadoresAlDia: 0,
      
      // Detalles
      detallesPorJugador: []
    };
    
    if (!playersSheet) {
      Logger.log('⚠️ Hoja de Jugadores no encontrada');
      return metrics;
    }
    
    const playersData = playersSheet.getDataRange().getValues();
    
    if (playersData.length <= 1) {
      Logger.log('⚠️ No hay jugadores');
      return metrics;
    }
    
    const rows = playersData.slice(1);
    metrics.totalJugadores = rows.length;
    
    // Procesar cada jugador
    rows.forEach((row, index) => {
      const playerId = String(row[0] || '');
      const nombre = String(row[1] || '');
      const apellidos = String(row[2] || '');
      
      if (playerId) {
        // Obtener estado de cuenta del jugador
        const statement = getPlayerAccountStatement(playerId);
        
        // Clasificar TODOS los movimientos (pagos Y cargos)
        // PAGOS (ingresos reales - estado "Pagado")
        statement.pagos.forEach(pago => {
          const tipo = pago.tipo.toLowerCase();
          
          if (index < 2) {
            Logger.log(`    Pago: ${tipo} - $${pago.monto} - Estado: ${pago.estado}`);
          }
          
          if (tipo.includes('matrícula') || tipo.includes('matricula')) {
            metrics.totalMatriculas += pago.monto;
          } else if (tipo.includes('mensualidad')) {
            metrics.totalMensualidades += pago.monto;
          } else {
            metrics.totalCobrosExtras += pago.monto;
          }
          
          metrics.totalIngresos += pago.monto;
        });
        
        // CARGOS (pendientes)
        statement.cargos.forEach(cargo => {
          if (cargo.estado === 'Pendiente') {
            metrics.totalPendiente += cargo.monto;
          }
        });
        
        // Clasificar jugadores
        if (statement.saldo > 0) {
          metrics.jugadoresMorosos++;
        } else {
          metrics.jugadoresAlDia++;
        }
        
        // Guardar detalle
        metrics.detallesPorJugador.push({
          id: playerId,
          nombre: `${nombre} ${apellidos}`.trim(),
          saldo: statement.saldo,
          cargos: statement.totalCargos,
          pagos: statement.totalPagos
        });
        
        if (index < 3) {
          Logger.log(`  Jugador ${index + 1}: ${nombre} ${apellidos} - Saldo: $${statement.saldo}`);
        }
      }
    });
    
    // Procesar gastos del sistema
    const expensesSheet = ss.getSheetByName('Gastos');
    if (expensesSheet) {
      const expensesData = expensesSheet.getDataRange().getValues();
      if (expensesData.length > 1) {
        const expensesRows = expensesData.slice(1);
        expensesRows.forEach(row => {
          const monto = parseFloat(row[2] || 0);
          metrics.totalGastos += monto;
        });
      }
    }
    
    // Calcular balance neto
    metrics.balanceNeto = metrics.totalIngresos - metrics.totalGastos;
    
    Logger.log('=== MÉTRICAS GLOBALES ===');
    Logger.log(`Total Ingresos: $${metrics.totalIngresos}`);
    Logger.log(`Total Gastos: $${metrics.totalGastos}`);
    Logger.log(`Balance Neto: $${metrics.balanceNeto}`);
    Logger.log(`Jugadores Morosos: ${metrics.jugadoresMorosos}`);
    
    return metrics;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo métricas globales: ' + error.toString());
    return {
      error: true,
      message: error.toString()
    };
  }
}

/**
 * CORREGIR TIPO DE PAGOS (Convertir primeras "Mensualidades" a "Matrículas")
 * Solo se ejecuta una vez para corregir datos históricos
 */
function fixPaymentTypes() {
  try {
    Logger.log('=== CORRIGIENDO TIPOS DE PAGO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      return { success: false, message: 'Hoja de Pagos no existe' };
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, message: 'Hoja vacía', fixed: 0 };
    }
    
    const headers = data[0];
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const referenciaIdx = headers.indexOf('Referencia');
    
    // Rastrear qué jugadores ya tienen matrícula
    const playersWithEnrollment = new Set();
    let fixed = 0;
    
    // Primera pasada: identificar jugadores que ya tienen matrícula
    for (let i = 1; i < data.length; i++) {
      const tipo = String(data[i][tipoIdx] || '');
      const jugadorId = String(data[i][jugadorIdIdx] || '');
      
      if (tipo.toLowerCase().includes('matrícula') || tipo.toLowerCase().includes('matricula')) {
        playersWithEnrollment.add(jugadorId);
      }
    }
    
    // Segunda pasada: convertir la PRIMERA "Mensualidad" de cada jugador a "Matrícula"
    for (let i = 1; i < data.length; i++) {
      const tipo = String(data[i][tipoIdx] || '');
      const jugadorId = String(data[i][jugadorIdIdx] || '');
      const referencia = String(data[i][referenciaIdx] || '');
      
      // Si es Mensualidad Y el jugador NO tiene matrícula registrada
      if (tipo === 'Mensualidad' && !playersWithEnrollment.has(jugadorId)) {
        // Convertir a Matrícula
        paymentsSheet.getRange(i + 1, tipoIdx + 1).setValue('Matrícula');
        paymentsSheet.getRange(i + 1, referenciaIdx + 1).setValue('Cargo de Matrícula (corregido)');
        
        playersWithEnrollment.add(jugadorId); // Marcar como que ya tiene matrícula
        fixed++;
        
        Logger.log(`✓ Convertido a Matrícula: Jugador ${jugadorId}`);
      }
    }
    
    SpreadsheetApp.flush();
    
    Logger.log(`✅ ${fixed} registros corregidos`);
    
    return {
      success: true,
      message: `${fixed} registros convertidos de "Mensualidad" a "Matrícula"`,
      fixed: fixed
    };
    
  } catch (error) {
    Logger.log('❌ Error corrigiendo tipos: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * AGREGAR MATRÍCULAS FALTANTES
 * Para jugadores que fueron aprobados antes del sistema automático
 */
function addMissingEnrollments() {
  try {
    Logger.log('=== AGREGANDO MATRÍCULAS FALTANTES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!playersSheet || !paymentsSheet) {
      return { success: false, message: 'Hojas necesarias no encontradas' };
    }
    
    const playersData = playersSheet.getDataRange().getValues();
    
    if (playersData.length <= 1) {
      return { success: true, message: 'No hay jugadores', added: 0 };
    }
    
    const paymentsData = paymentsSheet.getDataRange().getValues();
    const paymentsHeaders = paymentsData[0];
    const paymentsRows = paymentsData.slice(1);
    
    const jugadorIdIdx = paymentsHeaders.indexOf('Jugador ID');
    const tipoIdx = paymentsHeaders.indexOf('Tipo');
    
    // Identificar jugadores que YA tienen matrícula
    const playersWithEnrollment = new Set();
    paymentsRows.forEach(row => {
      const tipo = String(row[tipoIdx] || '');
      const jugadorId = String(row[jugadorIdIdx] || '');
      
      if (tipo.toLowerCase().includes('matrícula') || tipo.toLowerCase().includes('matricula')) {
        playersWithEnrollment.add(jugadorId);
      }
    });
    
    // Agregar matrícula a jugadores que no la tienen
    const playersRows = playersData.slice(1);
    let added = 0;
    
    playersRows.forEach(row => {
      const playerId = String(row[0] || '');
      const tipo = String(row[13] || ''); // N - Tipo
      const nombre = String(row[1] || '');
      const apellidos = String(row[2] || '');
      
      if (playerId && !playersWithEnrollment.has(playerId)) {
        // Este jugador NO tiene matrícula registrada
        const isScholarship = tipo === 'becado';
        
        Logger.log(`Agregando matrícula a: ${nombre} ${apellidos} (${playerId})`);
        const result = registerEnrollmentFee(playerId, isScholarship);
        
        if (result.success) {
          added++;
        }
        
        Utilities.sleep(200); // Pequeña pausa
      }
    });
    
    Logger.log(`✅ ${added} matrículas agregadas`);
    
    return {
      success: true,
      message: `${added} matrículas agregadas a jugadores que no las tenían`,
      added: added
    };
    
  } catch (error) {
    Logger.log('❌ Error agregando matrículas: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * NOTA: La función getFinancialConfig() está definida en Config.gs
 * y retorna la estructura correcta con ENROLLMENT_FEE, MONTHLY_FEE, FAMILY_MONTHLY_FEE
 * Esta función duplicada ha sido eliminada para evitar conflictos
 */

