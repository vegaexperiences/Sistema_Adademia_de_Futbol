/**
 * ========================================
 * ARCHIVO: DataLoader.gs
 * DESCRIPCIÓN: Carga y sincronización de datos del sistema
 * FUNCIONES: Carga de datos, sincronización, importación, exportación
 * ========================================
 */

/**
 * Carga todos los datos del sistema
 */
function loadAllSystemData() {
  try {
    Logger.log('Iniciando carga completa de datos del sistema...');
    
    const data = {
      players: loadPlayersData(),
      payments: loadPaymentsData(),
      expenses: loadExpensesData(),
      approvals: loadApprovalsData(),
      families: loadFamiliesData(),
      tournaments: loadTournamentsData(),
      config: loadConfigData(),
      metrics: loadMetricsData()
    };
    
    Logger.log('Carga completa de datos finalizada');
    return data;
    
  } catch (error) {
    Logger.log('Error cargando datos del sistema: ' + error.toString());
    return null;
  }
}

/**
 * Carga datos de jugadores
 */
function loadPlayersData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      Logger.log('Hoja de Jugadores no encontrada');
      return [];
    }
    
    const data = playersSheet.getDataRange().getValues();
    const headers = data[0];
    const players = data.slice(1).map(row => {
      const player = {};
      headers.forEach((header, index) => {
        player[header] = row[index];
      });
      return player;
    });
    
    Logger.log(`${players.length} jugadores cargados`);
    return players;
    
  } catch (error) {
    Logger.log('Error cargando datos de jugadores: ' + error.toString());
    return [];
  }
}

/**
 * Carga datos de pagos
 */
function loadPaymentsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      Logger.log('Hoja de Pagos no encontrada');
      return [];
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    const headers = data[0];
    const payments = data.slice(1).map(row => {
      const payment = {};
      headers.forEach((header, index) => {
        payment[header] = row[index];
      });
      return payment;
    });
    
    Logger.log(`${payments.length} pagos cargados`);
    return payments;
    
  } catch (error) {
    Logger.log('Error cargando datos de pagos: ' + error.toString());
    return [];
  }
}

/**
 * Carga datos de gastos
 */
function loadExpensesData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      Logger.log('Hoja de Gastos no encontrada');
      return [];
    }
    
    const data = expensesSheet.getDataRange().getValues();
    const headers = data[0];
    const expenses = data.slice(1).map(row => {
      const expense = {};
      headers.forEach((header, index) => {
        expense[header] = row[index];
      });
      return expense;
    });
    
    Logger.log(`${expenses.length} gastos cargados`);
    return expenses;
    
  } catch (error) {
    Logger.log('Error cargando datos de gastos: ' + error.toString());
    return [];
  }
}

/**
 * Carga datos de aprobaciones
 */
function loadApprovalsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      Logger.log('Hoja de Aprobaciones no encontrada');
      return [];
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const approvals = data.slice(1).map(row => {
      const approval = {};
      headers.forEach((header, index) => {
        approval[header] = row[index];
      });
      return approval;
    });
    
    Logger.log(`${approvals.length} aprobaciones cargadas`);
    return approvals;
    
  } catch (error) {
    Logger.log('Error cargando datos de aprobaciones: ' + error.toString());
    return [];
  }
}

/**
 * Carga datos de familias
 */
function loadFamiliesData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const familiesSheet = ss.getSheetByName('Familias');
    
    if (!familiesSheet) {
      Logger.log('Hoja de Familias no encontrada');
      return [];
    }
    
    const data = familiesSheet.getDataRange().getValues();
    const headers = data[0];
    const families = data.slice(1).map(row => {
      const family = {};
      headers.forEach((header, index) => {
        family[header] = row[index];
      });
      return family;
    });
    
    Logger.log(`${families.length} familias cargadas`);
    return families;
    
  } catch (error) {
    Logger.log('Error cargando datos de familias: ' + error.toString());
    return [];
  }
}

/**
 * Carga datos de torneos
 */
function loadTournamentsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tournamentsSheet = ss.getSheetByName('Torneos');
    
    if (!tournamentsSheet) {
      Logger.log('Hoja de Torneos no encontrada');
      return [];
    }
    
    const data = tournamentsSheet.getDataRange().getValues();
    const headers = data[0];
    const tournaments = data.slice(1).map(row => {
      const tournament = {};
      headers.forEach((header, index) => {
        tournament[header] = row[index];
      });
      return tournament;
    });
    
    Logger.log(`${tournaments.length} torneos cargados`);
    return tournaments;
    
  } catch (error) {
    Logger.log('Error cargando datos de torneos: ' + error.toString());
    return [];
  }
}

/**
 * Carga datos de configuración
 */
function loadConfigData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('Configuraciones');
    
    if (!configSheet) {
      Logger.log('Hoja de Configuraciones no encontrada');
      return {};
    }
    
    const data = configSheet.getDataRange().getValues();
    const config = {};
    
    data.forEach(row => {
      if (row[0] && row[1]) {
        config[row[0]] = row[1];
      }
    });
    
    Logger.log('Configuración cargada');
    return config;
    
  } catch (error) {
    Logger.log('Error cargando configuración: ' + error.toString());
    return {};
  }
}

/**
 * Carga datos de métricas
 */
function loadMetricsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const metricsSheet = ss.getSheetByName('Métricas');
    
    if (!metricsSheet) {
      Logger.log('Hoja de Métricas no encontrada');
      return [];
    }
    
    const data = metricsSheet.getDataRange().getValues();
    const headers = data[0];
    const metrics = data.slice(1).map(row => {
      const metric = {};
      headers.forEach((header, index) => {
        metric[header] = row[index];
      });
      return metric;
    });
    
    Logger.log(`${metrics.length} métricas cargadas`);
    return metrics;
    
  } catch (error) {
    Logger.log('Error cargando métricas: ' + error.toString());
    return [];
  }
}

/**
 * Sincroniza datos entre hojas
 */
function syncDataBetweenSheets() {
  try {
    Logger.log('Iniciando sincronización entre hojas...');
    
    // Sincronizar jugadores con familias
    syncPlayersWithFamilies();
    
    // Sincronizar pagos con jugadores
    syncPaymentsWithPlayers();
    
    // Sincronizar aprobaciones con jugadores
    syncApprovalsWithPlayers();
    
    // Actualizar métricas
    updateAllMetrics();
    
    Logger.log('Sincronización entre hojas completada');
    return true;
    
  } catch (error) {
    Logger.log('Error sincronizando datos entre hojas: ' + error.toString());
    return false;
  }
}

/**
 * Sincroniza jugadores con familias
 */
