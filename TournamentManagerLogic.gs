/**
 * GESTIÓN DE TORNEOS
 * Maneja la lógica de torneos y jugadores de torneo
 */

/**
 * Obtiene todos los torneos activos
 */
function getAllTournaments() {
  try {
    Logger.log('=== OBTENIENDO TODOS LOS TORNEOS ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tournamentsSheet = ss.getSheetByName('Torneos');
    
    if (!tournamentsSheet) {
      Logger.log('❌ Hoja Torneos no encontrada');
      return [];
    }
    
    const data = tournamentsSheet.getDataRange().getValues();
    Logger.log(`📊 Total de filas en Torneos: ${data.length}`);
    
    if (data.length <= 1) {
      Logger.log('⚠️ No hay datos en Torneos');
      return [];
    }
    
    const headers = data[0];
    const tournaments = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Si hay ID
        const tournament = {
          id: row[0],
          name: row[1] || '',
          date: row[2] || '',
          cost: row[3] || 0,
          description: row[4] || '',
          location: row[5] || '',
          status: row[6] || 'Activo',
          playerCount: row[7] || 0,
          revenue: row[8] || 0,
          createdDate: row[9] || new Date()
        };
        tournaments.push(tournament);
      }
    }
    
    Logger.log(`✅ Se encontraron ${tournaments.length} torneos`);
    return tournaments;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo torneos:', error.toString());
    return [];
  }
}

/**
 * Obtiene todos los jugadores de torneo desde múltiples fuentes - VERSIÓN SIMPLIFICADA
 */
