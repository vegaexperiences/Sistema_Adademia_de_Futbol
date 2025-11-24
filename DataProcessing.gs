/**
 * ========================================
 * ARCHIVO: DataProcessing.gs
 * DESCRIPCIÓN: Procesamiento de datos y operaciones del sistema
 * FUNCIONES: Procesamiento de datos, sincronización, reportes, exportación
 * ========================================
 */

/**
 * Procesa y sincroniza todos los datos del sistema
 */
function syncAllData() {
  try {
    Logger.log('Iniciando sincronización completa del sistema...');
    
    // Procesar formularios pendientes
    processFormSubmission();
    
    // Actualizar métricas financieras
    updateFinancialMetrics();
    
    // Generar pagos mensuales si es necesario
    generateMonthlyPaymentsIfNeeded();
    
    // Limpiar logs antiguos
    cleanOldLogs();
    
    // Actualizar estadísticas de jugadores
    updatePlayerStatistics();
    
    Logger.log('Sincronización completa finalizada');
    return true;
    
  } catch (error) {
    Logger.log('Error en sincronización completa: ' + error.toString());
    return false;
  }
}

/**
 * Genera pagos mensuales si es el momento apropiado
 */
function generateMonthlyPaymentsIfNeeded() {
  try {
    // Verificar fecha de inicio de generación de mensualidades
    const startDate = getMonthlyFeeGenerationStartDate();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);
    
    if (now < startDateNormalized) {
      Logger.log(`⏸️ Generación de mensualidades pausada hasta ${startDate.toLocaleDateString('es-ES')}. Fecha actual: ${now.toLocaleDateString('es-ES')}`);
      return;
    }
    
    const currentDay = now.getDate();
    
    // Generar pagos mensuales el día 1 de cada mes
    if (currentDay === 1) {
      const lastGeneration = getLastMonthlyPaymentGeneration();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      if (!lastGeneration || 
          lastGeneration.month !== currentMonth || 
          lastGeneration.year !== currentYear) {
        
        const count = generateMonthlyPayments();
        logMonthlyPaymentGeneration(currentMonth, currentYear, count);
        
        Logger.log(`Pagos mensuales generados: ${count} pagos`);
      }
    }
    
  } catch (error) {
    Logger.log('Error generando pagos mensuales automáticos: ' + error.toString());
  }
}

/**
 * Obtiene la última generación de pagos mensuales
 */
function getLastMonthlyPaymentGeneration() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      return null;
    }
    
    const data = logsSheet.getDataRange().getValues();
    const lastGenerationRow = data.find(row => 
      row[0] === 'monthly_payment_generation'
    );
    
    if (lastGenerationRow) {
      return {
        month: parseInt(lastGenerationRow[1]),
        year: parseInt(lastGenerationRow[2])
      };
    }
    
    return null;
    
  } catch (error) {
    Logger.log('Error obteniendo última generación de pagos: ' + error.toString());
    return null;
  }
}

/**
 * Registra la generación de pagos mensuales
 */
function logMonthlyPaymentGeneration(month, year, count) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.getRange(1, 1, 1, 4).setValues([['Tipo', 'Mes', 'Año', 'Cantidad']]);
    }
    
    const data = logsSheet.getDataRange().getValues();
    const existingRowIndex = data.findIndex(row => 
      row[0] === 'monthly_payment_generation'
    );
    
    if (existingRowIndex >= 0) {
      logsSheet.getRange(existingRowIndex + 1, 2).setValue(month);
      logsSheet.getRange(existingRowIndex + 1, 3).setValue(year);
      logsSheet.getRange(existingRowIndex + 1, 4).setValue(count);
    } else {
      logsSheet.appendRow(['monthly_payment_generation', month, year, count]);
    }
    
  } catch (error) {
    Logger.log('Error registrando generación de pagos: ' + error.toString());
  }
}

/**
 * Actualiza estadísticas de jugadores
 */