function syncPlayersWithFamilies() {
  try {
    const allPlayers = getAllPlayers();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let familiesSheet = ss.getSheetByName('Familias');
    
    if (!familiesSheet) {
      familiesSheet = ss.insertSheet('Familias');
      const headers = ['ID', 'Tutor Principal', 'Teléfono', 'Email', 'Total Jugadores', 'Jugadores Activos', 'Monto Mensual', 'Estado'];
      familiesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Agrupar jugadores por familia
    const familiesMap = {};
    allPlayers.forEach(player => {
      const familyId = player['Familia ID'];
      if (familyId) {
        if (!familiesMap[familyId]) {
          familiesMap[familyId] = {
            id: familyId,
            players: [],
            tutor: player.Tutor || '',
            phone: player.Teléfono || '',
            email: ''
          };
        }
        familiesMap[familyId].players.push(player);
      }
    });
    
    // Actualizar hoja de familias
    familiesSheet.clear();
    const headers = ['ID', 'Tutor Principal', 'Teléfono', 'Email', 'Total Jugadores', 'Jugadores Activos', 'Monto Mensual', 'Estado'];
    familiesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    Object.values(familiesMap).forEach(family => {
      const activePlayers = family.players.filter(p => p.Estado === 'Activo');
      const monthlyAmount = calculateFamilyMonthlyAmount(family.players);
      
      familiesSheet.appendRow([
        family.id,
        family.tutor,
        family.phone,
        family.email,
        family.players.length,
        activePlayers.length,
        monthlyAmount,
        activePlayers.length > 0 ? 'Activa' : 'Inactiva'
      ]);
    });
    
    Logger.log(`${Object.keys(familiesMap).length} familias sincronizadas`);
    
  } catch (error) {
    Logger.log('Error sincronizando jugadores con familias: ' + error.toString());
  }
}

/**
 * Calcula el monto mensual de una familia
 */
function calculateFamilyMonthlyAmount(players) {
  try {
    const financialConfig = getFinancialConfig();
    let totalAmount = 0;
    
    const activePlayers = players.filter(p => p.Estado === 'Activo' && p.Tipo !== 'becado');
    
    activePlayers.forEach((player, index) => {
      let amount = index === 0 ? financialConfig.MONTHLY_FEE : financialConfig.FAMILY_MONTHLY_FEE;
      
      // Aplicar descuento si existe
      if (player['Descuento %'] && player['Descuento %'] > 0) {
        amount = amount * (1 - player['Descuento %'] / 100);
      }
      
      totalAmount += amount;
    });
    
    return Math.round(totalAmount * 100) / 100;
    
  } catch (error) {
    Logger.log('Error calculando monto mensual de familia: ' + error.toString());
    return 0;
  }
}

/**
 * Sincroniza pagos con jugadores
 */
function syncPaymentsWithPlayers() {
  try {
    const allPayments = loadPaymentsData();
    const allPlayers = getAllPlayers();
    const playerIds = new Set(allPlayers.map(p => p.ID));
    
    // Verificar pagos huérfanos
    const orphanPayments = allPayments.filter(payment => 
      !playerIds.has(payment['Jugador ID'])
    );
    
    if (orphanPayments.length > 0) {
      Logger.log(`${orphanPayments.length} pagos huérfanos encontrados`);
      
      // Marcar pagos huérfanos
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const paymentsSheet = ss.getSheetByName('Pagos');
      const data = paymentsSheet.getDataRange().getValues();
      
      orphanPayments.forEach(orphanPayment => {
        const rowIndex = data.findIndex(row => row[0] === orphanPayment.ID);
        if (rowIndex >= 0) {
          paymentsSheet.getRange(rowIndex + 1, 11).setValue('Jugador no encontrado'); // Columna Observaciones
        }
      });
    }
    
    Logger.log('Pagos sincronizados con jugadores');
    
  } catch (error) {
    Logger.log('Error sincronizando pagos con jugadores: ' + error.toString());
  }
}

/**
 * Sincroniza aprobaciones con jugadores
 */
function syncApprovalsWithPlayers() {
  try {
    const allApprovals = loadApprovalsData();
    const allPlayers = getAllPlayers();
    const playerIds = new Set(allPlayers.map(p => p.ID));
    
    // Verificar aprobaciones que ya fueron procesadas
    const processedApprovals = allApprovals.filter(approval => 
      approval.Estado === 'Aprobado' && playerIds.has(approval.ID)
    );
    
    if (processedApprovals.length > 0) {
      Logger.log(`${processedApprovals.length} aprobaciones ya procesadas encontradas`);
    }
    
    Logger.log('Aprobaciones sincronizadas con jugadores');
    
  } catch (error) {
    Logger.log('Error sincronizando aprobaciones con jugadores: ' + error.toString());
  }
}

/**
 * Actualiza todas las métricas
 */
function updateAllMetrics() {
  try {
    updateFinancialMetrics();
    updatePlayerStatistics();
    
    Logger.log('Todas las métricas actualizadas');
    
  } catch (error) {
    Logger.log('Error actualizando métricas: ' + error.toString());
  }
}

/**
 * Importa datos desde CSV
 */
function importDataFromCSV(csvData, dataType) {
  try {
    Logger.log(`Importando datos de tipo: ${dataType}`);
    
    const objects = csvToObjects(csvData, true);
    
    if (objects.length === 0) {
      throw new Error('No se encontraron datos válidos en el CSV');
    }
    
    let importedCount = 0;
    
    switch (dataType) {
      case 'players':
        importedCount = importPlayersData(objects);
        break;
      case 'payments':
        importedCount = importPaymentsData(objects);
        break;
      case 'expenses':
        importedCount = importExpensesData(objects);
        break;
      default:
        throw new Error(`Tipo de datos no soportado: ${dataType}`);
    }
    
    Logger.log(`${importedCount} registros importados exitosamente`);
    return importedCount;
    
  } catch (error) {
    Logger.log('Error importando datos desde CSV: ' + error.toString());
    throw error;
  }
}

/**
 * Importa datos de jugadores
 */
function importPlayersData(playersData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('Hoja de Jugadores no encontrada');
    }
    
    let importedCount = 0;
    
    playersData.forEach(playerData => {
      try {
        // Validar datos
        const validation = validatePlayerData(playerData);
        if (validation.length > 0) {
          Logger.log(`Jugador omitido por validación: ${validation.join(', ')}`);
          return;
        }
        
        // Generar ID único
        const playerId = generatePlayerId();
        
        // Preparar datos
        const rowData = [
          playerId,
          playerData.name || '',
          playerData.lastName || '',
          playerData.age || '',
          playerData.cedula || '',
          playerData.phone || '',
          playerData.category || '',
          'Activo',
          new Date(),
          playerData.tutor || '',
          playerData.familyId || '',
          'normal',
          0,
          playerData.observations || ''
        ];
        
        // Insertar en hoja
        playersSheet.appendRow(rowData);
        importedCount++;
        
      } catch (error) {
        Logger.log(`Error importando jugador: ${error.toString()}`);
      }
    });
    
    return importedCount;
    
  } catch (error) {
    Logger.log('Error importando datos de jugadores: ' + error.toString());
    return 0;
  }
}

