/**
 * ========================================
 * ARCHIVO: MetricsReporter.gs
 * DESCRIPCIÓN: Generación de métricas y reportes del sistema
 * FUNCIONES: Métricas, KPIs, reportes automáticos, análisis de datos
 * ========================================
 */

/**
 * Genera métricas completas del sistema
 */
function generateSystemMetrics() {
  try {
    const metrics = {
      timestamp: new Date(),
      players: generatePlayerMetrics(),
      financial: generateFinancialMetrics(),
      families: generateFamilyMetrics(),
      performance: generatePerformanceMetrics(),
      trends: generateTrendMetrics()
    };
    
    // Guardar métricas
    saveMetrics(metrics);
    
    return metrics;
    
  } catch (error) {
    Logger.log('Error generando métricas del sistema: ' + error.toString());
    return null;
  }
}

/**
 * Genera métricas de jugadores
 */
function generatePlayerMetrics() {
  try {
    const allPlayers = getAllPlayers();
    const stats = getPlayerStatistics();
    
    const metrics = {
      total: allPlayers.length,
      active: stats.active,
      inactive: stats.inactive,
      pending: stats.pending,
      scholarship: stats.scholarship,
      suspended: stats.suspended,
      byCategory: stats.byCategory,
      byGender: stats.byGender,
      averageAge: calculateAverageAge(allPlayers),
      newThisMonth: getNewPlayersThisMonth(),
      retentionRate: calculateRetentionRate(),
      growthRate: calculateGrowthRate()
    };
    
    return metrics;
    
  } catch (error) {
    Logger.log('Error generando métricas de jugadores: ' + error.toString());
    return null;
  }
}

/**
 * Genera métricas financieras
 */
function generateFinancialMetrics() {
  try {
    const currentMonth = getFinancialSummary('current_month');
    const lastMonth = getFinancialSummary('last_month');
    const currentYear = getFinancialSummary('current_year');
    
    const metrics = {
      currentMonth: {
        income: currentMonth ? currentMonth.totalIncome : 0,
        expenses: currentMonth ? currentMonth.totalExpenses : 0,
        profit: currentMonth ? currentMonth.netProfit : 0,
        margin: currentMonth ? currentMonth.profitMargin : 0
      },
      lastMonth: {
        income: lastMonth ? lastMonth.totalIncome : 0,
        expenses: lastMonth ? lastMonth.totalExpenses : 0,
        profit: lastMonth ? lastMonth.netProfit : 0,
        margin: lastMonth ? lastMonth.profitMargin : 0
      },
      yearToDate: {
        income: currentYear ? currentYear.totalIncome : 0,
        expenses: currentYear ? currentYear.totalExpenses : 0,
        profit: currentYear ? currentYear.netProfit : 0,
        margin: currentYear ? currentYear.profitMargin : 0
      },
      trends: {
        incomeGrowth: calculateGrowthRate(currentMonth?.totalIncome, lastMonth?.totalIncome),
        expenseGrowth: calculateGrowthRate(currentMonth?.totalExpenses, lastMonth?.totalExpenses),
        profitGrowth: calculateGrowthRate(currentMonth?.netProfit, lastMonth?.netProfit)
      },
      pendingPayments: getPendingPaymentsAmount(),
      averagePayment: calculateAveragePayment(),
      paymentMethods: getPaymentMethodsDistribution()
    };
    
    return metrics;
    
  } catch (error) {
    Logger.log('Error generando métricas financieras: ' + error.toString());
    return null;
  }
}

/**
 * Genera métricas de familias
 */
function generateFamilyMetrics() {
  try {
    const allFamilies = getAllFamilies();
    
    const metrics = {
      total: allFamilies.length,
      averageSize: calculateAverageFamilySize(allFamilies),
      largestFamily: getLargestFamily(allFamilies),
      familiesWithPendingPayments: getFamiliesWithPendingPayments(allFamilies),
      averageFamilyIncome: calculateAverageFamilyIncome(allFamilies),
      familyRetentionRate: calculateFamilyRetentionRate()
    };
    
    return metrics;
    
  } catch (error) {
    Logger.log('Error generando métricas de familias: ' + error.toString());
    return null;
  }
}