function updatePlayerStatistics() {
  try {
    const stats = getPlayerStatistics();
    
    if (stats) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let metricsSheet = ss.getSheetByName('Métricas');
      
      if (!metricsSheet) {
        metricsSheet = ss.insertSheet('Métricas');
        const headers = ['Métrica', 'Valor', 'Fecha Actualización'];
        metricsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      const currentDate = new Date();
      const metrics = [
        ['total_players', stats.total, currentDate],
        ['active_players', stats.active, currentDate],
        ['scholarship_players', stats.scholarship, currentDate],
        ['total_families', stats.families, currentDate]
      ];
      
      metrics.forEach(([metric, value, date]) => {
        updateMetric(metricsSheet, metric, value, date);
      });
      
      Logger.log('Estadísticas de jugadores actualizadas');
    }
    
  } catch (error) {
    Logger.log('Error actualizando estadísticas de jugadores: ' + error.toString());
  }
}

/**
 * Genera reportes del sistema
 */
function generateSystemReports() {
  try {
    const reports = [];
    const currentDate = new Date();
    
    // Reporte financiero mensual
    const financialReport = generateFinancialReport();
    if (financialReport) {
      reports.push({
        type: 'financial_monthly',
        data: financialReport,
        filename: `reporte_financiero_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.json`
      });
    }
    
    // Reporte de jugadores
    const playersReport = generatePlayersReport();
    if (playersReport) {
      reports.push({
        type: 'players',
        data: playersReport,
        filename: `reporte_jugadores_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.json`
      });
    }
    
    // Reporte de aprobaciones
    const approvalsReport = generateApprovalsReport();
    if (approvalsReport) {
      reports.push({
        type: 'approvals',
        data: approvalsReport,
        filename: `reporte_aprobaciones_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.json`
      });
    }
    
    Logger.log(`${reports.length} reportes generados`);
    return reports;
    
  } catch (error) {
    Logger.log('Error generando reportes: ' + error.toString());
    return [];
  }
}

/**
 * Genera reporte financiero
 */
function generateFinancialReport() {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const report = {
      period: {
        start: startOfMonth,
        end: endOfMonth,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      },
      summary: getFinancialSummary('current_month'),
      payments: [],
      expenses: [],
      pendingPayments: getPlayersWithPendingPayments()
    };
    
    // Obtener pagos del mes
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (paymentsSheet) {
      const data = paymentsSheet.getDataRange().getValues();
      const headers = data[0];
      const payments = data.slice(1).filter(row => {
        const paymentDate = new Date(row[4]);
        return paymentDate >= startOfMonth && paymentDate <= endOfMonth;
      });
      
      report.payments = payments.map(row => {
        const payment = {};
        headers.forEach((header, index) => {
          payment[header] = row[index];
        });
        return payment;
      });
    }
    
    // Obtener gastos del mes
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (expensesSheet) {
      const data = expensesSheet.getDataRange().getValues();
      const headers = data[0];
      const expenses = data.slice(1).filter(row => {
        const expenseDate = new Date(row[3]);
        return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
      });
      
      report.expenses = expenses.map(row => {
        const expense = {};
        headers.forEach((header, index) => {
          expense[header] = row[index];
        });
        return expense;
      });
    }
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte financiero: ' + error.toString());
    return null;
  }
}

/**
 * Genera reporte de jugadores
 */
function generatePlayersReport() {
  try {
    const allPlayers = getAllPlayers();
    const stats = getPlayerStatistics();
    
    const report = {
      generatedAt: new Date(),
      statistics: stats,
      players: allPlayers,
      families: getAllFamilies(),
      categories: {}
    };
    
    // Agrupar por categorías
    allPlayers.forEach(player => {
      if (player.Categoría) {
        if (!report.categories[player.Categoría]) {
          report.categories[player.Categoría] = {
            total: 0,
            active: 0,
            scholarship: 0,
            players: []
          };
        }
        
        report.categories[player.Categoría].total++;
        report.categories[player.Categoría].players.push(player);
        
        if (player.Estado === 'Activo') {
          report.categories[player.Categoría].active++;
        }
        
        if (player.Tipo === 'becado') {
          report.categories[player.Categoría].scholarship++;
        }
      }
    });
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte de jugadores: ' + error.toString());
    return null;
  }
}