/**
 * Importa datos de pagos
 */
function importPaymentsData(paymentsData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      throw new Error('Hoja de Pagos no encontrada');
    }
    
    let importedCount = 0;
    
    paymentsData.forEach(paymentData => {
      try {
        // Validar datos
        const validation = validatePaymentData(paymentData);
        if (!validation.isValid) {
          Logger.log(`Pago omitido por validación: ${validation.errors.join(', ')}`);
          return;
        }
        
        // Generar ID único
        const paymentId = generatePaymentId();
        
        // Preparar datos
        const rowData = [
          paymentId,
          paymentData.playerId,
          paymentData.type || 'Mensualidad',
          parseFloat(paymentData.amount) || 0,
          new Date(paymentData.date || new Date()),
          paymentData.state || 'Pagado',
          paymentData.method || 'Efectivo',
          paymentData.reference || '',
          paymentData.observations || '',
          paymentData.discountApplied || 0
        ];
        
        // Insertar en hoja
        paymentsSheet.appendRow(rowData);
        importedCount++;
        
      } catch (error) {
        Logger.log(`Error importando pago: ${error.toString()}`);
      }
    });
    
    return importedCount;
    
  } catch (error) {
    Logger.log('Error importando datos de pagos: ' + error.toString());
    return 0;
  }
}

/**
 * Importa datos de gastos
 */
function importExpensesData(expensesData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      expensesSheet = ss.insertSheet('Gastos');
      const headers = ['ID', 'Descripción', 'Monto', 'Fecha', 'Categoría', 'Método Pago', 'Observaciones'];
      expensesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    let importedCount = 0;
    
    expensesData.forEach(expenseData => {
      try {
        // Validar datos
        const validation = validateExpenseData(expenseData);
        if (!validation.isValid) {
          Logger.log(`Gasto omitido por validación: ${validation.errors.join(', ')}`);
          return;
        }
        
        // Generar ID único
        const expenseId = generateExpenseId();
        
        // Preparar datos
        const rowData = [
          expenseId,
          expenseData.description,
          parseFloat(expenseData.amount) || 0,
          new Date(expenseData.date || new Date()),
          expenseData.category || 'Otros',
          expenseData.method || 'Efectivo',
          expenseData.observations || ''
        ];
        
        // Insertar en hoja
        expensesSheet.appendRow(rowData);
        importedCount++;
        
      } catch (error) {
        Logger.log(`Error importando gasto: ${error.toString()}`);
      }
    });
    
    return importedCount;
    
  } catch (error) {
    Logger.log('Error importando datos de gastos: ' + error.toString());
    return 0;
  }
}