/**
 * Genera métricas de rendimiento
 */
function generatePerformanceMetrics() {
  try {
    const metrics = {
      systemUptime: calculateSystemUptime(),
      averageResponseTime: calculateAverageResponseTime(),
      errorRate: calculateErrorRate(),
      dataIntegrity: validateDataIntegrity(),
      triggerStatus: checkTriggersStatus(),
      lastSync: getLastSyncTime(),
      processingTime: calculateProcessingTime()
    };
    
    return metrics;
    
  } catch (error) {
    Logger.log('Error generando métricas de rendimiento: ' + error.toString());
    return null;
  }
}

/**
 * Genera métricas de tendencias
 */
function generateTrendMetrics() {
  try {
    const metrics = {
      playerGrowth: getPlayerGrowthTrend(),
      financialTrend: getFinancialTrend(),
      categoryTrends: getCategoryTrends(),
      seasonalPatterns: getSeasonalPatterns(),
      peakHours: getPeakActivityHours(),
      popularCategories: getPopularCategories()
    };
    
    return metrics;
    
  } catch (error) {
    Logger.log('Error generando métricas de tendencias: ' + error.toString());
    return null;
  }
}

/**
 * Calcula la edad promedio de los jugadores
 */
function calculateAverageAge(players) {
  try {
    if (!players || players.length === 0) return 0;
    
    const totalAge = players.reduce((sum, player) => {
      const age = parseInt(player.Edad) || 0;
      return sum + age;
    }, 0);
    
    return Math.round(totalAge / players.length * 10) / 10; // Redondear a 1 decimal
    
  } catch (error) {
    Logger.log('Error calculando edad promedio: ' + error.toString());
    return 0;
  }
}

/**
 * Obtiene jugadores nuevos este mes
 */
function getNewPlayersThisMonth() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allPlayers = getAllPlayers();
    return allPlayers.filter(player => {
      const registrationDate = new Date(player['Fecha Registro']);
      return registrationDate >= startOfMonth;
    }).length;
    
  } catch (error) {
    Logger.log('Error obteniendo jugadores nuevos: ' + error.toString());
    return 0;
  }
}

/**
 * Calcula la tasa de retención
 */
function calculateRetentionRate() {
  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    const allPlayers = getAllPlayers();
    const playersThreeMonthsAgo = allPlayers.filter(player => {
      const registrationDate = new Date(player['Fecha Registro']);
      return registrationDate <= threeMonthsAgo;
    });
    
    const stillActive = playersThreeMonthsAgo.filter(player => 
      player.Estado === 'Activo'
    );
    
    if (playersThreeMonthsAgo.length === 0) return 0;
    
    return Math.round((stillActive.length / playersThreeMonthsAgo.length) * 100);
    
  } catch (error) {
    Logger.log('Error calculando tasa de retención: ' + error.toString());
    return 0;
  }
}

/**
 * Calcula la tasa de crecimiento
 */
function calculateGrowthRate(current = null, previous = null) {
  try {
    if (!current || !previous || previous === 0) return 0;
    
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    
  } catch (error) {
    Logger.log('Error calculando tasa de crecimiento: ' + error.toString());
    return 0;
  }
}

/**
 * Obtiene el monto de pagos pendientes
 */
function getPendingPaymentsAmount() {
  try {
    const playersWithPending = getPlayersWithPendingPayments();
    
    return playersWithPending.reduce((total, item) => {
      return total + item.accountStatus.pendingAmount;
    }, 0);
    
  } catch (error) {
    Logger.log('Error obteniendo pagos pendientes: ' + error.toString());
    return 0;
  }
}

/**
 * Calcula el pago promedio
 */