function getAllTournamentPlayers() {
  try {
    Logger.log('=== OBTENIENDO JUGADORES DE TORNEO (VERSIÓN SIMPLIFICADA) ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tournamentPlayers = [];
    
    Logger.log('🔍 Paso 1: Verificando hojas disponibles...');
    const allSheets = ss.getSheets().map(s => s.getName());
    Logger.log('📋 Hojas disponibles:', allSheets.join(', '));
    
    // 1. Buscar en FORM_TORNEO (fuente principal)
    Logger.log('🔍 Paso 2: Buscando en FORM_TORNEO...');
    const formTorneoSheet = ss.getSheetByName('FORM_TORNEO');
    if (formTorneoSheet) {
      try {
        const formData = formTorneoSheet.getDataRange().getValues();
        Logger.log(`📊 Total de filas en FORM_TORNEO: ${formData.length}`);
        
        for (let i = 1; i < formData.length; i++) {
          try {
            const row = formData[i];
            const timestamp = row[0];
            const email = row[1];
            const tournamentName = row[2];
            const playerName = row[3];
            const parentName = row[4];
            const paymentAmount = row[5];
            
            if (playerName && tournamentName) {
              const playerId = 'PLR_TORNEO_' + (timestamp || Date.now()) + '_' + (i - 1);
              
              const player = {
                ID: playerId,
                Nombre: (playerName.split(' ')[0] || '').toString(),
                Apellidos: (playerName.split(' ').slice(1).join(' ') || '').toString(),
                'Número de identificación': '',
                Edad: '',
                Teléfono: '',
                'Correo electrónico': (email || '').toString(),
                'Nombre del padre o tutor': (parentName || '').toString(),
                'Teléfono del padre o tutor': '',
                'Correo del padre o tutor': '',
                'Dirección': '',
                'Fecha de nacimiento': '',
                'Género': '',
                'Estado': 'Activo',
                'Tipo': 'Torneo',
                'Mensualidad': 0,
                'Descuento': 0,
                'Grupo familiar': '',
                'Fecha de registro': new Date().toISOString(),
                'Observaciones': `Torneo: ${tournamentName}`,
                'Mensualidad personalizada': 0,
                'Beca': '',
                'Fecha de aprobación': '',
                tournamentName: tournamentName.toString(),
                paymentAmount: parseFloat(paymentAmount) || 0
              };
              
              tournamentPlayers.push(player);
              Logger.log(`🏆 Jugador encontrado: ${playerName} - ${tournamentName}`);
            }
          } catch (rowError) {
            Logger.log(`⚠️ Error procesando fila ${i}:`, rowError.toString());
          }
        }
      } catch (sheetError) {
        Logger.log('❌ Error leyendo FORM_TORNEO:', sheetError.toString());
      }
    } else {
      Logger.log('⚠️ Hoja FORM_TORNEO no encontrada');
    }
    
    Logger.log(`✅ Total jugadores encontrados: ${tournamentPlayers.length}`);
    
    // Asegurar que siempre retornamos un array válido
    const result = Array.isArray(tournamentPlayers) ? tournamentPlayers : [];
    Logger.log(`📤 Retornando array con ${result.length} elementos`);
    
    return result;
    
  } catch (error) {
    Logger.log('❌ ERROR CRÍTICO en getAllTournamentPlayers:', error.toString());
    Logger.log('❌ Stack trace:', error.stack);
    Logger.log('📤 Retornando array vacío por error');
    return [];
  }
}

/**
 * Función de prueba simple para verificar comunicación
 */
function testTournamentPlayersConnection() {
  try {
    Logger.log('=== PRUEBA DE CONEXIÓN DE JUGADORES DE TORNEO ===');
    
    const testResult = {
      success: true,
      message: 'Conexión exitosa',
      timestamp: new Date().toISOString(),
      testData: [
        {
          ID: 'TEST_TORNEO_001',
          Nombre: 'Jugador de Prueba',
          Apellidos: 'Test',
          tournamentName: 'Torneo de Prueba',
          paymentAmount: 80
        }
      ]
    };
    
    Logger.log('✅ Función de prueba ejecutada correctamente');
    return testResult;
    
  } catch (error) {
    Logger.log('❌ Error en función de prueba:', error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Crea un objeto de jugador de torneo desde una fila de datos
 */
function createTournamentPlayerObject(row, playerId) {
  return {
    ID: playerId,
    Nombre: row[1] || '',
    Apellidos: row[2] || '',
    'Número de identificación': row[3] || '',
    Edad: row[4] || '',
    Teléfono: row[5] || '',
    'Correo electrónico': row[6] || '',
    'Nombre del padre o tutor': row[7] || '',
    'Teléfono del padre o tutor': row[8] || '',
    'Correo del padre o tutor': row[9] || '',
    'Dirección': row[10] || '',
    'Fecha de nacimiento': row[11] || '',
    'Género': row[12] || '',
    'Estado': row[13] || 'Activo',
    'Tipo': row[14] || 'Torneo',
    'Mensualidad': row[15] || 0,
    'Descuento': row[16] || 0,
    'Grupo familiar': row[17] || '',
    'Fecha de registro': row[18] || '',
    'Observaciones': row[19] || '',
    'Mensualidad personalizada': row[20] || 0,
    'Beca': row[21] || '',
    'Fecha de aprobación': row[22] || '',
    tournamentName: getTournamentNameForPlayer(playerId),
    paymentAmount: getPaymentAmountForPlayer(playerId)
  };
}

/**
 * Obtiene el nombre del torneo para un jugador
 */
function getTournamentNameForPlayer(playerId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formTorneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!formTorneoSheet) {
      return 'Torneo Desconocido';
    }
    
    const data = formTorneoSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[2] && row[2].includes(playerId.split('_')[2])) { // Comparar timestamp
        return row[2] || 'Torneo Desconocido'; // Columna del nombre del torneo
      }
    }
    
    return 'Torneo Desconocido';
    
  } catch (error) {
    Logger.log('❌ Error obteniendo nombre del torneo:', error.toString());
    return 'Torneo Desconocido';
  }
}

/**
 * Obtiene el monto de pago para un jugador
 */
function getPaymentAmountForPlayer(playerId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formTorneoSheet = ss.getSheetByName('FORM_TORNEO');
    
    if (!formTorneoSheet) {
      return 0;
    }
    
    const data = formTorneoSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[2] && row[2].includes(playerId.split('_')[2])) { // Comparar timestamp
        return parseFloat(row[5]) || 0; // Columna del monto de pago
      }
    }
    
    return 0;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo monto de pago:', error.toString());
    return 0;
  }
}

/**
 * Obtiene torneos expirados
 */
