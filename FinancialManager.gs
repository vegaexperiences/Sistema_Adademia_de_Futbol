/**
 * ========================================
 * ARCHIVO: FinancialManager.gs
 * DESCRIPCIÓN: Gestión financiera completa del sistema de Academia de Fútbol
 * FUNCIONES: Pagos, gastos, reportes financieros, gráficas, descuentos
 * ========================================
 */

/**
 * OBTENER MÉTRICAS FINANCIERAS REALES DEL SISTEMA
 * AHORA BASADO EN EL CORE CONTABLE (AccountingCore.gs)
 */
function getFinancialMetrics() {
  try {
    Logger.log('=== OBTENIENDO MÉTRICAS FINANCIERAS (CORE CONTABLE) ===');
    
    // Usar el nuevo core contable que suma todos los estados de cuenta
    const coreMetrics = getGlobalAccountingMetrics();
    
    if (coreMetrics.error) {
      throw new Error(coreMetrics.message);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Usar métricas del core contable
    const metrics = {
      // Ingresos (de estados de cuenta de jugadores)
      totalIncome: coreMetrics.totalIngresos,
      monthlyIncome: 0, // Calcularemos del mes actual
      pendingIncome: coreMetrics.totalPendiente,
      paidIncome: coreMetrics.totalIngresos,
      
      // Desglose de ingresos
      totalMatriculas: coreMetrics.totalMatriculas,
      totalMensualidades: coreMetrics.totalMensualidades,
      totalCobrosExtras: coreMetrics.totalCobrosExtras,
      
      // Egresos
      totalExpenses: coreMetrics.totalGastos,
      monthlyExpenses: 0, // Calcularemos abajo
      
      // Balance
      netBalance: coreMetrics.balanceNeto,
      monthlyBalance: 0,
      
      // Jugadores
      totalPlayers: coreMetrics.totalJugadores,
      activePlayers: coreMetrics.totalJugadores,
      scholarshipPlayers: 0,
      overduePlayers: coreMetrics.jugadoresMorosos,
      jugadoresAlDia: coreMetrics.jugadoresAlDia,
      
      // Detalles
      paymentsByMethod: {},
      expensesByCategory: {},
      monthlyTrend: [],
      detallesPorJugador: coreMetrics.detallesPorJugador
    };
    
    // Procesar datos adicionales (métodos de pago, gastos por categoría, etc.)
    const paymentsSheet = ss.getSheetByName('Pagos');
    const expensesSheet = ss.getSheetByName('Gastos');
    
    // 1. Procesar métodos de pago y gastos del mes
    if (paymentsSheet) {
      const paymentsData = paymentsSheet.getDataRange().getValues();
      if (paymentsData.length > 1) {
        const headers = paymentsData[0];
        const rows = paymentsData.slice(1);
        
        const metodoIdx = headers.indexOf('Método Pago');
        const fechaIdx = headers.indexOf('Fecha');
        const estadoIdx = headers.indexOf('Estado');
        const montoIdx = headers.indexOf('Monto');
        
        rows.forEach(row => {
          const metodo = String(row[metodoIdx] || 'Otro');
          const fecha = row[fechaIdx];
          const estado = String(row[estadoIdx] || '');
          const monto = parseFloat(row[montoIdx] || 0);
          
          // Solo contar pagos realizados para métodos de pago
          if (estado === 'Pagado') {
            if (!metrics.paymentsByMethod[metodo]) {
              metrics.paymentsByMethod[metodo] = 0;
            }
            metrics.paymentsByMethod[metodo] += monto;
          }
          
          // Calcular ingresos del mes
          if (fecha instanceof Date && estado === 'Pagado') {
            if (fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear) {
              metrics.monthlyIncome += monto;
            }
          }
        });
      }
    }
    
    // 2. Procesar gastos por categoría
    if (expensesSheet) {
      const expensesData = expensesSheet.getDataRange().getValues();
      if (expensesData.length > 1) {
        const headers = expensesData[0];
        const rows = expensesData.slice(1);
        
        const categoriaIdx = headers.indexOf('Categoría');
        const fechaIdx = headers.indexOf('Fecha');
        const montoIdx = headers.indexOf('Monto');
        
        rows.forEach(row => {
          const categoria = String(row[categoriaIdx] || 'Otro');
          const fecha = row[fechaIdx];
          const monto = parseFloat(row[montoIdx] || 0);
          
          // Contar por categoría
          if (!metrics.expensesByCategory[categoria]) {
            metrics.expensesByCategory[categoria] = 0;
          }
          metrics.expensesByCategory[categoria] += monto;
          
          // Gastos del mes
          if (fecha instanceof Date) {
            if (fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear) {
              metrics.monthlyExpenses += monto;
            }
          }
        });
      }
    }
    
    // 3. Contar becados
    if (playersSheet) {
      const playersData = playersSheet.getDataRange().getValues();
      if (playersData.length > 1) {
        const rows = playersData.slice(1);
        rows.forEach(row => {
          const tipo = String(row[13] || ''); // N - Tipo
          if (tipo === 'becado') {
            metrics.scholarshipPlayers++;
          }
        });
      }
    }
    
    // Calcular balance mensual
    metrics.monthlyBalance = metrics.monthlyIncome - metrics.monthlyExpenses;
    
    Logger.log('✅ Métricas financieras calculadas');
    Logger.log('Ingresos totales:', metrics.totalIncome);
    Logger.log('Gastos totales:', metrics.totalExpenses);
    Logger.log('Balance neto:', metrics.netBalance);
    
    return metrics;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo métricas financieras: ' + error.toString());
    return {
      error: true,
      message: error.toString()
    };
  }
}

/**
 * REGISTRAR UN NUEVO GASTO/EGRESO
 */
function registerExpense(expenseData) {
  try {
    Logger.log('=== REGISTRANDO NUEVO GASTO ===');
    Logger.log('Datos:', JSON.stringify(expenseData));
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let expensesSheet = ss.getSheetByName('Gastos');
    
    // Crear hoja si no existe
    if (!expensesSheet) {
      Logger.log('Creando hoja de Gastos...');
      expensesSheet = ss.insertSheet('Gastos');
      
      const headers = [
        'ID Gasto', 'Descripción', 'Monto', 'Fecha', 
        'Categoría', 'Método de Pago', 'Referencia', 'Observaciones'
      ];
      
      expensesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      expensesSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1e3a8a')
        .setFontColor('white');
    }
    
    // Generar ID único
    const expenseId = 'EXP_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Crear fila de gasto
    const expenseRow = [
      expenseId,
      expenseData.description || '',
      parseFloat(expenseData.amount) || 0,
      new Date(),
      expenseData.category || 'Otro',
      expenseData.paymentMethod || 'Efectivo',
      expenseData.reference || '',
      expenseData.observations || ''
    ];
    
    expensesSheet.appendRow(expenseRow);
    SpreadsheetApp.flush();
    
    Logger.log('✅ Gasto registrado exitosamente: ' + expenseId);
    
    return {
      success: true,
      message: 'Gasto registrado exitosamente',
      expenseId: expenseId,
      amount: expenseData.amount
    };
    
  } catch (error) {
    Logger.log('❌ Error registrando gasto: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * OBTENER TODOS LOS PAGOS
 */
function getAllPayments() {
  try {
    Logger.log('=== OBTENIENDO TODOS LOS PAGOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      Logger.log('⚠️ Hoja de Pagos no existe');
      return [];
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('⚠️ Hoja de Pagos está vacía');
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Obtener índices de columnas
    const idIdx = headers.indexOf('ID');
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const montoIdx = headers.indexOf('Monto');
    const fechaIdx = headers.indexOf('Fecha');
    const estadoIdx = headers.indexOf('Estado');
    const metodoIdx = headers.indexOf('Método Pago');
    const referenciaIdx = headers.indexOf('Referencia');
    const observacionesIdx = headers.indexOf('Observaciones');
    
    const payments = rows.map(row => {
      // Obtener nombre del jugador
      let jugadorNombre = row[jugadorIdIdx] || 'Desconocido';
      
      // Intentar obtener nombre completo del jugador
      const jugadorId = String(row[jugadorIdIdx] || '');
      if (jugadorId) {
        const playersSheet = ss.getSheetByName('Jugadores');
        if (playersSheet) {
          const playersData = playersSheet.getDataRange().getValues();
          const playerRow = playersData.find(p => String(p[0]) === jugadorId);
          if (playerRow) {
            jugadorNombre = `${playerRow[1]} ${playerRow[2]}`.trim();
          }
        }
      }
      
      return {
        'ID': String(row[idIdx] || ''),
        'ID Pago': String(row[idIdx] || ''),
        'Jugador ID': jugadorId,
        'Jugador Nombre': jugadorNombre,
        'Tipo': String(row[tipoIdx] || ''),
        'Monto': parseFloat(row[montoIdx] || 0),
        'Fecha': row[fechaIdx] instanceof Date ? row[fechaIdx].toISOString() : String(row[fechaIdx] || ''),
        'Estado': String(row[estadoIdx] || 'Pendiente'),
        'Método Pago': String(row[metodoIdx] || ''),
        'Método': String(row[metodoIdx] || ''),
        'Referencia': String(row[referenciaIdx] || ''),
        'Observaciones': String(row[observacionesIdx] || '')
      };
    });
    
    Logger.log(`✅ ${payments.length} pagos obtenidos`);
    
    return payments;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo pagos: ' + error.toString());
    return [];
  }
}

/**
 * OBTENER TODOS LOS GASTOS
 */
function getAllExpenses() {
  try {
    Logger.log('=== OBTENIENDO TODOS LOS GASTOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      return [];
    }
    
    const data = expensesSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const expenses = rows.map(row => {
      return {
        'ID Gasto': String(row[0] || ''),
        'Descripción': String(row[1] || ''),
        'Monto': parseFloat(row[2] || 0),
        'Fecha': row[3] instanceof Date ? row[3].toISOString() : String(row[3] || ''),
        'Categoría': String(row[4] || ''),
        'Método de Pago': String(row[5] || ''),
        'Referencia': String(row[6] || ''),
        'Observaciones': String(row[7] || '')
      };
    });
    
    Logger.log(`✅ ${expenses.length} gastos obtenidos`);
    
    return expenses;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo gastos: ' + error.toString());
    return [];
  }
}

/**
 * Verificar y crear hojas financieras si no existen
 */
function ensureFinancialSheetsExist() {
  try {
    Logger.log('=== VERIFICANDO HOJAS FINANCIERAS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let createdSheets = [];
    
    // Verificar hoja de Pagos
    let paymentsSheet = ss.getSheetByName('Pagos');
    if (!paymentsSheet) {
      Logger.log('Creando hoja de Pagos...');
      paymentsSheet = ss.insertSheet('Pagos');
      
      // Configurar headers (deben coincidir con los usados en AccountingCore.gs)
      const paymentHeaders = [
        'ID', 'Jugador ID', 'Tipo', 'Monto', 'Fecha', 
        'Estado', 'Método Pago', 'Referencia', 'Observaciones', 'Descuento Aplicado'
      ];
      paymentsSheet.getRange(1, 1, 1, paymentHeaders.length).setValues([paymentHeaders]);
      createdSheets.push('Pagos');
    }
    
    // Verificar hoja de Gastos
    let expensesSheet = ss.getSheetByName('Gastos');
    if (!expensesSheet) {
      Logger.log('Creando hoja de Gastos...');
      expensesSheet = ss.insertSheet('Gastos');
      
      // Configurar headers
      const expenseHeaders = [
        'ID Gasto', 'Descripción', 'Monto', 'Fecha', 
        'Categoría', 'Método de Pago', 'Referencia', 'Observaciones'
      ];
      expensesSheet.getRange(1, 1, 1, expenseHeaders.length).setValues([expenseHeaders]);
      createdSheets.push('Gastos');
    }
    
    Logger.log('Hojas financieras verificadas. Creadas:', createdSheets);
    
    return {
      success: true,
      message: `✅ Hojas financieras verificadas${createdSheets.length > 0 ? '. Creadas: ' + createdSheets.join(', ') : ''}`,
      createdSheets: createdSheets
    };
    
  } catch (error) {
    Logger.log('Error verificando hojas financieras: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * Registra un nuevo pago
 */
function recordPayment(paymentData) {
  try {
    // Validar datos del pago
    const validation = validatePaymentData(paymentData);
    if (!validation.isValid) {
      throw new Error('Datos de pago inválidos: ' + validation.errors.join(', '));
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      throw new Error('Hoja de Pagos no encontrada');
    }
    
    // Generar ID único para el pago
    const paymentId = generatePaymentId();
    
    // Preparar datos para insertar
    const rowData = [
      paymentId,
      paymentData.playerId,
      paymentData.type,
      parseFloat(paymentData.amount),
      new Date(paymentData.date),
      paymentData.state || 'Pagado',
      paymentData.method || 'Efectivo',
      paymentData.reference || '',
      paymentData.observations || '',
      paymentData.discountApplied || 0
    ];
    
    // Insertar en la hoja
    paymentsSheet.appendRow(rowData);
    
    // Actualizar métricas financieras
    updateFinancialMetrics();
    
    Logger.log(`Pago registrado: ${paymentId} - ${paymentData.amount} para jugador ${paymentData.playerId}`);
    return paymentId;
    
  } catch (error) {
    Logger.log('Error registrando pago: ' + error.toString());
    throw error;
  }
}

/**
 * Registra un gasto del sistema
 */
function recordExpense(expenseData) {
  try {
    // Validar datos del gasto
    const validation = validateExpenseData(expenseData);
    if (!validation.isValid) {
      throw new Error('Datos de gasto inválidos: ' + validation.errors.join(', '));
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      expensesSheet = ss.insertSheet('Gastos');
      const headers = ['ID', 'Descripción', 'Monto', 'Fecha', 'Categoría', 'Método Pago', 'Observaciones'];
      expensesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Generar ID único para el gasto
    const expenseId = generateExpenseId();
    
    // Preparar datos para insertar
    const rowData = [
      expenseId,
      expenseData.description,
      parseFloat(expenseData.amount),
      new Date(expenseData.date),
      expenseData.category,
      expenseData.method || 'Efectivo',
      expenseData.observations || ''
    ];
    
    // Insertar en la hoja
    expensesSheet.appendRow(rowData);
    
    // Actualizar métricas financieras
    updateFinancialMetrics();
    
    Logger.log(`Gasto registrado: ${expenseId} - ${expenseData.amount} - ${expenseData.description}`);
    return expenseId;
    
  } catch (error) {
    Logger.log('Error registrando gasto: ' + error.toString());
    throw error;
  }
}

/**
 * Obtiene el resumen financiero del sistema
 */
function getFinancialSummary(period = 'current_month') {
  try {
    Logger.log('=== OBTENIENDO RESUMEN FINANCIERO ===');
    Logger.log('Período solicitado:', period);
    Logger.log('DEBUG: Inicio de getFinancialSummary');
    
    // Asegurar que las hojas financieras existen
    const sheetsResult = ensureFinancialSheetsExist();
    Logger.log('Resultado de verificación de hojas:', sheetsResult);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    const expensesSheet = ss.getSheetByName('Gastos');
    
    Logger.log('Hoja de Pagos encontrada:', paymentsSheet ? 'Sí' : 'No');
    Logger.log('Hoja de Gastos encontrada:', expensesSheet ? 'Sí' : 'No');
    
    let startDate, endDate;
    const now = new Date();
    
    // Determinar período
    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    // Calcular ingresos
    let totalIncome = 0;
    let incomeByType = {};
    
    if (paymentsSheet) {
      try {
        const paymentsData = paymentsSheet.getDataRange().getValues();
        Logger.log('Filas en hoja de Pagos:', paymentsData.length);
        
        if (paymentsData.length > 1) {
          // Obtener headers y encontrar índices de columnas
          const headers = paymentsData[0];
          const fechaIdx = headers.indexOf('Fecha');
          const estadoIdx = headers.indexOf('Estado');
          const montoIdx = headers.indexOf('Monto');
          const tipoIdx = headers.indexOf('Tipo');
          
          const payments = paymentsData.slice(1).filter(row => {
            // Verificar que la fila tenga datos
            if (!row || row.length < Math.max(fechaIdx, estadoIdx, montoIdx) + 1) return false;
            
            const paymentDate = new Date(row[fechaIdx]);
            const isValid = !isNaN(paymentDate.getTime()) && paymentDate >= startDate && paymentDate <= endDate && row[estadoIdx] === 'Pagado';
            return isValid;
          });
          
          Logger.log('Pagos encontrados en el período:', payments.length);
          
          payments.forEach(payment => {
            const amount = parseFloat(payment[montoIdx]) || 0;
            const type = payment[tipoIdx] || 'Sin categoría';
            
            totalIncome += amount;
            incomeByType[type] = (incomeByType[type] || 0) + amount;
          });
        } else {
          Logger.log('Hoja de Pagos está vacía (solo headers)');
        }
      } catch (paymentsError) {
        Logger.log('Error procesando pagos:', paymentsError.toString());
      }
    }
    
    // Calcular gastos
    let totalExpenses = 0;
    let expensesByCategory = {};
    
    if (expensesSheet) {
      try {
        const expensesData = expensesSheet.getDataRange().getValues();
        Logger.log('Filas en hoja de Gastos:', expensesData.length);
        
        if (expensesData.length > 1) {
          // Obtener headers y encontrar índices de columnas
          const headers = expensesData[0];
          const fechaIdx = headers.indexOf('Fecha');
          const montoIdx = headers.indexOf('Monto');
          const categoriaIdx = headers.indexOf('Categoría');
          
          const expenses = expensesData.slice(1).filter(row => {
            // Verificar que la fila tenga datos
            if (!row || row.length < Math.max(fechaIdx, montoIdx) + 1) return false;
            
            const expenseDate = new Date(row[fechaIdx]);
            return !isNaN(expenseDate.getTime()) && expenseDate >= startDate && expenseDate <= endDate;
          });
          
          Logger.log('Gastos encontrados en el período:', expenses.length);
          
          expenses.forEach(expense => {
            const amount = parseFloat(expense[montoIdx]) || 0;
            const category = expense[categoriaIdx] || 'Sin categoría';
            
            totalExpenses += amount;
            expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
          });
        } else {
          Logger.log('Hoja de Gastos está vacía (solo headers)');
        }
      } catch (expensesError) {
        Logger.log('Error procesando gastos:', expensesError.toString());
      }
    }
    
    // Calcular ganancia neta
    const netProfit = totalIncome - totalExpenses;
    
    const result = {
      period: period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netProfit: netProfit,
      incomeByType: incomeByType,
      expensesByCategory: expensesByCategory,
      profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
    };
    
    Logger.log('Resumen financiero calculado:', JSON.stringify(result, null, 2));
    Logger.log('Total de ingresos:', totalIncome);
    Logger.log('Total de gastos:', totalExpenses);
    Logger.log('Ganancia neta:', netProfit);
    Logger.log('Datos de gastos por categoría:', expensesByCategory);
    
    return result;
    
  } catch (error) {
    Logger.log('Error obteniendo resumen financiero: ' + error.toString());
    Logger.log('Stack trace:', error.stack);
    
    // Devolver un objeto con valores por defecto en lugar de null
    const now = new Date();
    return {
      period: period,
      startDate: now.toISOString(),
      endDate: now.toISOString(),
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      incomeByType: {},
      expensesByCategory: {},
      profitMargin: 0,
      error: true,
      message: 'Error obteniendo datos financieros: ' + error.toString()
    };
  }
}

/**
 * Obtiene datos para gráficas financieras
 */
function getFinancialChartData(period = 'last_12_months') {
  try {
    const chartData = {
      income: [],
      expenses: [],
      profit: [],
      months: [],
      incomeByType: {
        enrollment: 0,
        monthly: 0,
        extraCharge: 0,
        other: 0
      }
    };
    
    const now = new Date();
    let monthsToShow = 12;
    
    if (period === 'last_6_months') {
      monthsToShow = 6;
    } else if (period === 'last_3_months') {
      monthsToShow = 3;
    }
    
    // Generar datos para los últimos meses
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthName = monthDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      chartData.months.push(monthName);
      
      // Calcular ingresos del mes
      const monthIncome = getMonthlyIncome(monthDate, monthEnd);
      chartData.income.push(monthIncome);
      
      // Calcular gastos del mes
      const monthExpenses = getMonthlyExpenses(monthDate, monthEnd);
      chartData.expenses.push(monthExpenses);
      
      // Calcular ganancia del mes
      chartData.profit.push(monthIncome - monthExpenses);
    }
    
    // Obtener resumen financiero del período completo para ingresos por tipo
    const summary = getFinancialSummary(period);
    if (summary && summary.incomeByType) {
      // Mapear los tipos de ingreso del resumen
      Object.keys(summary.incomeByType).forEach(type => {
        const amount = summary.incomeByType[type];
        const typeLower = type.toLowerCase();
        
        if (typeLower.includes('matrícula') || typeLower.includes('matricula') || typeLower.includes('enrollment')) {
          chartData.incomeByType.enrollment += amount;
        } else if (typeLower.includes('mensualidad') || typeLower.includes('monthly')) {
          chartData.incomeByType.monthly += amount;
        } else if (typeLower.includes('extra') || typeLower.includes('cargo') || typeLower.includes('adicional')) {
          chartData.incomeByType.extraCharge += amount;
        } else {
          chartData.incomeByType.other += amount;
        }
      });
    }
    
    Logger.log('📊 Chart Data con incomeByType:', JSON.stringify(chartData, null, 2));
    
    return chartData;
    
  } catch (error) {
    Logger.log('Error obteniendo datos de gráficas: ' + error.toString());
    return {
      income: [],
      expenses: [],
      profit: [],
      months: [],
      incomeByType: {
        enrollment: 0,
        monthly: 0,
        extraCharge: 0,
        other: 0
      }
    };
  }
}

/**
 * Obtiene ingresos de un mes específico
 */
function getMonthlyIncome(startDate, endDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      return 0;
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    const payments = data.slice(1).filter(row => {
      const paymentDate = new Date(row[4]);
      return paymentDate >= startDate && paymentDate <= endDate && row[5] === 'Pagado';
    });
    
    return payments.reduce((total, payment) => {
      return total + (parseFloat(payment[3]) || 0);
    }, 0);
    
  } catch (error) {
    Logger.log('Error calculando ingresos mensuales: ' + error.toString());
    return 0;
  }
}

/**
 * Obtiene gastos de un mes específico
 */
function getMonthlyExpenses(startDate, endDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      return 0;
    }
    
    const data = expensesSheet.getDataRange().getValues();
    const expenses = data.slice(1).filter(row => {
      const expenseDate = new Date(row[3]);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
    
    return expenses.reduce((total, expense) => {
      return total + (parseFloat(expense[2]) || 0);
    }, 0);
    
  } catch (error) {
    Logger.log('Error calculando gastos mensuales: ' + error.toString());
    return 0;
  }
}

/**
 * Obtiene datos para gráfica de población de jugadores
 */
function getPlayerPopulationChartData() {
  try {
    const stats = getPlayerStatistics();
    
    if (!stats) {
      return null;
    }
    
    return {
      categories: Object.keys(stats.byCategory),
      counts: Object.values(stats.byCategory),
      total: stats.total,
      active: stats.active,
      scholarship: stats.scholarship
    };
    
  } catch (error) {
    Logger.log('Error obteniendo datos de población: ' + error.toString());
    return null;
  }
}

/**
 * Genera pagos automáticos para el mes actual
 */
function generateMonthlyPayments() {
  try {
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
        paymentsGenerated: 0,
        message: `Generación de mensualidades pausada hasta ${startDate.toLocaleDateString('es-ES')}`
      };
    }
    
    const allPlayers = getAllPlayers();
    const financialConfig = getFinancialConfig();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let paymentsGenerated = 0;
    
    allPlayers.forEach(player => {
      // Solo generar pagos para jugadores activos que no sean becados
      if (player.Estado === 'Activo' && player.Tipo !== 'becado') {
        
        // Verificar si ya tiene pago para este mes
        const existingPayment = checkExistingMonthlyPayment(player.ID, currentMonth, currentYear);
        
        if (!existingPayment) {
          // Obtener monto correcto usando getPlayerMonthlyFee() que considera cédula de tutor
          const monthlyFeeInfo = getPlayerMonthlyFee(player.ID);
          
          if (!monthlyFeeInfo) {
            Logger.log(`No se pudo obtener información de mensualidad para ${player.ID}`);
            return; // Usar return en lugar de continue dentro de forEach
          }
          
          // Si es becado, no se genera pago
          if (monthlyFeeInfo.type === 'becado') {
            Logger.log(`Jugador ${player.ID} es becado, no se genera mensualidad`);
            return; // Usar return en lugar de continue dentro de forEach
          }
          
          // Obtener monto base de la información de mensualidad
          let amount = monthlyFeeInfo.amount;
          
          // Aplicar descuento si existe (el descuento se aplica sobre el monto base)
          if (player['Descuento %'] && player['Descuento %'] > 0) {
            amount = amount * (1 - player['Descuento %'] / 100);
          }
          
          // Generar pago
          const paymentData = {
            playerId: player.ID,
            type: 'Mensualidad',
            amount: amount,
            date: currentDate,
            state: 'Pendiente',
            method: 'Pendiente',
            observations: `Mensualidad ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} - ${monthlyFeeInfo.type}`
          };
          
          recordPayment(paymentData);
          paymentsGenerated++;
        }
      }
    });
    
    Logger.log(`${paymentsGenerated} pagos mensuales generados`);
    return paymentsGenerated;
    
  } catch (error) {
    Logger.log('Error generando pagos mensuales: ' + error.toString());
    return 0;
  }
}

/**
 * Verifica si ya existe un pago mensual para un jugador
 */
function checkExistingMonthlyPayment(playerId, month, year) {
  try {
    const paymentHistory = getPlayerPaymentHistory(playerId);
    
    return paymentHistory.some(payment => {
      const paymentDate = new Date(payment.Fecha);
      return paymentDate.getMonth() === month && 
             paymentDate.getFullYear() === year &&
             payment.Tipo === 'Mensualidad';
    });
    
  } catch (error) {
    Logger.log('Error verificando pago mensual existente: ' + error.toString());
    return false;
  }
}

/**
 * Actualiza las cuotas mensuales ya emitidas (Pendientes) con montos correctos
 * @param {boolean} confirm - Si es true, ejecuta la actualización. Si es false, solo retorna reporte
 */
function updateExistingMonthlyPayments(confirm) {
  try {
    Logger.log('=== ACTUALIZANDO CUOTAS MENSUALES EXISTENTES ===');
    Logger.log('Confirmación recibida:', confirm);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      throw new Error('No se encontró la hoja de Pagos');
    }
    
    const allData = paymentsSheet.getDataRange().getValues();
    if (allData.length <= 1) {
      return {
        success: true,
        message: 'No hay pagos registrados',
        reviewed: 0,
        updated: 0,
        unchanged: 0
      };
    }
    
    const headers = allData[0];
    const rows = allData.slice(1);
    
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const estadoIdx = headers.indexOf('Estado');
    const montoIdx = headers.indexOf('Monto');
    
    if (jugadorIdIdx === -1 || tipoIdx === -1 || estadoIdx === -1 || montoIdx === -1) {
      throw new Error('No se encontraron las columnas necesarias en la hoja de Pagos');
    }
    
    const paymentsToUpdate = [];
    let reviewed = 0;
    
    // Buscar pagos de mensualidad pendientes
    rows.forEach((row, index) => {
      const tipo = String(row[tipoIdx] || '').trim();
      const estado = String(row[estadoIdx] || '').trim();
      
      if (tipo === 'Mensualidad' && estado === 'Pendiente') {
        reviewed++;
        const playerId = String(row[jugadorIdIdx] || '').trim();
        const montoActual = parseFloat(row[montoIdx] || 0);
        
        if (!playerId) {
          Logger.log(`Pago en fila ${index + 2} sin Jugador ID, omitido`);
          return;
        }
        
        // Obtener monto correcto
        const monthlyFeeInfo = getPlayerMonthlyFee(playerId);
        
        if (!monthlyFeeInfo) {
          Logger.log(`No se pudo obtener información de mensualidad para jugador ${playerId}`);
          return;
        }
        
        // Si es becado, el monto debería ser 0
        if (monthlyFeeInfo.type === 'becado') {
          if (montoActual !== 0) {
            paymentsToUpdate.push({
              rowIndex: index + 2, // +2 porque index es 0-based y hay header en fila 1
              playerId: playerId,
              montoActual: montoActual,
              montoCorrecto: 0,
              razon: 'Jugador becado debe tener monto 0'
            });
          }
          return;
        }
        
        // Calcular monto correcto con descuento si aplica
        let montoCorrecto = monthlyFeeInfo.amount;
        
        // Obtener jugador para verificar descuento
        const player = getPlayerById(playerId);
        if (player && player['Descuento %'] && player['Descuento %'] > 0) {
          montoCorrecto = montoCorrecto * (1 - player['Descuento %'] / 100);
        }
        
        // Redondear a 2 decimales
        montoCorrecto = Math.round(montoCorrecto * 100) / 100;
        
        // Si el monto es diferente, agregar a la lista de actualizaciones
        if (Math.abs(montoActual - montoCorrecto) > 0.01) { // Tolerancia de 1 centavo
          paymentsToUpdate.push({
            rowIndex: index + 2,
            playerId: playerId,
            playerName: player ? `${player.Nombre} ${player.Apellidos}` : 'Desconocido',
            montoActual: montoActual,
            montoCorrecto: montoCorrecto,
            tipoMensualidad: monthlyFeeInfo.type,
            razon: `Monto incorrecto: $${montoActual.toFixed(2)} → $${montoCorrecto.toFixed(2)} (${monthlyFeeInfo.type})`
          });
        }
      }
    });
    
    // Si confirm es false, solo retornar reporte
    if (confirm !== true) {
      return {
        success: true,
        preview: true,
        message: `Se encontraron ${paymentsToUpdate.length} cuotas que necesitan actualización de ${reviewed} revisadas. Use confirm=true para ejecutar.`,
        reviewed: reviewed,
        toUpdate: paymentsToUpdate.length,
        unchanged: reviewed - paymentsToUpdate.length,
        paymentsToUpdate: paymentsToUpdate
      };
    }
    
    // Ejecutar actualización
    let updated = 0;
    const updatedPayments = [];
    
    paymentsToUpdate.forEach(payment => {
      try {
        // Actualizar monto en la hoja
        paymentsSheet.getRange(payment.rowIndex, montoIdx + 1).setValue(payment.montoCorrecto);
        updated++;
        
        updatedPayments.push({
          playerId: payment.playerId,
          playerName: payment.playerName,
          montoAnterior: payment.montoActual,
          montoNuevo: payment.montoCorrecto,
          razon: payment.razon
        });
        
        Logger.log(`Cuota actualizada para jugador ${payment.playerId}: $${payment.montoActual} → $${payment.montoCorrecto}`);
      } catch (error) {
        Logger.log(`Error actualizando cuota en fila ${payment.rowIndex}: ${error.toString()}`);
      }
    });
    
    Logger.log(`Actualización completada: ${updated} cuotas actualizadas de ${reviewed} revisadas`);
    
    return {
      success: true,
      message: `Actualización completada exitosamente`,
      reviewed: reviewed,
      updated: updated,
      unchanged: reviewed - updated,
      updatedPayments: updatedPayments
    };
    
  } catch (error) {
    Logger.log('Error actualizando cuotas mensuales: ' + error.toString());
    return {
      success: false,
      message: 'Error en actualización: ' + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Actualiza TODOS los pagos históricos de mensualidad (Pendiente y Pagado) con montos incorrectos
 * Esta función corrige los montos históricos basándose en la lógica actual de getPlayerMonthlyFee()
 */
function updateAllHistoricalMonthlyPayments(confirm) {
  try {
    Logger.log('=== ACTUALIZANDO TODAS LAS MENSUALIDADES HISTÓRICAS ===');
    Logger.log('Confirmación recibida:', confirm);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      throw new Error('No se encontró la hoja de Pagos');
    }
    
    // Leer TODOS los datos de la hoja de Pagos PRIMERO
    const allData = paymentsSheet.getDataRange().getValues();
    if (allData.length <= 1) {
      Logger.log('No hay pagos registrados en la hoja de Pagos');
      return {
        success: true,
        message: 'No hay pagos registrados en la hoja de Pagos',
        reviewed: 0,
        updated: 0,
        unchanged: 0,
        totalPlayers: 0,
        totalPaymentsFound: 0
      };
    }
    
    const headers = allData[0];
    const rows = allData.slice(1);
    
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const estadoIdx = headers.indexOf('Estado');
    const montoIdx = headers.indexOf('Monto');
    const fechaIdx = headers.indexOf('Fecha');
    
    if (jugadorIdIdx === -1 || tipoIdx === -1 || estadoIdx === -1 || montoIdx === -1) {
      throw new Error('No se encontraron las columnas necesarias en la hoja de Pagos');
    }
    
    // LOGGING DIAGNÓSTICO: Analizar todos los tipos de pagos en la hoja
    Logger.log('=== ANÁLISIS DIAGNÓSTICO DE TIPOS DE PAGOS ===');
    const tiposCount = {};
    const tiposUnicos = new Set();
    
    rows.forEach((row, index) => {
      const tipo = String(row[tipoIdx] || '').trim();
      if (tipo) {
        tiposUnicos.add(tipo);
        tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
      }
    });
    
    Logger.log(`Total de filas de pagos en la hoja: ${rows.length}`);
    Logger.log(`Tipos únicos de pagos encontrados: ${tiposUnicos.size}`);
    Logger.log('Distribución de tipos de pagos:');
    Object.keys(tiposCount).sort().forEach(tipo => {
      Logger.log(`  - "${tipo}": ${tiposCount[tipo]} pago(s)`);
    });
    
    // Función para normalizar y detectar mensualidades
    const normalizeTipo = (tipo) => {
      return String(tipo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' '); // Normalizar espacios
    };
    
    // Función para normalizar estado (remover emojis, normalizar)
    const normalizeEstado = (estado) => {
      return String(estado || '')
        .replace(/[⏳✅❌💰📜🔴🟢🟡⚪]/g, '') // Remover emojis comunes
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .toLowerCase()
        .trim();
    };
    
    const isMonthlyPayment = (tipo) => {
      if (!tipo) return false;
      const normalized = normalizeTipo(tipo);
      
      // Buscar variaciones de "mensualidad"
      const monthlyKeywords = [
        'mensualidad',
        'mensual',
        'cuota mensual',
        'pago mensual',
        'monthly',
        'cuota'
      ];
      
      // Si coincide exactamente con alguna variación
      if (monthlyKeywords.some(keyword => normalized === keyword)) {
        return true;
      }
      
      // Si contiene "mensualidad" o "mensual" en el texto
      if (normalized.includes('mensualidad') || normalized.includes('mensual')) {
        return true;
      }
      
      // Si contiene "cuota" y no es matrícula ni otro tipo específico
      if (normalized.includes('cuota') && 
          !normalized.includes('matricula') && 
          !normalized.includes('matrícula') &&
          !normalized.includes('enrollment')) {
        return true;
      }
      
      return false;
    };
    
    // ENFOQUE NUEVO: Procesar TODOS los pagos de mensualidad primero
    Logger.log('Buscando TODOS los pagos de mensualidad en la hoja de Pagos...');
    const allMonthlyPayments = [];
    const omittedPayments = [];
    
    rows.forEach((row, index) => {
      const tipo = String(row[tipoIdx] || '').trim();
      const playerIdRaw = row[jugadorIdIdx];
      const playerId = String(playerIdRaw || '').trim();
      const estado = String(row[estadoIdx] || '').trim();
      const estadoNormalizado = normalizeEstado(estado);
      const montoActual = parseFloat(row[montoIdx] || 0);
      const fecha = row[fechaIdx];
      
      // Verificar si es mensualidad por tipo
      if (isMonthlyPayment(tipo)) {
        allMonthlyPayments.push({
          rowIndex: index + 2, // +2 porque index es 0-based y hay header en fila 1
          playerId: playerId,
          tipo: tipo, // Guardar el tipo original para logging
          estado: estado,
          montoActual: montoActual,
          fecha: fecha,
          row: row
        });
      } 
      // Si no es mensualidad por tipo, verificar si podría ser una mensualidad pendiente
      // (tiene Jugador ID válido, estado Pendiente, y no es Matrícula u otro tipo conocido)
      else if (playerId && 
               playerId.startsWith('PLR_') && // Jugador ID válido
               (estadoNormalizado === 'pendiente' || estadoNormalizado.includes('pendiente')) &&
               tipo !== 'Matrícula' && 
               !tipo.toLowerCase().includes('matricula') &&
               !tipo.toLowerCase().includes('enrollment') &&
               montoActual > 0 && // Tiene monto válido
               montoActual >= 50 && // Monto mínimo razonable para mensualidad ($50)
               montoActual < 1000) { // Monto máximo razonable para mensualidad (menos de $1000)
        // Es muy probable que sea una mensualidad pendiente con tipo incorrecto (nombre de jugador)
        // Solo loguear los primeros para no saturar los logs
        if (allMonthlyPayments.length < 20 || (allMonthlyPayments.length < 100 && allMonthlyPayments.length % 10 === 0)) {
          Logger.log(`⚠️ Pago pendiente detectado con tipo no estándar: Fila ${index + 2}, Tipo="${tipo}", Jugador="${playerId}", Monto=$${montoActual.toFixed(2)}`);
        }
        allMonthlyPayments.push({
          rowIndex: index + 2,
          playerId: playerId,
          tipo: tipo, // Mantener tipo original pero tratarlo como mensualidad
          estado: estado,
          montoActual: montoActual,
          fecha: fecha,
          row: row,
          tipoInferido: true // Marcar que el tipo fue inferido
        });
      } else if (tipo) {
        // Registrar pagos omitidos para diagnóstico
        omittedPayments.push({
          rowIndex: index + 2,
          tipo: tipo,
          playerId: playerId
        });
      }
    });
    
    // Análisis por estado de los pagos de mensualidad encontrados
    const pagosPorEstado = {};
    allMonthlyPayments.forEach(p => {
      const estado = String(p.estado || '').trim() || 'Sin estado';
      pagosPorEstado[estado] = (pagosPorEstado[estado] || 0) + 1;
    });
    
    Logger.log(`Total de pagos de mensualidad encontrados (filtro flexible): ${allMonthlyPayments.length}`);
    Logger.log('Distribución por estado:');
    Object.keys(pagosPorEstado).sort().forEach(estado => {
      Logger.log(`  - Estado "${estado}": ${pagosPorEstado[estado]} pago(s)`);
    });
    
    // Logging específico de pagos pendientes
    const pagosPendientes = allMonthlyPayments.filter(p => {
      const estadoNormalizado = normalizeEstado(p.estado);
      return estadoNormalizado === 'pendiente' || 
             estadoNormalizado.includes('pendiente');
    });
    Logger.log(`Total de mensualidades PENDIENTES encontradas: ${pagosPendientes.length}`);
    if (pagosPendientes.length > 0) {
      if (pagosPendientes.length <= 10) {
        Logger.log('Detalle de pagos pendientes:');
        pagosPendientes.forEach(p => {
          Logger.log(`  - Fila ${p.rowIndex}: Jugador "${p.playerId}", Tipo "${p.tipo}", Monto $${p.montoActual.toFixed(2)}, Estado "${p.estado}"`);
        });
      } else {
        Logger.log(`  (${pagosPendientes.length} pagos pendientes - demasiados para listar detalles)`);
      }
    }
    
    // Analizar pagos omitidos, especialmente los pendientes
    const omittedPendientes = omittedPayments.filter(p => {
      const estadoIdx = headers.indexOf('Estado');
      if (estadoIdx === -1) return false;
      const rowIndex = p.rowIndex - 2; // Convertir a índice de rows
      if (rowIndex < 0 || rowIndex >= rows.length) return false;
      const estado = String(rows[rowIndex][estadoIdx] || '').trim();
      const estadoNormalizado = normalizeEstado(estado);
      return estadoNormalizado === 'pendiente' || estadoNormalizado.includes('pendiente');
    });
    
    if (omittedPayments.length > 0) {
      Logger.log(`Pagos omitidos (no son mensualidades): ${omittedPayments.length}`);
      if (omittedPendientes.length > 0) {
        Logger.log(`⚠️ IMPORTANTE: ${omittedPendientes.length} pagos PENDIENTES fueron omitidos (no detectados como mensualidades)`);
        if (omittedPendientes.length <= 20) {
          Logger.log('Ejemplos de pagos pendientes omitidos:');
          omittedPendientes.slice(0, 10).forEach(p => {
            const rowIndex = p.rowIndex - 2;
            if (rowIndex >= 0 && rowIndex < rows.length) {
              const row = rows[rowIndex];
              const estadoIdx = headers.indexOf('Estado');
              const montoIdx = headers.indexOf('Monto');
              const jugadorIdIdx = headers.indexOf('Jugador ID');
              Logger.log(`  - Fila ${p.rowIndex}: Tipo="${p.tipo}", Estado="${row[estadoIdx]}", Jugador="${row[jugadorIdIdx]}", Monto=$${row[montoIdx] || 0}`);
            }
          });
        }
      }
      
      if (omittedPayments.length <= 50) {
        const tiposOmitidos = {};
        omittedPayments.forEach(p => {
          tiposOmitidos[p.tipo] = (tiposOmitidos[p.tipo] || 0) + 1;
        });
        Logger.log('Distribución de tipos omitidos:');
        Object.keys(tiposOmitidos).sort().forEach(tipo => {
          Logger.log(`  - "${tipo}": ${tiposOmitidos[tipo]} pago(s)`);
        });
      } else {
        Logger.log(`(Demasiados tipos omitidos para listar - ${omittedPayments.length} pagos)`);
      }
    }
    
    if (allMonthlyPayments.length === 0) {
      return {
        success: true,
        message: 'No se encontraron pagos de mensualidad en la hoja de Pagos',
        reviewed: 0,
        updated: 0,
        unchanged: 0,
        totalPlayers: 0,
        totalPaymentsFound: 0
      };
    }
    
    // Obtener TODOS los jugadores para crear mapa de búsqueda
    Logger.log('Obteniendo todos los jugadores del plantel...');
    const allPlayers = getAllPlayers();
    
    // Crear mapa de jugadores normalizado para búsqueda flexible
    const playersMap = {};
    const playersMapNormalized = {};
    
    allPlayers.forEach(player => {
      const playerId = String(player.ID || '').trim();
      if (playerId) {
        playersMap[playerId] = player;
        // Crear versión normalizada para búsqueda flexible (sin espacios, minúsculas)
        const normalizedId = playerId.toLowerCase().replace(/\s+/g, '');
        if (!playersMapNormalized[normalizedId]) {
          playersMapNormalized[normalizedId] = player;
        }
      }
    });
    
    Logger.log(`Total de jugadores en plantel: ${allPlayers.length}`);
    Logger.log(`Jugadores con ID válido: ${Object.keys(playersMap).length}`);
    
    const paymentsToUpdate = [];
    let reviewed = 0;
    let skippedEmpty = 0;
    let playersNotFound = 0;
    const playersNotFoundList = [];
    const uniquePlayerIds = new Set();
    
    // Procesar CADA pago de mensualidad encontrado
    allMonthlyPayments.forEach(payment => {
      reviewed++;
      const playerIdRaw = payment.playerId;
      const playerId = String(playerIdRaw || '').trim();
      
      if (!playerId) {
        skippedEmpty++;
        Logger.log(`Pago en fila ${payment.rowIndex} sin Jugador ID, omitido`);
        return;
      }
      
      // Buscar jugador (primero coincidencia exacta, luego normalizada)
      let player = playersMap[playerId];
      if (!player) {
        const normalizedId = playerId.toLowerCase().replace(/\s+/g, '');
        player = playersMapNormalized[normalizedId];
      }
      
      // Si aún no se encuentra, buscar con getPlayerById como fallback
      if (!player) {
        try {
          player = getPlayerById(playerId);
        } catch (e) {
          Logger.log(`Error buscando jugador ${playerId} con getPlayerById: ${e.toString()}`);
        }
      }
      
      if (!player) {
        playersNotFound++;
        if (!playersNotFoundList.includes(playerId)) {
          playersNotFoundList.push(playerId);
        }
        Logger.log(`⚠️ Jugador no encontrado para pago en fila ${payment.rowIndex}: ID="${playerId}"`);
        return;
      }
      
      uniquePlayerIds.add(playerId);
      
      // Obtener monto correcto para este jugador
      const monthlyFeeInfo = getPlayerMonthlyFee(playerId);
      
      if (!monthlyFeeInfo) {
        Logger.log(`No se pudo obtener información de mensualidad para jugador ${playerId} (fila ${payment.rowIndex})`);
        return;
      }
      
      const estado = payment.estado;
      const montoActual = payment.montoActual;
      const fecha = payment.fecha;
      
      // Si es becado, el monto debería ser 0
      if (monthlyFeeInfo.type === 'becado') {
        if (montoActual !== 0) {
          paymentsToUpdate.push({
            rowIndex: payment.rowIndex,
            playerId: playerId,
            playerName: `${player.Nombre || ''} ${player.Apellidos || ''}`.trim() || playerId,
            estado: estado,
            fecha: fecha instanceof Date ? fecha : null,
            montoActual: montoActual,
            montoCorrecto: 0,
            tipoMensualidad: monthlyFeeInfo.type,
            razon: 'Jugador becado debe tener monto 0'
          });
        }
        return;
      }
      
      // Calcular monto correcto con descuento si aplica
      let montoCorrecto = monthlyFeeInfo.amount;
      
      if (player['Descuento %'] && player['Descuento %'] > 0) {
        montoCorrecto = montoCorrecto * (1 - player['Descuento %'] / 100);
      }
      
      // Redondear a 2 decimales
      montoCorrecto = Math.round(montoCorrecto * 100) / 100;
      
      // Si el monto es diferente, agregar a la lista de actualizaciones
      if (Math.abs(montoActual - montoCorrecto) > 0.01) { // Tolerancia de 1 centavo
        const fechaStr = fecha instanceof Date ? 
          `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}` : 
          'Fecha no válida';
        
        // Determinar razón específica para logging
        let razon = `Monto incorrecto: $${montoActual.toFixed(2)} → $${montoCorrecto.toFixed(2)} (${monthlyFeeInfo.type})`;
        
        // Caso específico: Corrección de $110.50 a $130 (familiar a individual)
        if (Math.abs(montoActual - 110.50) < 0.01 && Math.abs(montoCorrecto - 130) < 0.01) {
          razon = `Corrección: $110.50 (familiar) → $130 (individual) - Jugador no pertenece a familia o es el primero`;
        }
        // Caso específico: Corrección de $130 a $110.50 (individual a familiar)
        else if (Math.abs(montoActual - 130) < 0.01 && Math.abs(montoCorrecto - 110.50) < 0.01) {
          razon = `Corrección: $130 (individual) → $110.50 (familiar) - Jugador pertenece a familia y no es el primero`;
        }
        
        paymentsToUpdate.push({
          rowIndex: payment.rowIndex,
          playerId: playerId,
          playerName: `${player.Nombre || ''} ${player.Apellidos || ''}`.trim() || playerId,
          estado: estado,
          fecha: fechaStr,
          montoActual: montoActual,
          montoCorrecto: montoCorrecto,
          tipoMensualidad: monthlyFeeInfo.type,
          razon: razon
        });
        
        // Logging específico para correcciones importantes
        if (payment.tipoInferido) {
          Logger.log(`  ✓ Pago pendiente con tipo inferido: ${playerId} (${player.Nombre || ''} ${player.Apellidos || ''}) - Tipo original="${payment.tipo}" - Estado: ${estado} - $${montoActual.toFixed(2)} → $${montoCorrecto.toFixed(2)} (${monthlyFeeInfo.type})`);
        } else {
          Logger.log(`  ✓ Pago identificado: ${playerId} (${player.Nombre || ''} ${player.Apellidos || ''}) - Estado: ${estado} - $${montoActual.toFixed(2)} → $${montoCorrecto.toFixed(2)} (${monthlyFeeInfo.type})`);
        }
      }
    });
    
    // Contar correcciones específicas
    const correcciones110a130 = paymentsToUpdate.filter(p => 
      Math.abs(p.montoActual - 110.50) < 0.01 && Math.abs(p.montoCorrecto - 130) < 0.01
    ).length;
    const correcciones130a110 = paymentsToUpdate.filter(p => 
      Math.abs(p.montoActual - 130) < 0.01 && Math.abs(p.montoCorrecto - 110.50) < 0.01
    ).length;
    const pagosPendientesConTipoInferido = paymentsToUpdate.filter(p => 
      allMonthlyPayments.find(m => m.rowIndex === p.rowIndex && m.tipoInferido)
    ).length;
    
    Logger.log(`=== RESUMEN ===`);
    Logger.log(`Total de pagos de mensualidad encontrados: ${allMonthlyPayments.length}`);
    Logger.log(`Total de mensualidades revisadas: ${reviewed}`);
    Logger.log(`Jugadores únicos con pagos: ${uniquePlayerIds.size}`);
    Logger.log(`Mensualidades que necesitan corrección: ${paymentsToUpdate.length}`);
    if (correcciones110a130 > 0) {
      Logger.log(`  → Correcciones de $110.50 a $130 (familiar → individual): ${correcciones110a130}`);
    }
    if (correcciones130a110 > 0) {
      Logger.log(`  → Correcciones de $130 a $110.50 (individual → familiar): ${correcciones130a110}`);
    }
    if (pagosPendientesConTipoInferido > 0) {
      Logger.log(`  → Pagos pendientes con tipo inferido (nombres de jugadores): ${pagosPendientesConTipoInferido}`);
    }
    Logger.log(`Pagos omitidos (sin Jugador ID): ${skippedEmpty}`);
    Logger.log(`Pagos con jugador no encontrado: ${playersNotFound}`);
    if (playersNotFoundList.length > 0) {
      Logger.log(`IDs de jugadores no encontrados: ${playersNotFoundList.slice(0, 10).join(', ')}${playersNotFoundList.length > 10 ? '...' : ''}`);
    }
    
    // Si confirm es false, solo retornar reporte
    if (confirm !== true) {
      let message = `Se encontraron ${allMonthlyPayments.length} pagos de mensualidad en la hoja. `;
      message += `Se revisaron ${reviewed} mensualidades de ${uniquePlayerIds.size} jugadores únicos. `;
      message += `Se encontraron ${paymentsToUpdate.length} mensualidades históricas que necesitan actualización. `;
      if (playersNotFound > 0) {
        message += `${playersNotFound} pagos tienen jugador no encontrado. `;
      }
      if (skippedEmpty > 0) {
        message += `${skippedEmpty} pagos sin Jugador ID. `;
      }
      message += `Use confirm=true para ejecutar.`;
      
      return {
        success: true,
        preview: true,
        message: message,
        totalPaymentsFound: allMonthlyPayments.length,
        totalPlayers: uniquePlayerIds.size,
        playersNotFound: playersNotFound,
        playersNotFoundList: playersNotFoundList.slice(0, 20),
        reviewed: reviewed,
        toUpdate: paymentsToUpdate.length,
        unchanged: reviewed - paymentsToUpdate.length - skippedEmpty - playersNotFound,
        skippedEmpty: skippedEmpty,
        paymentsToUpdate: paymentsToUpdate
      };
    }
    
    // Ejecutar actualización
    let updated = 0;
    const updatedPayments = [];
    
    paymentsToUpdate.forEach(payment => {
      try {
        // Actualizar monto en la hoja
        paymentsSheet.getRange(payment.rowIndex, montoIdx + 1).setValue(payment.montoCorrecto);
        updated++;
        
        updatedPayments.push({
          playerId: payment.playerId,
          playerName: payment.playerName,
          estado: payment.estado,
          fecha: payment.fecha,
          montoAnterior: payment.montoActual,
          montoNuevo: payment.montoCorrecto,
          tipoMensualidad: payment.tipoMensualidad,
          razon: payment.razon
        });
        
        Logger.log(`Cuota histórica actualizada para jugador ${payment.playerId}: $${payment.montoActual} → $${payment.montoCorrecto} (Estado: ${payment.estado})`);
      } catch (error) {
        Logger.log(`Error actualizando cuota en fila ${payment.rowIndex}: ${error.toString()}`);
      }
    });
    
    SpreadsheetApp.flush();
    
    Logger.log(`Actualización completada: ${updated} cuotas históricas actualizadas de ${reviewed} revisadas`);
    Logger.log(`Total de pagos de mensualidad encontrados: ${allMonthlyPayments.length}`);
    Logger.log(`Jugadores únicos procesados: ${uniquePlayerIds.size}`);
    
    let message = `Actualización completada exitosamente. `;
    message += `Se encontraron ${allMonthlyPayments.length} pagos de mensualidad en la hoja. `;
    message += `Se revisaron ${reviewed} mensualidades de ${uniquePlayerIds.size} jugadores únicos. `;
    message += `Se actualizaron ${updated} mensualidades históricas.`;
    if (playersNotFound > 0) {
      message += ` ${playersNotFound} pagos tenían jugador no encontrado.`;
    }
    
    return {
      success: true,
      message: message,
      totalPaymentsFound: allMonthlyPayments.length,
      totalPlayers: uniquePlayerIds.size,
      playersNotFound: playersNotFound,
      playersNotFoundList: playersNotFoundList.slice(0, 20),
      reviewed: reviewed,
      updated: updated,
      unchanged: reviewed - updated - skippedEmpty - playersNotFound,
      skippedEmpty: skippedEmpty,
      updatedPayments: updatedPayments
    };
    
  } catch (error) {
    Logger.log('Error actualizando mensualidades históricas: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return {
      success: false,
      message: 'Error en actualización: ' + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Elimina todas las mensualidades (pendientes y pagadas) del sistema
 * @param {boolean} confirm - Si es true, ejecuta la eliminación. Si es false, solo retorna preview
 * @returns {Object} Resultado con información de eliminación
 */
function deleteAllMonthlyPayments(confirm) {
  try {
    Logger.log('=== ELIMINANDO TODAS LAS MENSUALIDADES ===');
    Logger.log('Confirmación recibida:', confirm);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      throw new Error('No se encontró la hoja de Pagos');
    }
    
    const allData = paymentsSheet.getDataRange().getValues();
    if (allData.length <= 1) {
      Logger.log('No hay pagos registrados en la hoja de Pagos');
      return {
        success: true,
        message: 'No hay pagos registrados en la hoja de Pagos',
        deletedCount: 0,
        deletedPendingCount: 0,
        deletedPaidCount: 0,
        totalAmount: 0,
        totalPendingAmount: 0,
        totalPaidAmount: 0,
        details: []
      };
    }
    
    const headers = allData[0];
    const rows = allData.slice(1);
    
    const jugadorIdIdx = headers.indexOf('Jugador ID');
    const tipoIdx = headers.indexOf('Tipo');
    const estadoIdx = headers.indexOf('Estado');
    const montoIdx = headers.indexOf('Monto');
    const fechaIdx = headers.indexOf('Fecha');
    const idIdx = headers.indexOf('ID');
    
    if (tipoIdx === -1 || estadoIdx === -1 || montoIdx === -1) {
      throw new Error('No se encontraron las columnas necesarias en la hoja de Pagos');
    }
    
    // Función para normalizar y detectar mensualidades
    const normalizeTipo = (tipo) => {
      return String(tipo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' '); // Normalizar espacios
    };
    
    // Función para normalizar estado (remover emojis, normalizar)
    const normalizeEstado = (estado) => {
      return String(estado || '')
        .replace(/[⏳✅❌💰📜🔴🟢🟡⚪]/g, '') // Remover emojis comunes
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .toLowerCase()
        .trim();
    };
    
    // Función para detectar si es mensualidad
    const isMonthlyPayment = (tipo) => {
      const tipoNormalizado = normalizeTipo(tipo);
      const palabrasMensualidad = ['mensualidad', 'mensual', 'cuota mensual', 'pago mensual', 'monthly'];
      
      // Verificar si contiene alguna palabra clave de mensualidad
      for (const palabra of palabrasMensualidad) {
        if (tipoNormalizado.includes(palabra)) {
          return true;
        }
      }
      
      // Excluir matrícula cuando se menciona "cuota"
      if (tipoNormalizado.includes('cuota') && 
          (tipoNormalizado.includes('matricula') || tipoNormalizado.includes('enrollment'))) {
        return false;
      }
      
      return false;
    };
    
    // Identificar mensualidades
    const monthlyPaymentsToDelete = [];
    let totalPendingAmount = 0;
    let totalPaidAmount = 0;
    let deletedPendingCount = 0;
    let deletedPaidCount = 0;
    
    rows.forEach((row, index) => {
      const tipo = String(row[tipoIdx] || '').trim();
      const estadoRaw = String(row[estadoIdx] || '').trim();
      const estadoNormalizado = normalizeEstado(estadoRaw);
      
      if (isMonthlyPayment(tipo)) {
        const monto = parseFloat(row[montoIdx]) || 0;
        const esPendiente = estadoNormalizado === 'pendiente' || estadoNormalizado.includes('pendiente');
        const esPagado = estadoNormalizado === 'pagado' || estadoNormalizado.includes('pagado');
        
        if (esPendiente || esPagado) {
          monthlyPaymentsToDelete.push({
            rowIndex: index + 2, // +2 porque: +1 por header, +1 porque índice empieza en 0
            tipo: tipo,
            estado: estadoRaw,
            monto: monto,
            jugadorId: jugadorIdIdx >= 0 ? String(row[jugadorIdIdx] || '').trim() : '',
            fecha: fechaIdx >= 0 ? (row[fechaIdx] ? new Date(row[fechaIdx]).toLocaleDateString('es-ES') : '') : '',
            pagoId: idIdx >= 0 ? String(row[idIdx] || '').trim() : ''
          });
          
          if (esPendiente) {
            totalPendingAmount += monto;
            deletedPendingCount++;
          } else if (esPagado) {
            totalPaidAmount += monto;
            deletedPaidCount++;
          }
        }
      }
    });
    
    const totalAmount = totalPendingAmount + totalPaidAmount;
    const totalCount = monthlyPaymentsToDelete.length;
    
    Logger.log(`=== RESUMEN DE MENSUALIDADES A ELIMINAR ===`);
    Logger.log(`Total de mensualidades encontradas: ${totalCount}`);
    Logger.log(`  - Pendientes: ${deletedPendingCount} (Monto total: $${totalPendingAmount.toFixed(2)})`);
    Logger.log(`  - Pagadas: ${deletedPaidCount} (Monto total: $${totalPaidAmount.toFixed(2)})`);
    Logger.log(`Monto total a eliminar: $${totalAmount.toFixed(2)}`);
    
    // Si es preview, retornar información sin eliminar
    if (!confirm) {
      return {
        success: true,
        preview: true,
        deletedCount: 0,
        deletedPendingCount: deletedPendingCount,
        deletedPaidCount: deletedPaidCount,
        totalAmount: totalAmount,
        totalPendingAmount: totalPendingAmount,
        totalPaidAmount: totalPaidAmount,
        details: monthlyPaymentsToDelete.map(p => ({
          pagoId: p.pagoId,
          jugadorId: p.jugadorId,
          tipo: p.tipo,
          estado: p.estado,
          monto: p.monto,
          fecha: p.fecha
        })),
        message: `Preview: Se eliminarán ${totalCount} mensualidades (${deletedPendingCount} pendientes, ${deletedPaidCount} pagadas)`
      };
    }
    
    // Eliminar filas (de abajo hacia arriba para evitar problemas con índices)
    if (monthlyPaymentsToDelete.length > 0) {
      Logger.log(`=== ELIMINANDO ${monthlyPaymentsToDelete.length} MENSUALIDADES ===`);
      
      // Ordenar por índice descendente para eliminar de abajo hacia arriba
      const rowsToDelete = monthlyPaymentsToDelete
        .map(p => p.rowIndex)
        .sort((a, b) => b - a);
      
      let actualDeletedPending = 0;
      let actualDeletedPaid = 0;
      
      rowsToDelete.forEach(rowIndex => {
        const payment = monthlyPaymentsToDelete.find(p => p.rowIndex === rowIndex);
        if (payment) {
          const estadoNormalizado = normalizeEstado(payment.estado);
          const esPendiente = estadoNormalizado === 'pendiente' || estadoNormalizado.includes('pendiente');
          const esPagado = estadoNormalizado === 'pagado' || estadoNormalizado.includes('pagado');
          
          try {
            paymentsSheet.deleteRow(rowIndex);
            Logger.log(`✓ Eliminada mensualidad en fila ${rowIndex}: ${payment.pagoId} - ${payment.tipo} (${payment.estado}) - $${payment.monto.toFixed(2)}`);
            
            if (esPendiente) {
              actualDeletedPending++;
            } else if (esPagado) {
              actualDeletedPaid++;
            }
          } catch (error) {
            Logger.log(`✗ Error eliminando fila ${rowIndex}: ${error.toString()}`);
          }
        }
      });
      
      SpreadsheetApp.flush();
      
      Logger.log(`=== ELIMINACIÓN COMPLETADA ===`);
      Logger.log(`Mensualidades eliminadas: ${actualDeletedPending + actualDeletedPaid}`);
      Logger.log(`  - Pendientes: ${actualDeletedPending}`);
      Logger.log(`  - Pagadas: ${actualDeletedPaid}`);
      
      return {
        success: true,
        deletedCount: actualDeletedPending + actualDeletedPaid,
        deletedPendingCount: actualDeletedPending,
        deletedPaidCount: actualDeletedPaid,
        totalAmount: totalAmount,
        totalPendingAmount: totalPendingAmount,
        totalPaidAmount: totalPaidAmount,
        details: monthlyPaymentsToDelete,
        message: `Se eliminaron ${actualDeletedPending + actualDeletedPaid} mensualidades exitosamente (${actualDeletedPending} pendientes, ${actualDeletedPaid} pagadas)`
      };
    }
    
    return {
      success: true,
      deletedCount: 0,
      deletedPendingCount: 0,
      deletedPaidCount: 0,
      totalAmount: 0,
      totalPendingAmount: 0,
      totalPaidAmount: 0,
      details: [],
      message: 'No se encontraron mensualidades para eliminar'
    };
    
  } catch (error) {
    Logger.log('Error eliminando mensualidades: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return {
      success: false,
      message: 'Error en eliminación: ' + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Obtiene jugadores con pagos pendientes
 */
function getPlayersWithPendingPayments() {
  try {
    const allPlayers = getAllPlayers();
    const playersWithPending = [];
    
    allPlayers.forEach(player => {
      if (player.Estado === 'Activo' && player.Tipo !== 'becado') {
        const accountStatus = getPlayerAccountStatus(player.ID);
        
        if (accountStatus && accountStatus.pendingAmount > 0) {
          playersWithPending.push({
            player: player,
            accountStatus: accountStatus
          });
        }
      }
    });
    
    // Ordenar por monto pendiente descendente
    return playersWithPending.sort((a, b) => 
      b.accountStatus.pendingAmount - a.accountStatus.pendingAmount
    );
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores con pagos pendientes: ' + error.toString());
    return [];
  }
}

/**
 * Actualiza las métricas financieras del sistema
 */
function updateFinancialMetrics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let metricsSheet = ss.getSheetByName('Métricas');
    
    if (!metricsSheet) {
      metricsSheet = ss.insertSheet('Métricas');
      const headers = ['Métrica', 'Valor', 'Fecha Actualización'];
      metricsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Obtener resumen financiero del mes actual
    const financialSummary = getFinancialSummary('current_month');
    
    if (financialSummary) {
      const metrics = [
        ['total_income_current_month', financialSummary.totalIncome, currentDate],
        ['total_expenses_current_month', financialSummary.totalExpenses, currentDate],
        ['net_profit_current_month', financialSummary.netProfit, currentDate],
        ['profit_margin_current_month', financialSummary.profitMargin, currentDate]
      ];
      
      // Actualizar o insertar métricas
      metrics.forEach(([metric, value, date]) => {
        updateMetric(metricsSheet, metric, value, date);
      });
    }
    
    Logger.log('Métricas financieras actualizadas');
    
  } catch (error) {
    Logger.log('Error actualizando métricas financieras: ' + error.toString());
  }
}

/**
 * Actualiza una métrica específica
 */
function updateMetric(metricsSheet, metricName, value, date) {
  try {
    const data = metricsSheet.getDataRange().getValues();
    const existingRowIndex = data.findIndex(row => row[0] === metricName);
    
    if (existingRowIndex >= 0) {
      metricsSheet.getRange(existingRowIndex + 1, 2).setValue(value);
      metricsSheet.getRange(existingRowIndex + 1, 3).setValue(date);
    } else {
      metricsSheet.appendRow([metricName, value, date]);
    }
    
  } catch (error) {
    Logger.log('Error actualizando métrica: ' + error.toString());
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
 * Genera un ID único para gastos
 */
function generateExpenseId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `EXP_${timestamp}_${random}`;
}

/**
 * Obtiene reporte financiero detallado
 */
function getDetailedFinancialReport(startDate, endDate) {
  try {
    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      summary: getFinancialSummary('custom'),
      payments: [],
      expenses: [],
      players: []
    };
    
    // Obtener pagos del período
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (paymentsSheet) {
      const data = paymentsSheet.getDataRange().getValues();
      const headers = data[0];
      const payments = data.slice(1).filter(row => {
        const paymentDate = new Date(row[4]);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
      
      report.payments = payments.map(row => {
        const payment = {};
        headers.forEach((header, index) => {
          payment[header] = row[index];
        });
        return payment;
      });
    }
    
    // Obtener gastos del período
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (expensesSheet) {
      const data = expensesSheet.getDataRange().getValues();
      const headers = data[0];
      const expenses = data.slice(1).filter(row => {
        const expenseDate = new Date(row[3]);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
      
      report.expenses = expenses.map(row => {
        const expense = {};
        headers.forEach((header, index) => {
          expense[header] = row[index];
        });
        return expense;
      });
    }
    
    // Obtener información de jugadores
    report.players = getAllPlayers();
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte financiero: ' + error.toString());
    return null;
  }
}

/**
 * OBTENER ACTIVIDAD RECIENTE DEL SISTEMA
 * Retorna los últimos 10 eventos (pagos, nuevos jugadores, gastos)
 */
function getRecentActivity() {
  try {
    Logger.log('=== OBTENIENDO ACTIVIDAD RECIENTE ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activities = [];
    
    // 1. Obtener últimos pagos
    const paymentsSheet = ss.getSheetByName('Pagos');
    if (paymentsSheet) {
      const paymentsData = paymentsSheet.getDataRange().getValues();
      if (paymentsData.length > 1) {
        const headers = paymentsData[0];
        const rows = paymentsData.slice(1);
        
        const jugadorIdIdx = headers.indexOf('Jugador ID');
        const montoIdx = headers.indexOf('Monto');
        const fechaIdx = headers.indexOf('Fecha');
        const tipoIdx = headers.indexOf('Tipo');
        const estadoIdx = headers.indexOf('Estado');
        
        // Obtener los últimos 5 pagos realizados
        rows
          .filter(row => String(row[estadoIdx] || '') === 'Pagado')
          .sort((a, b) => {
            const dateA = a[fechaIdx] instanceof Date ? a[fechaIdx] : new Date(0);
            const dateB = b[fechaIdx] instanceof Date ? b[fechaIdx] : new Date(0);
            return dateB - dateA;
          })
          .slice(0, 5)
          .forEach(row => {
            const playerId = String(row[jugadorIdIdx] || 'Desconocido');
            const monto = parseFloat(row[montoIdx] || 0);
            const fecha = row[fechaIdx] instanceof Date ? row[fechaIdx] : new Date();
            const tipo = String(row[tipoIdx] || 'Pago');
            
            activities.push({
              icon: 'payment',
              emoji: '💰',
              title: 'Pago registrado',
              description: `${playerId} - ${tipo} $${monto.toFixed(2)}`,
              time: getTimeAgo(fecha),
              timestamp: fecha.getTime()
            });
          });
      }
    }
    
    // 2. Obtener últimos jugadores agregados
    const playersSheet = ss.getSheetByName('Jugadores');
    if (playersSheet) {
      const playersData = playersSheet.getDataRange().getValues();
      if (playersData.length > 1) {
        const rows = playersData.slice(1);
        
        // Obtener los últimos 3 jugadores
        rows
          .filter(row => row[8]) // Que tengan fecha de registro
          .sort((a, b) => {
            const dateA = a[8] instanceof Date ? a[8] : new Date(0);
            const dateB = b[8] instanceof Date ? b[8] : new Date(0);
            return dateB - dateA;
          })
          .slice(0, 3)
          .forEach(row => {
            const nombre = String(row[1] || '');
            const apellidos = String(row[2] || '');
            const fecha = row[8] instanceof Date ? row[8] : new Date();
            
            activities.push({
              icon: 'player',
              emoji: '👤',
              title: 'Nuevo jugador',
              description: `${nombre} ${apellidos} agregado al sistema`,
              time: getTimeAgo(fecha),
              timestamp: fecha.getTime()
            });
          });
      }
    }
    
    // 3. Obtener últimos gastos
    const expensesSheet = ss.getSheetByName('Gastos');
    if (expensesSheet) {
      const expensesData = expensesSheet.getDataRange().getValues();
      if (expensesData.length > 1) {
        const headers = expensesData[0];
        const rows = expensesData.slice(1);
        
        const descripcionIdx = headers.indexOf('Descripción');
        const montoIdx = headers.indexOf('Monto');
        const fechaIdx = headers.indexOf('Fecha');
        
        // Obtener los últimos 3 gastos
        rows
          .sort((a, b) => {
            const dateA = a[fechaIdx] instanceof Date ? a[fechaIdx] : new Date(0);
            const dateB = b[fechaIdx] instanceof Date ? b[fechaIdx] : new Date(0);
            return dateB - dateA;
          })
          .slice(0, 3)
          .forEach(row => {
            const descripcion = String(row[descripcionIdx] || 'Gasto');
            const monto = parseFloat(row[montoIdx] || 0);
            const fecha = row[fechaIdx] instanceof Date ? row[fechaIdx] : new Date();
            
            activities.push({
              icon: 'expense',
              emoji: '💸',
              title: 'Gasto registrado',
              description: `${descripcion} - $${monto.toFixed(2)}`,
              time: getTimeAgo(fecha),
              timestamp: fecha.getTime()
            });
          });
      }
    }
    
    // Ordenar por fecha (más reciente primero) y limitar a 10
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivities = activities.slice(0, 10);
    
    Logger.log(`✅ ${recentActivities.length} actividades recientes encontradas`);
    
    return recentActivities;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo actividad reciente: ' + error.toString());
    return [];
  }
}

/**
 * CALCULAR TIEMPO TRANSCURRIDO
 * Convierte una fecha en texto relativo (ej: "Hace 2 horas")
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return 'Hace un momento';
  } else if (diffMins < 60) {
    return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}

/**
 * OBTENER TODAS LAS TRANSACCIONES (Pagos + Gastos)
 * Para la pestaña de Transacciones del Dashboard Financiero
 */
function getAllTransactions() {
  try {
    Logger.log('💳 Obteniendo todas las transacciones...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Obtener pagos
    const paymentsSheet = ss.getSheetByName('Pagos');
    const payments = [];
    
    if (paymentsSheet) {
      const paymentData = paymentsSheet.getDataRange().getValues();
      
      if (paymentData.length > 1) {
        const paymentHeaders = paymentData[0];
        const paymentRows = paymentData.slice(1);
        
        // Encontrar índices de columnas
        const idIdx = paymentHeaders.indexOf('ID');
        const jugadorIdIdx = paymentHeaders.indexOf('Jugador ID');
        const tipoIdx = paymentHeaders.indexOf('Tipo');
        const montoIdx = paymentHeaders.indexOf('Monto');
        const fechaIdx = paymentHeaders.indexOf('Fecha');
        const estadoIdx = paymentHeaders.indexOf('Estado');
        const metodoIdx = paymentHeaders.indexOf('Método Pago');
        
        paymentRows.forEach(row => {
          if (row[idIdx]) { // Solo si tiene ID
            // Buscar el nombre del jugador
            const jugadorId = row[jugadorIdIdx];
            let jugadorNombre = 'N/A';
            
            if (jugadorId) {
              const playersSheet = ss.getSheetByName('Jugadores');
              if (playersSheet) {
                const playerData = playersSheet.getDataRange().getValues();
                const playerHeaders = playerData[0];
                const playerIdIdx = playerHeaders.indexOf('ID');
                const nombreIdx = playerHeaders.indexOf('Nombre');
                const apellidosIdx = playerHeaders.indexOf('Apellidos');
                
                const playerRow = playerData.slice(1).find(p => p[playerIdIdx] === jugadorId);
                if (playerRow) {
                  jugadorNombre = `${playerRow[nombreIdx]} ${playerRow[apellidosIdx]}`;
                }
              }
            }
            
            payments.push({
              id: String(row[idIdx] || ''),
              jugador: jugadorNombre,
              tipo: String(row[tipoIdx] || ''),
              monto: parseFloat(row[montoIdx] || 0),
              fecha: row[fechaIdx] instanceof Date ? Utilities.formatDate(row[fechaIdx], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[fechaIdx] || ''),
              estado: String(row[estadoIdx] || ''),
              metodo: String(row[metodoIdx] || '')
            });
          }
        });
      }
    }
    
    // Obtener gastos
    const expensesSheet = ss.getSheetByName('Gastos');
    const expenses = [];
    
    Logger.log('📊 Buscando hoja de Gastos...');
    
    if (expensesSheet) {
      Logger.log('✅ Hoja de Gastos encontrada');
      const expenseData = expensesSheet.getDataRange().getValues();
      Logger.log(`📋 Total de filas en Gastos: ${expenseData.length}`);
      
      if (expenseData.length >= 1) {
        // Detectar si la primera fila es header o datos
        const firstRow = expenseData[0];
        Logger.log('🔍 Primera fila:', JSON.stringify(firstRow));
        
        // Si la primera columna empieza con "EXP_", es un ID de gasto (no es header)
        const hasHeaders = !String(firstRow[0]).startsWith('EXP_') && 
                          (String(firstRow[0]).includes('ID') || String(firstRow[0]).includes('Gasto'));
        
        Logger.log(`📝 ¿Tiene headers? ${hasHeaders}`);
        
        let dataRows;
        let idIdx, descIdx, montoIdx, fechaIdx, catIdx, metodoIdx;
        
        if (hasHeaders) {
          // Tiene headers, usar indexOf
          const expenseHeaders = expenseData[0];
          dataRows = expenseData.slice(1);
          
          // Encontrar índices
          idIdx = expenseHeaders.findIndex(h => String(h).includes('ID'));
          descIdx = expenseHeaders.findIndex(h => String(h).toLowerCase().includes('descripci'));
          montoIdx = expenseHeaders.findIndex(h => String(h).toLowerCase().includes('monto'));
          fechaIdx = expenseHeaders.findIndex(h => String(h).toLowerCase().includes('fecha'));
          catIdx = expenseHeaders.findIndex(h => String(h).toLowerCase().includes('categor'));
          metodoIdx = expenseHeaders.findIndex(h => String(h).toLowerCase().includes('método') || String(h).toLowerCase().includes('metodo'));
          
          Logger.log(`🔍 Índices desde headers - ID: ${idIdx}, Desc: ${descIdx}, Monto: ${montoIdx}, Fecha: ${fechaIdx}, Cat: ${catIdx}, Método: ${metodoIdx}`);
        } else {
          // NO tiene headers, usar posiciones fijas
          Logger.log('⚡ Usando índices fijos (sin headers)');
          dataRows = expenseData;
          idIdx = 0;      // Columna 0: ID Gasto
          descIdx = 1;    // Columna 1: Descripción
          montoIdx = 2;   // Columna 2: Monto
          fechaIdx = 3;   // Columna 3: Fecha
          catIdx = 4;     // Columna 4: Categoría
          metodoIdx = 5;  // Columna 5: Método de Pago
          
          Logger.log(`🔍 Usando índices fijos - ID: ${idIdx}, Desc: ${descIdx}, Monto: ${montoIdx}, Fecha: ${fechaIdx}, Cat: ${catIdx}, Método: ${metodoIdx}`);
        }
        
        // Procesar filas
        dataRows.forEach((row, index) => {
          const rowNum = hasHeaders ? index + 2 : index + 1;
          Logger.log(`🔍 Revisando fila ${rowNum}: ID="${row[idIdx]}", Desc="${row[descIdx]}", Monto=${row[montoIdx]}`);
          
          if (row[idIdx]) { // Solo si tiene ID
            const expense = {
              id: String(row[idIdx] || ''),
              descripcion: String(row[descIdx] || ''),
              monto: parseFloat(row[montoIdx] || 0),
              fecha: row[fechaIdx] instanceof Date ? Utilities.formatDate(row[fechaIdx], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[fechaIdx] || '').split(' ')[0],
              categoria: String(row[catIdx] || ''),
              metodoPago: String(row[metodoIdx] || '')
            };
            Logger.log(`✅ Gasto agregado:`, JSON.stringify(expense));
            expenses.push(expense);
          } else {
            Logger.log(`⚠️ Fila ${rowNum} no tiene ID, saltando...`);
          }
        });
      } else {
        Logger.log('⚠️ Hoja de Gastos está vacía');
      }
    } else {
      Logger.log('❌ Hoja de Gastos no encontrada');
    }
    
    Logger.log(`✅ Transacciones obtenidas: ${payments.length} pagos, ${expenses.length} gastos`);
    Logger.log('📊 Array de gastos completo:', JSON.stringify(expenses));
    
    return {
      payments: payments,
      expenses: expenses
    };
    
  } catch (error) {
    Logger.log('❌ Error obteniendo transacciones: ' + error.toString());
    return {
      payments: [],
      expenses: []
    };
  }
}

/**
 * OBTENER GASTOS RECIENTES
 * Para la sección de gestión de gastos en el resumen
 */
function getRecentExpenses() {
  try {
    Logger.log('💸 Obteniendo gastos recientes...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      Logger.log('⚠️ Hoja de Gastos no encontrada');
      return [];
    }
    
    const data = expensesSheet.getDataRange().getValues();
    
    if (data.length < 1) {
      Logger.log('⚠️ No hay gastos registrados');
      return [];
    }
    
    // Detectar si tiene headers
    const firstRow = data[0];
    const hasHeaders = !String(firstRow[0]).startsWith('EXP_') && 
                      (String(firstRow[0]).includes('ID') || String(firstRow[0]).includes('Gasto'));
    
    let dataRows;
    let idIdx, descIdx, montoIdx, fechaIdx, catIdx, metodoIdx;
    
    if (hasHeaders) {
      // Tiene headers
      const headers = data[0];
      dataRows = data.slice(1);
      
      idIdx = headers.findIndex(h => String(h).includes('ID'));
      descIdx = headers.findIndex(h => String(h).toLowerCase().includes('descripci'));
      montoIdx = headers.findIndex(h => String(h).toLowerCase().includes('monto'));
      fechaIdx = headers.findIndex(h => String(h).toLowerCase().includes('fecha'));
      catIdx = headers.findIndex(h => String(h).toLowerCase().includes('categor'));
      metodoIdx = headers.findIndex(h => String(h).toLowerCase().includes('método') || String(h).toLowerCase().includes('metodo'));
    } else {
      // NO tiene headers, usar posiciones fijas
      dataRows = data;
      idIdx = 0;
      descIdx = 1;
      montoIdx = 2;
      fechaIdx = 3;
      catIdx = 4;
      metodoIdx = 5;
    }
    
    const expenses = [];
    
    dataRows.forEach(row => {
      if (row[idIdx]) { // Solo si tiene ID
        expenses.push({
          id: String(row[idIdx] || ''),
          descripcion: String(row[descIdx] || ''),
          monto: parseFloat(row[montoIdx] || 0),
          fecha: row[fechaIdx] instanceof Date ? Utilities.formatDate(row[fechaIdx], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[fechaIdx] || '').split(' ')[0],
          categoria: String(row[catIdx] || ''),
          metodoPago: String(row[metodoIdx] || '')
        });
      }
    });
    
    // Ordenar por fecha (más reciente primero) y tomar los últimos 10
    expenses.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const recentExpenses = expenses.slice(0, 10);
    
    Logger.log(`✅ Gastos recientes obtenidos: ${recentExpenses.length}`);
    
    return recentExpenses;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo gastos recientes: ' + error.toString());
    return [];
  }
}

/**
 * OBTENER MOVIMIENTOS FINANCIEROS RECIENTES (INGRESOS Y GASTOS)
 * Mezcla los pagos recibidos (ingresos) y los gastos registrados (egresos)
 * y retorna los últimos movimientos ordenados por fecha.
 */
function getRecentFinancialMovements(limit) {
  try {
    const tz = Session.getScriptTimeZone();
    const maxItems = limit && Number(limit) > 0 ? Number(limit) : 10;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const movements = [];
    
    /**
     * Helper: formatea fechas provenientes de la hoja
     */
    const formatDate = (value) => {
      if (value instanceof Date) {
        return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
      }
      if (!value) {
        return '';
      }
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return Utilities.formatDate(parsed, tz, 'yyyy-MM-dd');
      }
      return String(value);
    };
    
    /**
     * Helper: obtiene timestamp numérico para ordenar
     */
    const getTimestamp = (value) => {
      if (value instanceof Date) {
        return value.getTime();
      }
      if (!value) {
        return 0;
      }
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };
    
    // === Ingresos (Pagos) ===
    const paymentsSheet = ss.getSheetByName('Pagos');
    if (paymentsSheet) {
      const paymentsData = paymentsSheet.getDataRange().getValues();
      if (paymentsData.length > 1) {
        const headers = paymentsData[0].map(header => String(header || '').trim());
        const rows = paymentsData.slice(1);
        
        const idIdx = headers.indexOf('ID');
        const playerIdx = headers.indexOf('Jugador ID');
        const typeIdx = headers.indexOf('Tipo');
        const amountIdx = headers.indexOf('Monto');
        const dateIdx = headers.indexOf('Fecha');
        const statusIdx = headers.indexOf('Estado');
        let methodIdx = headers.indexOf('Método Pago');
        if (methodIdx === -1) {
          methodIdx = headers.indexOf('Metodo Pago');
        }
        const referenceIdx = headers.indexOf('Referencia');
        
        rows.forEach(row => {
          if (!row || row.length === 0) {
            return;
          }
          
          const status = String(row[statusIdx] || '').toLowerCase();
          if (status !== 'pagado') {
            return;
          }
          
          const amount = parseFloat(row[amountIdx] || 0);
          if (!amount) {
            return;
          }
          
          const rawDate = row[dateIdx];
          const formattedDate = formatDate(rawDate);
          const timestamp = getTimestamp(rawDate);
          
          const playerId = String(row[playerIdx] || '').trim();
          const paymentType = String(row[typeIdx] || '').trim();
          const reference = String(referenceIdx !== -1 ? row[referenceIdx] : '').trim();
          
          const descriptionParts = [];
          if (playerId) {
            descriptionParts.push(playerId);
          }
          if (paymentType) {
            descriptionParts.push(paymentType);
          }
          if (!descriptionParts.length) {
            descriptionParts.push('Pago registrado');
          }
          const description = descriptionParts.join(' - ');
          
          movements.push({
            id: String(row[idIdx] || ''),
            tipo: 'income',
            categoria: paymentType || 'Ingreso',
            descripcion: description,
            monto: amount,
            metodoPago: methodIdx !== -1 ? String(row[methodIdx] || '') : 'Sistema Automático',
            fecha: formattedDate,
            timestamp: timestamp,
            referencia: reference,
            puedeEliminar: true,
            fuente: 'Pagos'
          });
        });
      }
    } else {
      Logger.log('⚠️ Hoja de Pagos no encontrada al obtener movimientos recientes');
    }
    
    // === Gastos ===
    const expensesSheet = ss.getSheetByName('Gastos');
    if (expensesSheet) {
      const expensesData = expensesSheet.getDataRange().getValues();
      if (expensesData.length > 0) {
        const firstRow = expensesData[0];
        const hasHeaders = !String(firstRow[0]).startsWith('EXP_') &&
          (String(firstRow[0]).toLowerCase().includes('id') || String(firstRow[0]).toLowerCase().includes('gasto'));
        
        let dataRows;
        let idIdx, descIdx, amountIdx, dateIdx, categoryIdx, methodIdx;
        
        if (hasHeaders) {
          const headers = firstRow.map(header => String(header || '').trim());
          dataRows = expensesData.slice(1);
          
          idIdx = headers.findIndex(h => h.toLowerCase().includes('id'));
          descIdx = headers.findIndex(h => h.toLowerCase().includes('descrip'));
          amountIdx = headers.findIndex(h => h.toLowerCase().includes('monto'));
          dateIdx = headers.findIndex(h => h.toLowerCase().includes('fecha'));
          categoryIdx = headers.findIndex(h => h.toLowerCase().includes('categor'));
          methodIdx = headers.findIndex(h => h.toLowerCase().includes('método') || h.toLowerCase().includes('metodo'));
        } else {
          dataRows = expensesData;
          idIdx = 0;
          descIdx = 1;
          amountIdx = 2;
          dateIdx = 3;
          categoryIdx = 4;
          methodIdx = 5;
        }
        
        dataRows.forEach(row => {
          if (!row || !row[idIdx]) {
            return;
          }
          
          const amount = parseFloat(row[amountIdx] || 0);
          if (!amount) {
            return;
          }
          
          const rawDate = row[dateIdx];
          const formattedDate = formatDate(rawDate);
          const timestamp = getTimestamp(rawDate);
          
          const description = String(row[descIdx] || '').trim() || 'Gasto registrado';
          const category = String(row[categoryIdx] || '').trim() || 'General';
          const method = methodIdx !== -1 ? String(row[methodIdx] || '') : '';
          
          movements.push({
            id: String(row[idIdx] || ''),
            tipo: 'expense',
            categoria: category,
            descripcion: description,
            monto: amount,
            metodoPago: method || 'No especificado',
            fecha: formattedDate,
            timestamp: timestamp,
            puedeEliminar: true,
            fuente: 'Gastos'
          });
        });
      }
    } else {
      Logger.log('⚠️ Hoja de Gastos no encontrada al obtener movimientos recientes');
    }
    
    Logger.log(`📊 Movimientos totales recopilados: ${movements.length}`);
    
    // Ordenar por fecha (más reciente primero)
    movements.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    const totals = movements.reduce((acc, movement) => {
      const amount = Math.abs(parseFloat(movement.monto) || 0);
      if (movement.tipo === 'income') {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
    
    return {
      success: true,
      movements: movements,
      totals: totals
    };
    
  } catch (error) {
    Logger.log('❌ Error obteniendo movimientos financieros recientes: ' + error.toString());
    return {
      success: false,
      movements: [],
      totals: {
        income: 0,
        expense: 0
      },
      message: error.toString()
    };
  }
}

/**
 * ELIMINAR GASTO
 * Elimina un gasto específico por su ID
 */
function deleteExpense(expenseId) {
  try {
    Logger.log('🗑️ Eliminando gasto: ' + expenseId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      Logger.log('❌ Hoja de Gastos no encontrada');
      throw new Error('Hoja de Gastos no encontrada');
    }
    
    const data = expensesSheet.getDataRange().getValues();
    
    Logger.log('📊 Total de filas en hoja Gastos:', data.length);
    
    // Detectar si la primera fila es un header o un dato
    // Si la primera columna de la primera fila comienza con "EXP_", no hay headers
    const hasHeaders = !String(data[0][0]).startsWith('EXP_');
    
    if (hasHeaders) {
      // Hay headers, buscar índice de columna ID
      const headers = data[0];
      
      // Log individual de cada header
      Logger.log('📋 Headers de la hoja Gastos (' + headers.length + ' columnas):');
      headers.forEach((header, index) => {
        Logger.log('   Columna ' + (index + 1) + ': ' + header);
      });
      
      // Buscar el índice de la columna ID con diferentes nombres posibles
      let idIdx = headers.indexOf('ID Gasto');
      if (idIdx === -1) {
        idIdx = headers.indexOf('ID');
        Logger.log('🔍 Columna "ID Gasto" no encontrada, buscando "ID"...');
      }
      if (idIdx === -1) {
        idIdx = headers.indexOf('ID del Gasto');
        Logger.log('🔍 Columna "ID" no encontrada, buscando "ID del Gasto"...');
      }
      
      if (idIdx === -1) {
        Logger.log('❌ No se encontró columna de ID en headers');
        throw new Error('No se encontró columna de ID en la hoja Gastos');
      }
      
      Logger.log('✅ Columna ID encontrada en índice:', idIdx);
      
      // Buscar la fila del gasto (empezar desde fila 1 porque fila 0 es headers)
      let found = false;
      for (let i = 1; i < data.length; i++) {
        Logger.log(`🔍 Buscando en fila ${i + 1}: ID="${data[i][idIdx]}"`);
        if (String(data[i][idIdx]) === String(expenseId)) {
          Logger.log('✅ Gasto encontrado en fila:', i + 1);
          expensesSheet.deleteRow(i + 1);
          Logger.log('✅ Gasto eliminado exitosamente');
          found = true;
          return { success: true, message: 'Gasto eliminado exitosamente' };
        }
      }
      
      if (!found) {
        Logger.log('❌ Gasto no encontrado con ID:', expenseId);
        Logger.log('📋 IDs disponibles:', data.slice(1).map(row => row[idIdx]));
        throw new Error('Gasto no encontrado');
      }
      
    } else {
      // NO hay headers, la primera columna es el ID
      Logger.log('⚠️ No se encontraron headers, la primera columna es el ID');
      
      // Buscar la fila del gasto (empezar desde fila 0 porque no hay headers)
      let found = false;
      for (let i = 0; i < data.length; i++) {
        Logger.log(`🔍 Buscando en fila ${i + 1}: ID="${data[i][0]}"`);
        if (String(data[i][0]) === String(expenseId)) {
          Logger.log('✅ Gasto encontrado en fila:', i + 1);
          expensesSheet.deleteRow(i + 1);
          Logger.log('✅ Gasto eliminado exitosamente');
          found = true;
          return { success: true, message: 'Gasto eliminado exitosamente' };
        }
      }
      
      if (!found) {
        Logger.log('❌ Gasto no encontrado con ID:', expenseId);
        Logger.log('📋 Primeros 5 IDs disponibles:', data.slice(0, 5).map(row => row[0]));
        throw new Error('Gasto no encontrado');
      }
    }
    
  } catch (error) {
    Logger.log('❌ Error eliminando gasto: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ELIMINAR PAGO
 * Elimina un pago específico por su ID en la hoja Pagos
 */
function deletePaymentRecord(paymentId) {
  try {
    Logger.log('🗑️ Eliminando pago: ' + paymentId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      Logger.log('❌ Hoja de Pagos no encontrada');
      throw new Error('Hoja de Pagos no encontrada');
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    if (!data || data.length === 0) {
      throw new Error('No hay datos en la hoja de Pagos');
    }
    
    const headers = data[0];
    const hasHeaders = headers.some(header => String(header || '').toLowerCase().includes('id'));
    
    let idIdx = 0;
    let startRow = 0;
    
    if (hasHeaders) {
      idIdx = headers.findIndex(header => String(header || '').trim() === 'ID');
      if (idIdx === -1) {
        idIdx = headers.findIndex(header => String(header || '').toLowerCase().includes('id'));
      }
      if (idIdx === -1) {
        throw new Error('No se encontró la columna de ID en la hoja de Pagos');
      }
      startRow = 1;
    }
    
    for (let i = startRow; i < data.length; i++) {
      if (String(data[i][idIdx]) === String(paymentId)) {
        paymentsSheet.deleteRow(i + 1);
        Logger.log('✅ Pago eliminado exitosamente');
        return { success: true, message: 'Pago eliminado exitosamente' };
      }
    }
    
    throw new Error('Pago no encontrado');
    
  } catch (error) {
    Logger.log('❌ Error eliminando pago: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * ELIMINAR MOVIMIENTO FINANCIERO (Ingreso o Gasto)
 */
function deleteFinancialMovement(movementId, movementType) {
  try {
    if (!movementId) {
      throw new Error('ID de movimiento no proporcionado');
    }
    
    const type = String(movementType || '').toLowerCase();
    
    if (type === 'income') {
      return deletePaymentRecord(movementId);
    }
    
    if (type === 'expense') {
      return deleteExpense(movementId);
    }
    
    throw new Error('Tipo de movimiento no soportado: ' + movementType);
    
  } catch (error) {
    Logger.log('❌ Error eliminando movimiento: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}