function calculateAveragePayment() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) return 0;
    
    const data = paymentsSheet.getDataRange().getValues();
    const payments = data.slice(1).filter(row => row[5] === 'Pagado'); // Solo pagos completados
    
    if (payments.length === 0) return 0;
    
    const totalAmount = payments.reduce((sum, payment) => {
      return sum + (parseFloat(payment[3]) || 0);
    }, 0);
    
    return Math.round((totalAmount / payments.length) * 100) / 100;
    
  } catch (error) {
    Logger.log('Error calculando pago promedio: ' + error.toString());
    return 0;
  }
}

/**
 * Obtiene distribución de métodos de pago
 */
function getPaymentMethodsDistribution() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) return {};
    
    const data = paymentsSheet.getDataRange().getValues();
    const payments = data.slice(1);
    
    const distribution = {};
    payments.forEach(payment => {
      const method = payment[6] || 'No especificado'; // Columna Método Pago
      distribution[method] = (distribution[method] || 0) + 1;
    });
    
    return distribution;
    
  } catch (error) {
    Logger.log('Error obteniendo distribución de métodos de pago: ' + error.toString());
    return {};
  }
}

/**
 * Calcula el tamaño promedio de familia
 */
function calculateAverageFamilySize(families) {
  try {
    if (!families || families.length === 0) return 0;
    
    const totalPlayers = families.reduce((sum, family) => {
      return sum + family.totalPlayers;
    }, 0);
    
    return Math.round((totalPlayers / families.length) * 10) / 10;
    
  } catch (error) {
    Logger.log('Error calculando tamaño promedio de familia: ' + error.toString());
    return 0;
  }
}

/**
 * Obtiene la familia más grande
 */
function getLargestFamily(families) {
  try {
    if (!families || families.length === 0) return null;
    
    return families.reduce((largest, family) => {
      return family.totalPlayers > largest.totalPlayers ? family : largest;
    });
    
  } catch (error) {
    Logger.log('Error obteniendo familia más grande: ' + error.toString());
    return null;
  }
}

/**
 * Obtiene familias con pagos pendientes
 */
function getFamiliesWithPendingPayments(families) {
  try {
    if (!families) return 0;
    
    return families.filter(family => family.totalPending > 0).length;
    
  } catch (error) {
    Logger.log('Error obteniendo familias con pagos pendientes: ' + error.toString());
    return 0;
  }
}

/**
 * Calcula el ingreso promedio por familia
 */
function calculateAverageFamilyIncome(families) {
  try {
    if (!families || families.length === 0) return 0;
    
    const totalIncome = families.reduce((sum, family) => {
      return sum + family.totalExpected;
    }, 0);
    
    return Math.round((totalIncome / families.length) * 100) / 100;
    
  } catch (error) {
    Logger.log('Error calculando ingreso promedio por familia: ' + error.toString());
    return 0;
  }
}

/**
 * Calcula la tasa de retención de familias
 */
function calculateFamilyRetentionRate() {
  try {
    // Implementación simplificada - en un sistema real se necesitaría más datos históricos
    const allFamilies = getAllFamilies();
    const familiesWithActivePlayers = allFamilies.filter(family => 
      family.players.some(player => player.Estado === 'Activo')
    );
    
    if (allFamilies.length === 0) return 0;
    
    return Math.round((familiesWithActivePlayers.length / allFamilies.length) * 100);
    
  } catch (error) {
    Logger.log('Error calculando tasa de retención de familias: ' + error.toString());
    return 0;
  }
}

/**
 * Calcula el tiempo de actividad del sistema
 */
function calculateSystemUptime() {
  try {
    // Implementación simplificada - en un sistema real se necesitaría monitoreo continuo
    return '99.9%'; // Placeholder
    
  } catch (error) {
    Logger.log('Error calculando tiempo de actividad: ' + error.toString());
    return 'N/A';
  }
}

/**
 * Calcula el tiempo de respuesta promedio
 */
function calculateAverageResponseTime() {
  try {
    // Implementación simplificada
    return '150ms'; // Placeholder
    
  } catch (error) {
    Logger.log('Error calculando tiempo de respuesta: ' + error.toString());
    return 'N/A';
  }
}

