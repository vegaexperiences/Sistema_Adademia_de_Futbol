/**
 * ========================================
 * ARCHIVO: NotificationManager.gs
 * DESCRIPCIÓN: Sistema de notificaciones por email
 * FUNCIONES: Envío de recordatorios de pago, notificaciones de morosidad, reportes
 * ========================================
 */

/**
 * ENVIAR NOTIFICACIÓN DE MOROSIDAD A UN JUGADOR
 */
function sendOverdueNotification(playerId) {
  try {
    Logger.log(`📧 Enviando notificación de morosidad a jugador: ${playerId}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      throw new Error('Hoja de Jugadores no encontrada');
    }
    
    // Buscar datos del jugador
    const playersData = playersSheet.getDataRange().getValues();
    const headers = playersData[0];
    const rows = playersData.slice(1);
    
    const idIdx = headers.indexOf('ID');
    const nombreIdx = headers.indexOf('Nombre');
    const apellidosIdx = headers.indexOf('Apellidos');
    const tutorIdx = headers.indexOf('Tutor');
    const telefonoIdx = headers.indexOf('Teléfono');
    
    let playerRow = null;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][idIdx]) === playerId) {
        playerRow = rows[i];
        break;
      }
    }
    
    if (!playerRow) {
      throw new Error('Jugador no encontrado');
    }
    
    const nombreCompleto = `${playerRow[nombreIdx]} ${playerRow[apellidosIdx]}`;
    const tutor = playerRow[tutorIdx] || 'Padre/Tutor';
    const telefono = playerRow[telefonoIdx] || 'No registrado';
    
    // Obtener detalles del pago pendiente
    const paymentDetails = getPlayerPaymentDetails(playerId);
    
    // Configurar email
    const subject = `⚠️ SUAREZ ACADEMY - Recordatorio de Pago Pendiente`;
    
    const body = `
Estimado/a ${tutor},

Le recordamos que el jugador ${nombreCompleto} tiene un saldo pendiente en SUAREZ ACADEMY.

📊 DETALLES DEL SALDO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Jugador: ${nombreCompleto}
• Saldo Pendiente: $${paymentDetails.balance.toFixed(2)}
• Mensualidad: $${paymentDetails.monthlyFee.toFixed(2)}
• Mes: ${paymentDetails.month}

💳 MÉTODOS DE PAGO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Efectivo en la academia
• Transferencia bancaria
• Yappy
• Tarjeta de crédito/débito

📞 CONTACTO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Teléfono: ${telefono}
• Horario: Lunes a Viernes, 8:00 AM - 6:00 PM

Por favor, regularice su situación a la brevedad posible para que ${nombreCompleto} pueda continuar disfrutando de nuestros servicios.

Gracias por su atención.

Atentamente,
SUAREZ ACADEMY
    `.trim();
    
    // NOTA: Para enviar emails reales, necesitas configurar el email del tutor
    // Por ahora, solo registramos en el log
    Logger.log('📧 Email preparado:');
    Logger.log('Para: ' + tutor);
    Logger.log('Asunto: ' + subject);
    Logger.log('Cuerpo:\n' + body);
    
    // Para enviar email real, descomentar:
    // MailApp.sendEmail(tutorEmail, subject, body);
    
    return {
      success: true,
      message: 'Notificación preparada (email no enviado - configurar email del tutor)',
      playerName: nombreCompleto,
      tutor: tutor
    };
    
  } catch (error) {
    Logger.log('❌ Error enviando notificación: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * OBTENER DETALLES DEL PAGO PENDIENTE DE UN JUGADOR
 */
function getPlayerPaymentDetails(playerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const paymentsSheet = ss.getSheetByName('Pagos');
  const playersSheet = ss.getSheetByName('Jugadores');
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthName = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  let totalPendiente = 0;
  let totalPagado = 0;
  let monthlyFee = 130; // Default
  
  // Obtener mensualidad personalizada
  if (playersSheet) {
    const playersData = playersSheet.getDataRange().getValues();
    const headers = playersData[0];
    const rows = playersData.slice(1);
    
    const idIdx = headers.indexOf('ID');
    
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][idIdx]) === playerId) {
        const customFee = rows[i][26]; // Columna AA
        if (customFee && customFee !== '') {
          monthlyFee = parseFloat(customFee);
        }
        break;
      }
    }
  }
  
  // Calcular pagos del mes
  if (paymentsSheet) {
    const paymentsData = paymentsSheet.getDataRange().getValues();
    if (paymentsData.length > 1) {
      const headers = paymentsData[0];
      const rows = paymentsData.slice(1);
      
      const jugadorIdIdx = headers.indexOf('Jugador ID');
      const tipoIdx = headers.indexOf('Tipo');
      const estadoIdx = headers.indexOf('Estado');
      const fechaIdx = headers.indexOf('Fecha');
      const montoIdx = headers.indexOf('Monto');
      
      rows.forEach(row => {
        const jugadorId = String(row[jugadorIdIdx] || '');
        const tipo = String(row[tipoIdx] || '');
        const estado = String(row[estadoIdx] || '');
        const fecha = row[fechaIdx];
        const monto = parseFloat(row[montoIdx] || 0);
        
        if (jugadorId === playerId && tipo === 'Mensualidad') {
          if (fecha instanceof Date) {
            if (fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear) {
              if (estado === 'Pendiente') {
                totalPendiente += monto;
              } else if (estado === 'Pagado') {
                totalPagado += monto;
              }
            }
          }
        }
      });
    }
  }
  
  return {
    balance: totalPendiente - totalPagado,
    totalPendiente: totalPendiente,
    totalPagado: totalPagado,
    monthlyFee: monthlyFee,
    month: monthName
  };
}

/**
 * ENVIAR NOTIFICACIONES A TODOS LOS JUGADORES MOROSOS
 */
function sendOverdueNotificationsToAll() {
  try {
    Logger.log('=== ENVIANDO NOTIFICACIONES A JUGADORES MOROSOS ===');
    
    const overduePlayerIds = getPlayersWithOverdueStatus();
    
    if (overduePlayerIds.length === 0) {
      Logger.log('✅ No hay jugadores morosos');
      return {
        success: true,
        message: 'No hay jugadores morosos',
        sent: 0
      };
    }
    
    let sent = 0;
    let failed = 0;
    
    overduePlayerIds.forEach(playerId => {
      const result = sendOverdueNotification(playerId);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
      
      // Pequeña pausa para evitar límites de rate
      Utilities.sleep(500);
    });
    
    Logger.log(`✅ Notificaciones enviadas: ${sent}, Fallidas: ${failed}`);
    
    return {
      success: true,
      message: `Notificaciones enviadas a ${sent} jugadores morosos`,
      sent: sent,
      failed: failed,
      total: overduePlayerIds.length
    };
    
  } catch (error) {
    Logger.log('❌ Error enviando notificaciones masivas: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * ENVIAR REPORTE MENSUAL POR EMAIL
 */
function sendMonthlyReport(recipientEmail) {
  try {
    Logger.log('📊 Generando reporte mensual...');
    
    const metrics = getFinancialMetrics();
    
    if (metrics.error) {
      throw new Error(metrics.message);
    }
    
    const today = new Date();
    const monthName = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    const subject = `📊 SUAREZ ACADEMY - Reporte Mensual de ${monthName}`;
    
    const body = `
REPORTE MENSUAL - ${monthName.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 RESUMEN FINANCIERO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Ingresos del Mes: $${metrics.monthlyIncome.toFixed(2)}
• Gastos del Mes: $${metrics.monthlyExpenses.toFixed(2)}
• Balance del Mes: $${metrics.monthlyBalance.toFixed(2)}

• Ingresos Totales (Pagados): $${metrics.paidIncome.toFixed(2)}
• Ingresos Pendientes: $${metrics.pendingIncome.toFixed(2)}
• Gastos Totales: $${metrics.totalExpenses.toFixed(2)}
• Balance Neto Total: $${metrics.netBalance.toFixed(2)}

👥 ESTADÍSTICAS DE JUGADORES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total de Jugadores: ${metrics.totalPlayers}
• Jugadores Activos: ${metrics.activePlayers}
• Jugadores Becados: ${metrics.scholarshipPlayers}
• Jugadores Morosos: ${metrics.overduePlayers}

📈 DISTRIBUCIÓN DE INGRESOS POR MÉTODO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(metrics.paymentsByMethod).map(([method, amount]) => 
  `• ${method}: $${amount.toFixed(2)}`
).join('\n')}

📉 DISTRIBUCIÓN DE GASTOS POR CATEGORÍA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(metrics.expensesByCategory).map(([category, amount]) => 
  `• ${category}: $${amount.toFixed(2)}`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reporte generado automáticamente por SUAREZ ACADEMY
Fecha: ${today.toLocaleDateString('es-ES')}
    `.trim();
    
    Logger.log('📧 Reporte preparado:');
    Logger.log('Para: ' + recipientEmail);
    Logger.log('Asunto: ' + subject);
    
    // Para enviar email real, descomentar:
    // MailApp.sendEmail(recipientEmail, subject, body);
    
    Logger.log('✅ Reporte mensual generado exitosamente');
    
    return {
      success: true,
      message: 'Reporte mensual generado (email no enviado - descomentar MailApp.sendEmail)',
      metrics: metrics
    };
    
  } catch (error) {
    Logger.log('❌ Error generando reporte mensual: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * FUNCIÓN DE PRUEBA: Enviar notificación a un jugador específico
 */

/**
 * FUNCIÓN DE PRUEBA: Generar reporte mensual
 */