/**
 * Genera reporte de aprobaciones
 */
function generateApprovalsReport() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approvalsSheet = ss.getSheetByName('Aprobaciones');
    
    if (!approvalsSheet) {
      return null;
    }
    
    const data = approvalsSheet.getDataRange().getValues();
    const headers = data[0];
    const approvals = data.slice(1);
    
    const report = {
      generatedAt: new Date(),
      total: approvals.length,
      byStatus: {},
      byType: {},
      approvals: []
    };
    
    // Procesar aprobaciones
    approvals.forEach(row => {
      const approval = {};
      headers.forEach((header, index) => {
        approval[header] = row[index];
      });
      
      report.approvals.push(approval);
      
      // Contar por estado
      const status = approval.Estado || 'Sin estado';
      report.byStatus[status] = (report.byStatus[status] || 0) + 1;
      
      // Contar por tipo
      const type = approval['Tipo Aprobación'] || 'Sin tipo';
      report.byType[type] = (report.byType[type] || 0) + 1;
    });
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte de aprobaciones: ' + error.toString());
    return null;
  }
}

/**
 * Exporta todos los datos del sistema
 */
function exportAllData() {
  try {
    const exportData = {
      exportedAt: new Date(),
      players: getAllPlayers(),
      families: getAllFamilies(),
      financialSummary: getFinancialSummary('current_month'),
      systemConfig: getSystemConfig(),
      statistics: getPlayerStatistics()
    };
    
    // Convertir a JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Crear archivo de texto con los datos
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let exportSheet = ss.getSheetByName('Export');
    
    if (!exportSheet) {
      exportSheet = ss.insertSheet('Export');
    }
    
    // Limpiar hoja
    exportSheet.clear();
    
    // Escribir datos
    exportSheet.getRange(1, 1).setValue('Datos Exportados del Sistema');
    exportSheet.getRange(2, 1).setValue('Fecha de Exportación: ' + new Date().toLocaleString());
    exportSheet.getRange(4, 1).setValue(jsonData);
    
    Logger.log('Datos exportados exitosamente');
    return true;
    
  } catch (error) {
    Logger.log('Error exportando datos: ' + error.toString());
    return false;
  }
}

/**
 * Limpia logs antiguos
 */
function cleanOldLogs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      return;
    }
    
    const maxLogEntries = SYSTEM_CONFIG.LOGS.MAX_LOG_ENTRIES;
    const logRetentionDays = SYSTEM_CONFIG.LOGS.LOG_RETENTION_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - logRetentionDays);
    
    const data = logsSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Filtrar logs antiguos
    const filteredRows = rows.filter(row => {
      const logDate = new Date(row[3] || row[2] || row[1]); // Buscar fecha en diferentes columnas
      return logDate >= cutoffDate;
    });
    
    // Limitar número de entradas
    const finalRows = filteredRows.slice(-maxLogEntries);
    
    // Limpiar y reescribir hoja
    logsSheet.clear();
    logsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    if (finalRows.length > 0) {
      logsSheet.getRange(2, 1, finalRows.length, headers.length).setValues(finalRows);
    }
    
    Logger.log(`Logs limpiados: ${rows.length - finalRows.length} entradas eliminadas`);
    
  } catch (error) {
    Logger.log('Error limpiando logs: ' + error.toString());
  }
}

/**
 * Obtiene estadísticas completas del sistema
 */