/**
 * Calcula la tasa de errores
 */
function calculateErrorRate() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) return '0%';
    
    const data = logsSheet.getDataRange().getValues();
    const errorLogs = data.filter(row => row[0] && row[0].toString().includes('error'));
    
    if (data.length === 0) return '0%';
    
    const errorRate = (errorLogs.length / data.length) * 100;
    return Math.round(errorRate * 10) / 10 + '%';
    
  } catch (error) {
    Logger.log('Error calculando tasa de errores: ' + error.toString());
    return 'N/A';
  }
}

/**
 * Obtiene el tiempo de la última sincronización
 */
function getLastSyncTime() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) return null;
    
    const data = logsSheet.getDataRange().getValues();
    const syncLogs = data.filter(row => 
      row[0] && row[0].toString().includes('sync')
    );
    
    if (syncLogs.length === 0) return null;
    
    return syncLogs[syncLogs.length - 1][3] || syncLogs[syncLogs.length - 1][2];
    
  } catch (error) {
    Logger.log('Error obteniendo tiempo de última sincronización: ' + error.toString());
    return null;
  }
}

/**
 * Calcula el tiempo de procesamiento
 */
function calculateProcessingTime() {
  try {
    // Implementación simplificada
    return '2.5s'; // Placeholder
    
  } catch (error) {
    Logger.log('Error calculando tiempo de procesamiento: ' + error.toString());
    return 'N/A';
  }
}

/**
 * Obtiene tendencia de crecimiento de jugadores
 */