function getExpiredTournaments() {
  try {
    Logger.log('=== OBTENIENDO TORNEOS EXPIRADOS ===');
    
    const tournaments = getAllTournaments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiredTournaments = tournaments.filter(tournament => {
      const tournamentDate = new Date(tournament.date);
      tournamentDate.setHours(0, 0, 0, 0);
      return tournamentDate < today;
    });
    
    Logger.log(`✅ Se encontraron ${expiredTournaments.length} torneos expirados`);
    return expiredTournaments;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo torneos expirados:', error.toString());
    return [];
  }
}

/**
 * Guarda un nuevo torneo
 */
function saveTournament(tournamentData) {
  try {
    Logger.log('=== GUARDANDO TORNEO ===');
    Logger.log('Datos del torneo:', tournamentData);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let tournamentsSheet = ss.getSheetByName('Torneos');
    
    // Crear hoja si no existe
    if (!tournamentsSheet) {
      tournamentsSheet = ss.insertSheet('Torneos');
      const headers = [
        'ID', 'Nombre', 'Fecha', 'Costo', 'Descripción', 'Ubicación', 
        'Estado', 'Jugadores', 'Ingresos', 'Fecha de Creación'
      ];
      tournamentsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Formatear encabezados
      const headerRange = tournamentsSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e3a8a');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }
    
    // Generar ID único
    const tournamentId = 'TUR_' + Date.now();
    
    // Preparar datos para insertar
    const rowData = [
      tournamentId,
      tournamentData.name,
      tournamentData.date,
      tournamentData.cost,
      tournamentData.description || '',
      tournamentData.location || '',
      'Activo',
      0, // Jugadores inicial
      0, // Ingresos iniciales
      new Date()
    ];
    
    // Insertar fila
    tournamentsSheet.appendRow(rowData);
    
    Logger.log('✅ Torneo guardado exitosamente');
    return { success: true, message: 'Torneo guardado exitosamente', id: tournamentId };
    
  } catch (error) {
    Logger.log('❌ Error guardando torneo:', error.toString());
    return { success: false, message: 'Error guardando torneo: ' + error.toString() };
  }
}

/**
 * Elimina un torneo
 */
function deleteTournament(tournamentId) {
  try {
    Logger.log('=== ELIMINANDO TORNEO ===');
    Logger.log('ID del torneo:', tournamentId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tournamentsSheet = ss.getSheetByName('Torneos');
    
    if (!tournamentsSheet) {
      return { success: false, message: 'Hoja Torneos no encontrada' };
    }
    
    const data = tournamentsSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === tournamentId) {
        tournamentsSheet.deleteRow(i + 1);
        Logger.log('✅ Torneo eliminado exitosamente');
        return { success: true, message: 'Torneo eliminado exitosamente' };
      }
    }
    
    return { success: false, message: 'Torneo no encontrado' };
    
  } catch (error) {
    Logger.log('❌ Error eliminando torneo:', error.toString());
    return { success: false, message: 'Error eliminando torneo: ' + error.toString() };
  }
}

/**
 * Remueve un jugador de un torneo
 */
function removePlayerFromTournament(playerId) {
  try {
    Logger.log('=== REMOVIENDO JUGADOR DE TORNEO ===');
    Logger.log('ID del jugador:', playerId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === playerId) {
        // Cambiar estado a "Retirado"
        playersSheet.getRange(i + 1, 14).setValue('Retirado');
        Logger.log('✅ Jugador removido del torneo');
        return { success: true, message: 'Jugador removido del torneo' };
      }
    }
    
    return { success: false, message: 'Jugador no encontrado' };
    
  } catch (error) {
    Logger.log('❌ Error removiendo jugador:', error.toString());
    return { success: false, message: 'Error removiendo jugador: ' + error.toString() };
  }
}

/**
 * Mueve un torneo al histórico
 */