function getSystemStatistics() {
  try {
    const playerStats = getPlayerStatistics();
    const financialSummary = getFinancialSummary('current_month');
    const allPlayers = getAllPlayers();
    
    // Calcular pagos del mes
    const monthlyPayments = allPlayers.filter(player => {
      if (player.Estado !== 'Activo' || player.Tipo === 'becado') {
        return false;
      }
      
      const accountStatus = getPlayerAccountStatus(player.ID);
      return accountStatus && accountStatus.paidAmount > 0;
    }).length;
    
    return {
      totalPlayers: playerStats ? playerStats.total : 0,
      activePlayers: playerStats ? playerStats.active : 0,
      scholarshipPlayers: playerStats ? playerStats.scholarship : 0,
      totalFamilies: playerStats ? playerStats.families : 0,
      monthlyPayments: monthlyPayments,
      monthlyIncome: financialSummary ? financialSummary.totalIncome : 0,
      monthlyExpenses: financialSummary ? financialSummary.totalExpenses : 0,
      netProfit: financialSummary ? financialSummary.netProfit : 0
    };
    
  } catch (error) {
    Logger.log('Error obteniendo estadísticas del sistema: ' + error.toString());
    return null;
  }
}

/**
 * Procesa datos de formularios en lote
 */
function processBatchFormData(formDataArray) {
  try {
    const results = {
      processed: 0,
      errors: 0,
      details: []
    };
    
    formDataArray.forEach((formData, index) => {
      try {
        const validation = validateAdmissionData(formData);
        
        if (validation.isValid) {
          // Procesar datos válidos
          const players = formData.players;
          const familyId = generateFamilyId();
          
          players.forEach((player, playerIndex) => {
            const playerData = {
              ...player,
              familyId: familyId,
              isFirstInFamily: playerIndex === 0,
              responseNumber: index + 1,
              timestamp: new Date()
            };
            
            addToApprovalsSheet(playerData, 'admission');
          });
          
          results.processed++;
          results.details.push({
            index: index,
            status: 'success',
            message: `${players.length} jugadores procesados`
          });
          
        } else {
          results.errors++;
          results.details.push({
            index: index,
            status: 'error',
            message: validation.errors.join(', ')
          });
        }
        
      } catch (error) {
        results.errors++;
        results.details.push({
          index: index,
          status: 'error',
          message: error.toString()
        });
      }
    });
    
    Logger.log(`Procesamiento en lote completado: ${results.processed} exitosos, ${results.errors} errores`);
    return results;
    
  } catch (error) {
    Logger.log('Error en procesamiento en lote: ' + error.toString());
    return null;
  }
}

/**
 * Valida integridad de datos del sistema
 */
function validateDataIntegrity() {
  try {
    const issues = [];
    
    // Validar jugadores sin familia
    const allPlayers = getAllPlayers();
    const playersWithoutFamily = allPlayers.filter(player => 
      !player['Familia ID'] && player.Estado === 'Activo'
    );
    
    if (playersWithoutFamily.length > 0) {
      issues.push({
        type: 'warning',
        message: `${playersWithoutFamily.length} jugadores activos sin familia asignada`,
        data: playersWithoutFamily.map(p => p.ID)
      });
    }
    
    // Validar pagos sin jugador
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (paymentsSheet) {
      const paymentsData = paymentsSheet.getDataRange().getValues();
      const payments = paymentsData.slice(1);
      
      const orphanPayments = payments.filter(payment => {
        const playerId = payment[1];
        return !allPlayers.find(player => player.ID === playerId);
      });
      
      if (orphanPayments.length > 0) {
        issues.push({
          type: 'error',
          message: `${orphanPayments.length} pagos sin jugador asociado`,
          data: orphanPayments.map(p => p[0])
        });
      }
    }
    
    // Validar configuraciones
    const financialConfig = getFinancialConfig();
    if (financialConfig.FAMILY_MONTHLY_FEE >= financialConfig.MONTHLY_FEE) {
      issues.push({
        type: 'warning',
        message: 'La mensualidad familiar debe ser menor que la mensualidad individual',
        data: []
      });
    }
    
    Logger.log(`Validación de integridad completada: ${issues.length} problemas encontrados`);
    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues: issues
    };
    
  } catch (error) {
    Logger.log('Error validando integridad de datos: ' + error.toString());
    return null;
  }
}

/**
 * Sincronización diaria automática
 */