function getPlayerGrowthTrend() {
  try {
    const now = new Date();
    const months = [];
    
    // Obtener datos de los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const allPlayers = getAllPlayers();
      const playersInMonth = allPlayers.filter(player => {
        const registrationDate = new Date(player['Fecha Registro']);
        return registrationDate >= monthDate && registrationDate <= monthEnd;
      });
      
      months.push({
        month: monthDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        count: playersInMonth.length
      });
    }
    
    return months;
    
  } catch (error) {
    Logger.log('Error obteniendo tendencia de crecimiento: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene tendencia financiera
 */
function getFinancialTrend() {
  try {
    const now = new Date();
    const months = [];
    
    // Obtener datos de los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const income = getMonthlyIncome(monthDate, monthEnd);
      const expenses = getMonthlyExpenses(monthDate, monthEnd);
      
      months.push({
        month: monthDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        income: income,
        expenses: expenses,
        profit: income - expenses
      });
    }
    
    return months;
    
  } catch (error) {
    Logger.log('Error obteniendo tendencia financiera: ' + error.toString());
    return [];
  }
}

/**
 * Obtiene tendencias por categoría
 */
function getCategoryTrends() {
  try {
    const categories = getAllCategories();
    const trends = {};
    
    categories.forEach(category => {
      const players = getPlayersByCategory(category);
      trends[category] = {
        total: players.length,
        active: players.filter(p => p.Estado === 'Activo').length,
        scholarship: players.filter(p => p.Tipo === 'becado').length
      };
    });
    
    return trends;
    
  } catch (error) {
    Logger.log('Error obteniendo tendencias por categoría: ' + error.toString());
    return {};
  }
}

/**
 * Obtiene patrones estacionales
 */
function getSeasonalPatterns() {
  try {
    // Implementación simplificada
    return {
      peakMonths: ['Enero', 'Febrero', 'Marzo'],
      lowMonths: ['Noviembre', 'Diciembre'],
      averageSeasonalVariation: '15%'
    };
    
  } catch (error) {
    Logger.log('Error obteniendo patrones estacionales: ' + error.toString());
    return {};
  }
}

/**
 * Obtiene horas pico de actividad
 */
function getPeakActivityHours() {
  try {
    // Implementación simplificada
    return {
      peak: '14:00-16:00',
      low: '22:00-06:00'
    };
    
  } catch (error) {
    Logger.log('Error obteniendo horas pico: ' + error.toString());
    return {};
  }
}

/**
 * Obtiene categorías populares
 */
function getPopularCategories() {
  try {
    const stats = getPlayerStatistics();
    
    if (!stats || !stats.byCategory) return [];
    
    return Object.entries(stats.byCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
    
  } catch (error) {
    Logger.log('Error obteniendo categorías populares: ' + error.toString());
    return [];
  }
}

/**
 * Guarda métricas en el sistema
 */
function saveMetrics(metrics) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let metricsSheet = ss.getSheetByName('Métricas');
    
    if (!metricsSheet) {
      metricsSheet = ss.insertSheet('Métricas');
      const headers = ['Timestamp', 'Tipo', 'Datos'];
      metricsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Guardar métricas completas
    metricsSheet.appendRow([
      metrics.timestamp,
      'system_metrics',
      safeJSONStringify(metrics)
    ]);
    
    // Guardar métricas individuales
    Object.entries(metrics).forEach(([type, data]) => {
      if (type !== 'timestamp') {
        metricsSheet.appendRow([
          metrics.timestamp,
          type,
          safeJSONStringify(data)
        ]);
      }
    });
    
    Logger.log('Métricas guardadas exitosamente');
    
  } catch (error) {
    Logger.log('Error guardando métricas: ' + error.toString());
  }
}

/**
 * Genera reporte de métricas
 */
function generateMetricsReport(period = 'current_month') {
  try {
    const metrics = generateSystemMetrics();
    
    if (!metrics) {
      return null;
    }
    
    const report = {
      generatedAt: new Date(),
      period: period,
      summary: {
        totalPlayers: metrics.players.total,
        activePlayers: metrics.players.active,
        monthlyIncome: metrics.financial.currentMonth.income,
        monthlyExpenses: metrics.financial.currentMonth.expenses,
        netProfit: metrics.financial.currentMonth.profit,
        totalFamilies: metrics.families.total,
        retentionRate: metrics.players.retentionRate
      },
      details: metrics,
      recommendations: generateRecommendations(metrics)
    };
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte de métricas: ' + error.toString());
    return null;
  }
}

/**
 * Genera recomendaciones basadas en métricas
 */
function generateRecommendations(metrics) {
  try {
    const recommendations = [];
    
    // Recomendaciones basadas en retención
    if (metrics.players.retentionRate < 80) {
      recommendations.push({
        type: 'retention',
        priority: 'high',
        message: 'La tasa de retención está por debajo del 80%. Considerar programas de fidelización.',
        action: 'Implementar sistema de seguimiento personalizado'
      });
    }
    
    // Recomendaciones basadas en finanzas
    if (metrics.financial.currentMonth.profit < 0) {
      recommendations.push({
        type: 'financial',
        priority: 'high',
        message: 'Pérdidas en el mes actual. Revisar gastos y optimizar costos.',
        action: 'Auditoría de gastos y revisión de precios'
      });
    }
    
    // Recomendaciones basadas en crecimiento
    if (metrics.players.growthRate < 5) {
      recommendations.push({
        type: 'growth',
        priority: 'medium',
        message: 'Crecimiento lento de jugadores. Considerar estrategias de marketing.',
        action: 'Campaña de promoción y referidos'
      });
    }
    
    // Recomendaciones basadas en categorías
    const popularCategories = getPopularCategories();
    if (popularCategories.length > 0) {
      const topCategory = popularCategories[0];
      recommendations.push({
        type: 'category',
        priority: 'low',
        message: `La categoría ${topCategory.category} es la más popular con ${topCategory.count} jugadores.`,
        action: 'Considerar expandir esta categoría'
      });
    }
    
    return recommendations;
    
  } catch (error) {
    Logger.log('Error generando recomendaciones: ' + error.toString());
    return [];
  }
}

/**
 * Genera reporte de jugadores
 */
function generatePlayerReport() {
  try {
    const players = getAllPlayers();
    const families = loadFamiliesData();
    
    const report = {
      summary: {
        totalPlayers: players.length,
        activePlayers: players.filter(p => p.Estado === 'Activo').length,
        inactivePlayers: players.filter(p => p.Estado === 'Inactivo').length,
        scholarshipPlayers: players.filter(p => p.Tipo === 'becado').length,
        totalFamilies: families.length
      },
      byCategory: {},
      byAge: {},
      byStatus: {},
      families: families,
      players: players
    };
    
    // Agrupar por categoría
    players.forEach(player => {
      const category = player.Categoría || 'Sin categoría';
      if (!report.byCategory[category]) {
        report.byCategory[category] = 0;
      }
      report.byCategory[category]++;
    });
    
    // Agrupar por edad
    players.forEach(player => {
      const age = player.Edad || 'Sin edad';
      if (!report.byAge[age]) {
        report.byAge[age] = 0;
      }
      report.byAge[age]++;
    });
    
    // Agrupar por estado
    players.forEach(player => {
      const status = player.Estado || 'Sin estado';
      if (!report.byStatus[status]) {
        report.byStatus[status] = 0;
      }
      report.byStatus[status]++;
    });
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte de jugadores: ' + error.toString());
    throw error;
  }
}

/**
 * Genera reporte financiero
 */
function generateFinancialReport() {
  try {
    const payments = loadPaymentsData();
    const expenses = loadExpensesData();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const report = {
      summary: {
        totalPayments: payments.length,
        totalExpenses: expenses.length,
        totalIncome: payments.reduce((sum, p) => sum + (p.Monto || 0), 0),
        totalExpenseAmount: expenses.reduce((sum, e) => sum + (e.Monto || 0), 0)
      },
      monthly: {},
      byType: {},
      byMethod: {},
      payments: payments,
      expenses: expenses
    };
    
    // Agrupar pagos por mes
    payments.forEach(payment => {
      const paymentDate = new Date(payment.Fecha);
      const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth() + 1}`;
      
      if (!report.monthly[monthKey]) {
        report.monthly[monthKey] = {
          income: 0,
          payments: 0
        };
      }
      
      report.monthly[monthKey].income += payment.Monto || 0;
      report.monthly[monthKey].payments++;
    });
    
    // Agrupar por tipo de pago
    payments.forEach(payment => {
      const type = payment.Tipo || 'Sin tipo';
      if (!report.byType[type]) {
        report.byType[type] = {
          count: 0,
          amount: 0
        };
      }
      report.byType[type].count++;
      report.byType[type].amount += payment.Monto || 0;
    });
    
    // Agrupar por método de pago
    payments.forEach(payment => {
      const method = payment['Método Pago'] || 'Sin método';
      if (!report.byMethod[method]) {
        report.byMethod[method] = {
          count: 0,
          amount: 0
        };
      }
      report.byMethod[method].count++;
      report.byMethod[method].amount += payment.Monto || 0;
    });
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte financiero: ' + error.toString());
    throw error;
  }
}

/**
 * Genera reporte de métricas
 */
function generateMetricsReport() {
  try {
    const metrics = loadMetricsData();
    const currentMetrics = getCurrentMetrics();
    
    const report = {
      current: currentMetrics,
      historical: metrics,
      trends: calculateTrends(metrics),
      summary: {
        totalMetrics: metrics.length,
        lastUpdate: metrics.length > 0 ? metrics[metrics.length - 1].fecha : null
      }
    };
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte de métricas: ' + error.toString());
    throw error;
  }
}

/**
 * Genera reporte del sistema
 */
function generateSystemReport() {
  try {
    const config = getSystemConfig();
    const systemStats = getSystemStatistics();
    
    const report = {
      system: {
        version: '1.0',
        lastUpdate: new Date().toISOString(),
        config: config,
        statistics: systemStats
      },
      health: {
        dataIntegrity: validateDataIntegrity(),
        performance: getPerformanceMetrics(),
        errors: getSystemErrors()
      },
      recommendations: generateSystemRecommendations()
    };
    
    return report;
    
  } catch (error) {
    Logger.log('Error generando reporte del sistema: ' + error.toString());
    throw error;
  }
}