function moveTournamentToHistoric(tournamentId) {
  try {
    Logger.log('=== MOVIENDO TORNEO AL HISTÓRICO ===');
    Logger.log('ID del torneo:', tournamentId);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tournamentsSheet = ss.getSheetByName('Torneos');
    
    if (!tournamentsSheet) {
      return { success: false, message: 'Hoja Torneos no encontrada' };
    }
    
    const data = tournamentsSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === tournamentId) {
        // Cambiar estado a "Histórico"
        tournamentsSheet.getRange(i + 1, 7).setValue('Histórico');
        Logger.log('✅ Torneo movido al histórico');
        return { success: true, message: 'Torneo movido al histórico' };
      }
    }
    
    return { success: false, message: 'Torneo no encontrado' };
    
  } catch (error) {
    Logger.log('❌ Error moviendo torneo:', error.toString());
    return { success: false, message: 'Error moviendo torneo: ' + error.toString() };
  }
}

/**
 * Limpia torneos expirados automáticamente
 */
function cleanupExpiredTournaments() {
  try {
    Logger.log('=== LIMPIANDO TORNEOS EXPIRADOS ===');
    
    const expiredTournaments = getExpiredTournaments();
    let cleanedCount = 0;
    
    for (const tournament of expiredTournaments) {
      const result = moveTournamentToHistoric(tournament.id);
      if (result.success) {
        cleanedCount++;
      }
    }
    
    Logger.log(`✅ Se limpiaron ${cleanedCount} torneos expirados`);
    return { success: true, message: `Se limpiaron ${cleanedCount} torneos expirados` };
    
  } catch (error) {
    Logger.log('❌ Error limpiando torneos:', error.toString());
    return { success: false, message: 'Error limpiando torneos: ' + error.toString() };
  }
}

/**
 * Verifica y limpia torneos expirados automáticamente
 * Esta función se puede ejecutar con un trigger diario
 */
function checkAndCleanupExpiredTournaments() {
  try {
    Logger.log('=== VERIFICACIÓN AUTOMÁTICA DE TORNEOS EXPIRADOS ===');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tournamentsSheet = ss.getSheetByName('Torneos');
    
    if (!tournamentsSheet) {
      Logger.log('⚠️ Hoja Torneos no encontrada');
      return;
    }
    
    const data = tournamentsSheet.getDataRange().getValues();
    let expiredCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const tournamentDate = new Date(row[2]);
      tournamentDate.setHours(0, 0, 0, 0);
      
      if (tournamentDate < today && row[6] === 'Activo') {
        // Marcar como expirado
        tournamentsSheet.getRange(i + 1, 7).setValue('Expirado');
        expiredCount++;
        Logger.log(`📅 Torneo expirado: ${row[1]} (${row[2]})`);
        
        // Mover jugadores del torneo al histórico
        moveTournamentPlayersToHistoric(row[0]);
      }
    }
    
    if (expiredCount > 0) {
      Logger.log(`✅ Se marcaron ${expiredCount} torneos como expirados`);
    } else {
      Logger.log('✅ No hay torneos expirados');
    }
    
  } catch (error) {
    Logger.log('❌ Error en verificación automática:', error.toString());
  }
}

/**
 * Mueve jugadores de un torneo expirado al histórico
 */