/**
 * Exporta datos a CSV
 */
function exportDataToCSV(dataType, filters = {}) {
  try {
    Logger.log(`Exportando datos de tipo: ${dataType}`);
    
    let data = [];
    
    switch (dataType) {
      case 'players':
        data = getAllPlayers();
        break;
      case 'payments':
        data = loadPaymentsData();
        break;
      case 'expenses':
        data = loadExpensesData();
        break;
      case 'approvals':
        data = loadApprovalsData();
        break;
      case 'families':
        data = loadFamiliesData();
        break;
      default:
        throw new Error(`Tipo de datos no soportado: ${dataType}`);
    }
    
    // Aplicar filtros si existen
    if (Object.keys(filters).length > 0) {
      data = applyFiltersToData(data, filters);
    }
    
    // Convertir a CSV
    const csvContent = objectToCSV(data);
    
    Logger.log(`${data.length} registros exportados a CSV`);
    return csvContent;
    
  } catch (error) {
    Logger.log('Error exportando datos a CSV: ' + error.toString());
    throw error;
  }
}

/**
 * Aplica filtros a los datos
 */
function applyFiltersToData(data, filters) {
  try {
    let filteredData = data;
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        filteredData = filteredData.filter(item => {
          const itemValue = item[key];
          if (typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      }
    });
    
    return filteredData;
    
  } catch (error) {
    Logger.log('Error aplicando filtros: ' + error.toString());
    return data;
  }
}

/**
 * Realiza respaldo completo de datos
 */
function performFullBackup() {
  try {
    Logger.log('Iniciando respaldo completo de datos...');
    
    const backupData = {
      timestamp: new Date(),
      version: '1.0',
      data: loadAllSystemData(),
      config: getSystemConfig(),
      metadata: {
        totalPlayers: getAllPlayers().length,
        totalPayments: loadPaymentsData().length,
        totalExpenses: loadExpensesData().length,
        totalApprovals: loadApprovalsData().length
      }
    };
    
    // Guardar respaldo en hoja especial
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let backupSheet = ss.getSheetByName('Respaldo');
    
    if (!backupSheet) {
      backupSheet = ss.insertSheet('Respaldo');
    }
    
    // Limpiar hoja
    backupSheet.clear();
    
    // Escribir datos de respaldo
    backupSheet.getRange(1, 1).setValue('Respaldo del Sistema');
    backupSheet.getRange(2, 1).setValue('Fecha: ' + backupData.timestamp.toLocaleString());
    backupSheet.getRange(3, 1).setValue('Versión: ' + backupData.version);
    backupSheet.getRange(5, 1).setValue(safeJSONStringify(backupData, null, 2));
    
    Logger.log('Respaldo completo realizado exitosamente');
    return true;
    
  } catch (error) {
    Logger.log('Error realizando respaldo completo: ' + error.toString());
    return false;
  }
}

/**
 * Restaura datos desde respaldo
 */
function restoreFromBackup() {
  try {
    Logger.log('Iniciando restauración desde respaldo...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const backupSheet = ss.getSheetByName('Respaldo');
    
    if (!backupSheet) {
      throw new Error('No se encontró hoja de respaldo');
    }
    
    const backupData = backupSheet.getRange(5, 1).getValue();
    const backup = safeJSONParse(backupData);
    
    if (!backup || !backup.data) {
      throw new Error('Datos de respaldo inválidos');
    }
    
    // Restaurar datos
    restorePlayersData(backup.data.players);
    restorePaymentsData(backup.data.payments);
    restoreExpensesData(backup.data.expenses);
    restoreApprovalsData(backup.data.approvals);
    
    Logger.log('Restauración desde respaldo completada');
    return true;
    
  } catch (error) {
    Logger.log('Error restaurando desde respaldo: ' + error.toString());
    return false;
  }
}

/**
 * Restaura datos de jugadores
 */
function restorePlayersData(playersData) {
  try {
    if (!playersData || playersData.length === 0) return;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('Hoja de Jugadores no encontrada');
    }
    
    // Limpiar hoja
    playersSheet.clear();
    
    // Restaurar headers
    const headers = Object.keys(playersData[0]);
    playersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Restaurar datos
    const data = playersData.map(player => headers.map(header => player[header]));
    playersSheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    Logger.log(`${playersData.length} jugadores restaurados`);
    
  } catch (error) {
    Logger.log('Error restaurando datos de jugadores: ' + error.toString());
  }
}