function dailySync() {
  try {
    Logger.log('Iniciando sincronización diaria...');
    
    // Procesar formularios
    processFormSubmission();
    
    // Actualizar métricas
    updateFinancialMetrics();
    
    // Validar integridad de datos
    const integrityCheck = validateDataIntegrity();
    if (integrityCheck && !integrityCheck.isValid) {
      Logger.log('Problemas de integridad encontrados: ' + 
        integrityCheck.issues.filter(i => i.type === 'error').length);
    }
    
    // Limpiar logs antiguos si es necesario
    const now = new Date();
    if (now.getDate() === 1) { // Primer día del mes
      cleanOldLogs();
    }
    
    Logger.log('Sincronización diaria completada');
    
  } catch (error) {
    Logger.log('Error en sincronización diaria: ' + error.toString());
  }
}

/**
 * Sincroniza todos los datos del sistema
 */
function syncAllDataOld() {
  try {
    Logger.log('Iniciando sincronización completa del sistema...');
    
    // Sincronizar datos de jugadores
    // syncPlayerData(); // DESACTIVADO - función no existe
    
    // Sincronizar datos financieros
    // syncFinancialData(); // DESACTIVADO - función no existe
    
    // Procesar formularios pendientes
    processFormMatriculaDataImproved(); // Usar la función correcta
    
    // Actualizar métricas
    // updateFinancialMetrics(); // DESACTIVADO - verificar si existe
    
    // Validar integridad de datos
    const integrityCheck = validateDataIntegrity();
    if (integrityCheck && !integrityCheck.isValid) {
      Logger.log('Problemas de integridad encontrados: ' + 
        integrityCheck.issues.filter(i => i.type === 'error').length);
    }
    
    Logger.log('Sincronización completa finalizada');
    return { success: true, message: 'Datos sincronizados exitosamente' };
    
  } catch (error) {
    Logger.log('Error en sincronización completa: ' + error.toString());
    throw error;
  }
}

/**
 * Genera reportes del sistema
 */
function generateSystemReports() {
  try {
    Logger.log('Generando reportes del sistema...');
    
    const reports = {
      players: generatePlayerReport(),
      financial: generateFinancialReport(),
      metrics: generateMetricsReport(),
      system: generateSystemReport()
    };
    
    Logger.log('Reportes generados exitosamente');
    return { success: true, message: 'Reportes generados exitosamente', reports: reports };
    
  } catch (error) {
    Logger.log('Error generando reportes: ' + error.toString());
    throw error;
  }
}

/**
 * Limpia logs antiguos
 */
function cleanOldLogs() {
  try {
    Logger.log('Limpiando logs antiguos...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Limpiar logs del sistema
    const logsSheet = getSheetByName(SYSTEM_CONFIG.SHEETS.LOGS);
    if (logsSheet) {
      const data = logsSheet.getDataRange().getValues();
      const filteredData = data.filter(row => {
        const logDate = new Date(row[0]);
        return logDate > thirtyDaysAgo;
      });
      
      logsSheet.clear();
      if (filteredData.length > 0) {
        logsSheet.getRange(1, 1, filteredData.length, filteredData[0].length).setValues(filteredData);
      }
    }
    
    Logger.log('Logs antiguos limpiados exitosamente');
    return { success: true, message: 'Logs antiguos limpiados exitosamente' };
    
  } catch (error) {
    Logger.log('Error limpiando logs: ' + error.toString());
    throw error;
  }
}

/**
 * Exporta todos los datos del sistema
 */
function exportAllData() {
  try {
    Logger.log('Exportando datos del sistema...');
    
    const exportData = {
      players: exportPlayerData(),
      financial: exportFinancialData(),
      forms: exportFormData(),
      metrics: exportMetricsData(),
      config: getSystemConfig()
    };
    
    Logger.log('Datos exportados exitosamente');
    return { success: true, message: 'Datos exportados exitosamente', data: exportData };
    
  } catch (error) {
    Logger.log('Error exportando datos: ' + error.toString());
    throw error;
  }
}