function moveTournamentPlayersToHistoric(tournamentId) {
  try {
    Logger.log(`=== MOVIENDO JUGADORES DEL TORNEO ${tournamentId} AL HISTÓRICO ===`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    const historicSheet = ss.getSheetByName('Historico_Completo');
    
    if (!playersSheet || !historicSheet) {
      Logger.log('❌ Hojas necesarias no encontradas');
      return;
    }
    
    const playersData = playersSheet.getDataRange().getValues();
    let movedCount = 0;
    
    for (let i = 1; i < playersData.length; i++) {
      const row = playersData[i];
      const playerId = row[0];
      
      // Verificar si es jugador de torneo
      if (playerId && playerId.includes('TORNEO')) {
        // Agregar al histórico
        const historicRow = [...row];
        historicRow.push('Torneo Expirado'); // Razón de retiro
        historicRow.push(new Date()); // Fecha de retiro
        
        historicSheet.appendRow(historicRow);
        
        // Eliminar de jugadores activos
        playersSheet.deleteRow(i + 1);
        movedCount++;
        
        Logger.log(`📜 Jugador movido al histórico: ${playerId}`);
        
        // Ajustar índice porque se eliminó una fila
        i--;
      }
    }
    
    Logger.log(`✅ Se movieron ${movedCount} jugadores al histórico`);
    
  } catch (error) {
    Logger.log('❌ Error moviendo jugadores al histórico:', error.toString());
  }
}

/**
 * Obtiene estadísticas de torneos
 */
function getTournamentStats() {
  try {
    const tournaments = getAllTournaments();
    const players = getAllTournamentPlayers();
    const expired = getExpiredTournaments();
    
    const stats = {
      totalTournaments: tournaments.length,
      activeTournaments: tournaments.filter(t => t.status === 'Activo').length,
      expiredTournaments: expired.length,
      totalPlayers: players.length,
      totalRevenue: tournaments.reduce((sum, t) => sum + (t.revenue || 0), 0)
    };
    
    return stats;
    
  } catch (error) {
    Logger.log('❌ Error obteniendo estadísticas:', error.toString());
    return {
      totalTournaments: 0,
      activeTournaments: 0,
      expiredTournaments: 0,
      totalPlayers: 0,
      totalRevenue: 0
    };
  }
}

/**
 * MIGRACIÓN: Mueve jugadores de torneo existentes a la nueva gestión
 */
function migrateExistingTournamentPlayers() {
  try {
    Logger.log('=== INICIANDO MIGRACIÓN DE JUGADORES DE TORNEO ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    Logger.log(`📊 Total de filas en Jugadores: ${data.length}`);
    
    if (data.length <= 1) {
      return { success: true, message: 'No hay jugadores para migrar', migrated: 0 };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    let migratedCount = 0;
    let tournamentPlayers = [];
    
    // Identificar jugadores de torneo
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const playerId = row[0];
      
      if (playerId && playerId.includes('TORNEO')) {
        Logger.log(`🏆 Jugador de torneo encontrado: ${playerId}`);
        
        // Crear objeto del jugador
        const player = {
          ID: playerId,
          Nombre: row[1] || '',
          Apellidos: row[2] || '',
          'Número de identificación': row[3] || '',
          Edad: row[4] || '',
          Teléfono: row[5] || '',
          'Correo electrónico': row[6] || '',
          'Nombre del padre o tutor': row[7] || '',
          'Teléfono del padre o tutor': row[8] || '',
          'Correo del padre o tutor': row[9] || '',
          'Dirección': row[10] || '',
          'Fecha de nacimiento': row[11] || '',
          'Género': row[12] || '',
          'Estado': row[13] || 'Activo',
          'Tipo': row[14] || 'Torneo',
          'Mensualidad': row[15] || 0,
          'Descuento': row[16] || 0,
          'Grupo familiar': row[17] || '',
          'Fecha de registro': row[18] || '',
          'Observaciones': row[19] || '',
          'Mensualidad personalizada': row[20] || 0,
          'Beca': row[21] || '',
          'Fecha de aprobación': row[22] || '',
          tournamentName: getTournamentNameForPlayer(playerId),
          paymentAmount: getPaymentAmountForPlayer(playerId)
        };
        
        tournamentPlayers.push(player);
        migratedCount++;
      }
    }
    
    Logger.log(`✅ Se identificaron ${migratedCount} jugadores de torneo para migrar`);
    
    if (migratedCount === 0) {
      return { success: true, message: 'No se encontraron jugadores de torneo para migrar', migrated: 0 };
    }
    
    // Crear hoja de Torneos si no existe
    let tournamentsSheet = ss.getSheetByName('Torneos');
    if (!tournamentsSheet) {
      tournamentsSheet = ss.insertSheet('Torneos');
      const headers = [
        'ID', 'Nombre', 'Fecha', 'Costo', 'Descripción', 'Ubicación', 
        'Estado', 'Jugadores', 'Ingresos', 'Fecha de Creación'
      ];
      tournamentsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Formatear encabezados
      const headerRange = tournamentsSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e3a8a');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }
    
    // Agrupar jugadores por torneo
    const tournamentsMap = new Map();
    
    tournamentPlayers.forEach(player => {
      const tournamentName = player.tournamentName || 'Torneo Desconocido';
      
      if (!tournamentsMap.has(tournamentName)) {
        tournamentsMap.set(tournamentName, {
          name: tournamentName,
          players: [],
          totalRevenue: 0,
          cost: 80 // Costo por defecto
        });
      }
      
      const tournament = tournamentsMap.get(tournamentName);
      tournament.players.push(player);
      tournament.totalRevenue += player.paymentAmount || 0;
    });
    
    // Crear registros de torneos
    let tournamentsCreated = 0;
    
    for (const [tournamentName, tournamentData] of tournamentsMap) {
      const tournamentId = 'TUR_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      
      const tournamentRow = [
        tournamentId,
        tournamentData.name,
        new Date(), // Fecha actual como fecha del torneo
        tournamentData.cost,
        `Torneo migrado con ${tournamentData.players.length} jugadores`,
        'Academia Suarez',
        'Activo',
        tournamentData.players.length,
        tournamentData.totalRevenue,
        new Date()
      ];
      
      tournamentsSheet.appendRow(tournamentRow);
      tournamentsCreated++;
      
      Logger.log(`✅ Torneo creado: ${tournamentData.name} con ${tournamentData.players.length} jugadores`);
    }
    
    Logger.log(`✅ Migración completada: ${migratedCount} jugadores migrados a ${tournamentsCreated} torneos`);
    
    return {
      success: true,
      message: `Migración exitosa: ${migratedCount} jugadores migrados a ${tournamentsCreated} torneos`,
      migrated: migratedCount,
      tournamentsCreated: tournamentsCreated
    };
    
  } catch (error) {
    Logger.log('❌ Error en migración:', error.toString());
    return { success: false, message: 'Error en migración: ' + error.toString() };
  }
}

/**
 * MIGRACIÓN: Elimina jugadores de torneo de la hoja Jugadores después de migrar
 */
function removeMigratedTournamentPlayers() {
  try {
    Logger.log('=== ELIMINANDO JUGADORES DE TORNEO DE HOJA JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) {
      return { success: false, message: 'Hoja Jugadores no encontrada' };
    }
    
    const data = playersSheet.getDataRange().getValues();
    let removedCount = 0;
    
    // Procesar de atrás hacia adelante para evitar problemas con índices
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const playerId = row[0];
      
      if (playerId && playerId.includes('TORNEO')) {
        Logger.log(`🗑️ Eliminando jugador de torneo: ${playerId}`);
        playersSheet.deleteRow(i + 1);
        removedCount++;
      }
    }
    
    Logger.log(`✅ Se eliminaron ${removedCount} jugadores de torneo de la hoja Jugadores`);
    
    return {
      success: true,
      message: `Se eliminaron ${removedCount} jugadores de torneo`,
      removed: removedCount
    };
    
  } catch (error) {
    Logger.log('❌ Error eliminando jugadores:', error.toString());
    return { success: false, message: 'Error eliminando jugadores: ' + error.toString() };
  }
}

/**
 * MIGRACIÓN COMPLETA: Ejecuta todo el proceso de migración
 */
function executeCompleteTournamentMigration() {
  try {
    Logger.log('=== EJECUTANDO MIGRACIÓN COMPLETA DE TORNEOS ===');
    
    // Paso 1: Migrar jugadores a torneos
    const migrationResult = migrateExistingTournamentPlayers();
    
    if (!migrationResult.success) {
      return migrationResult;
    }
    
    // Paso 2: Eliminar jugadores de torneo de la hoja principal
    const removalResult = removeMigratedTournamentPlayers();
    
    if (!removalResult.success) {
      return removalResult;
    }
    
    const totalResult = {
      success: true,
      message: `Migración completa exitosa: ${migrationResult.migrated} jugadores migrados a ${migrationResult.tournamentsCreated} torneos, ${removalResult.removed} jugadores eliminados de la hoja principal`,
      migrated: migrationResult.migrated,
      tournamentsCreated: migrationResult.tournamentsCreated,
      removed: removalResult.removed
    };
    
    Logger.log('✅ MIGRACIÓN COMPLETA EXITOSA');
    Logger.log(`📊 Resultados: ${totalResult.message}`);
    
    return totalResult;
    
  } catch (error) {
    Logger.log('❌ Error en migración completa:', error.toString());
    return { success: false, message: 'Error en migración completa: ' + error.toString() };
  }
}