/**
 * Restaura datos de pagos
 */
function restorePaymentsData(paymentsData) {
  try {
    if (!paymentsData || paymentsData.length === 0) return;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      throw new Error('Hoja de Pagos no encontrada');
    }
    
    // Limpiar hoja
    paymentsSheet.clear();
    
    // Restaurar headers
    const headers = Object.keys(paymentsData[0]);
    paymentsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Restaurar datos
    const data = paymentsData.map(payment => headers.map(header => payment[header]));
    paymentsSheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    Logger.log(`${paymentsData.length} pagos restaurados`);
    
  } catch (error) {
    Logger.log('Error restaurando datos de pagos: ' + error.toString());
  }
}

/**
 * Restaura datos de gastos
 */
function restoreExpensesData(expensesData) {
  try {
    if (!expensesData || expensesData.length === 0) return;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      expensesSheet = ss.insertSheet('Gastos');
    }
    
    // Limpiar hoja
    expensesSheet.clear();
    
    // Restaurar headers
    const headers = Object.keys(expensesData[0]);
    expensesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Restaurar datos
    const data = expensesData.map(expense => headers.map(header => expense[header]));
    expensesSheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    Logger.log(`${expensesData.length} gastos restaurados`);
    
  } catch (error) {
    Logger.log('Error restaurando datos de gastos: ' + error.toString());
  }
}

/**
 * Restaura datos de aprobaciones
 */
function restoreApprovalsData(approvalsData) {
  try {
    if (!approvalsData || approvalsData.length === 0) return;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      throw new Error('Hoja de Aprobaciones no encontrada');
    }
    
    // Limpiar hoja
    approvalsSheet.clear();
    
    // Restaurar headers
    const headers = Object.keys(approvalsData[0]);
    approvalsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Restaurar datos
    const data = approvalsData.map(approval => headers.map(header => approval[header]));
    approvalsSheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    Logger.log(`${approvalsData.length} aprobaciones restauradas`);
    
  } catch (error) {
    Logger.log('Error restaurando datos de aprobaciones: ' + error.toString());
  }
}

/**
 * Exporta datos de jugadores
 */
function exportPlayerData() {
  try {
    const players = getAllPlayers();
    const families = loadFamiliesData();
    
    return {
      players: players,
      families: families,
      exportDate: new Date().toISOString(),
      totalPlayers: players.length,
      totalFamilies: families.length
    };
    
  } catch (error) {
    Logger.log('Error exportando datos de jugadores: ' + error.toString());
    throw error;
  }
}

/**
 * Exporta datos financieros
 */
function exportFinancialData() {
  try {
    const payments = loadPaymentsData();
    const expenses = loadExpensesData();
    const discounts = loadDiscountData();
    
    return {
      payments: payments,
      expenses: expenses,
      discounts: discounts,
      exportDate: new Date().toISOString(),
      totalPayments: payments.length,
      totalExpenses: expenses.length,
      totalDiscounts: discounts.length
    };
    
  } catch (error) {
    Logger.log('Error exportando datos financieros: ' + error.toString());
    throw error;
  }
}

/**
 * Exporta datos de formularios
 */
function exportFormData() {
  try {
    const admissions = loadAdmissionData();
    const tournaments = loadTournamentData();
    
    return {
      admissions: admissions,
      tournaments: tournaments,
      exportDate: new Date().toISOString(),
      totalAdmissions: admissions.length,
      totalTournaments: tournaments.length
    };
    
  } catch (error) {
    Logger.log('Error exportando datos de formularios: ' + error.toString());
    throw error;
  }
}

/**
 * Exporta datos de métricas
 */
function exportMetricsData() {
  try {
    const metrics = loadMetricsData();
    const config = loadConfigData();
    
    return {
      metrics: metrics,
      config: config,
      exportDate: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Error exportando datos de métricas: ' + error.toString());
    throw error;
  }
}
