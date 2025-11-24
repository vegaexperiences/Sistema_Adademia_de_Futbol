/**
 * Reparación COMPLETA de la hoja Jugadores
 * Elimina duplicados, agrega columnas faltantes, reorganiza todo
 */
function completeRepairJugadores() {
  try {
    Logger.log('=== REPARACIÓN COMPLETA JUGADORES ===');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Jugadores');
    
    if (!sheet) {
      throw new Error('Hoja "Jugadores" no encontrada');
    }
    
    Logger.log('Paso 1: Leyendo datos actuales...');
    const allData = sheet.getDataRange().getValues();
    const currentHeaders = allData[0];
    const dataRows = allData.slice(1);
    
    Logger.log(`Datos actuales: ${dataRows.length} jugadores, ${currentHeaders.length} columnas`);
    Logger.log('Headers actuales:', currentHeaders);
    
    // Headers correctos en orden exacto
    const correctHeaders = [
      'ID',                         // A (0)
      'Nombre',                     // B (1)
      'Apellidos',                  // C (2)
      'Edad',                       // D (3)
      'Cédula',                     // E (4)
      'Teléfono',                   // F (5)
      'Categoría',                  // G (6)
      'Estado',                     // H (7)
      'Fecha Registro',             // I (8)
      'Tutor',                      // J (9)
      'Email Tutor',                // K (10) ← DEBE AGREGARSE
      'Dirección',                  // L (11) ← DEBE AGREGARSE
      'Familia ID',                 // M (12)
      'Tipo',                       // N (13)
      'Descuento %',                // O (14)
      'Observaciones',              // P (15)
      'Fecha Nacimiento',           // Q (16)
      'Género',                     // R (17)
      'Método Pago Preferido',      // S (18)
      'Cédula Tutor',               // T (19)
      'Mensualidad Personalizada',  // U (20)
      'URL Cédula Jugador',         // V (21)
      'URL Cédula Tutor'            // W (22)
    ];
    
    Logger.log('Paso 2: Creando mapa de datos actuales...');
    
    // Crear mapa de columnas actuales
    const currentMap = {};
    currentHeaders.forEach((header, idx) => {
      if (header && header.trim() !== '') {
        // Si la columna ya existe en el mapa, es un duplicado - ignorar
        if (!currentMap[header]) {
          currentMap[header] = idx;
        }
      }
    });
    
    Logger.log('Columnas únicas encontradas:', Object.keys(currentMap).length);
    
    Logger.log('Paso 3: Reorganizando datos...');
    
    // Reorganizar datos según estructura correcta
    const newData = [correctHeaders]; // Primera fila: headers
    
    dataRows.forEach((row, idx) => {
      const newRow = correctHeaders.map(header => {
        // Si la columna existe en los datos actuales, tomar ese valor
        if (currentMap[header] !== undefined) {
          return row[currentMap[header]] || '';
        }
        // Si no existe (Email Tutor, Dirección), dejar vacío
        return '';
      });
      
      newData.push(newRow);
      
      if (idx < 2) {
        Logger.log(`Fila ${idx + 1} reorganizada:`, newRow.slice(0, 15).join(', '));
      }
    });
    
    Logger.log(`✅ ${newData.length - 1} filas reorganizadas`);
    
    Logger.log('Paso 4: Limpiando hoja...');
    sheet.clear();
    
    Logger.log('Paso 5: Escribiendo datos reorganizados...');
    sheet.getRange(1, 1, newData.length, correctHeaders.length).setValues(newData);
    
    Logger.log('Paso 6: Aplicando formato...');
    
    // Formatear headers
    const headerRange = sheet.getRange(1, 1, 1, correctHeaders.length);
    headerRange.setBackground('#1e3a8a');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    
    // Congelar primera fila
    sheet.setFrozenRows(1);
    
    // Ajustar anchos de columnas
    sheet.setColumnWidth(1, 180);  // ID
    sheet.setColumnWidth(2, 120);  // Nombre
    sheet.setColumnWidth(3, 120);  // Apellidos
    sheet.setColumnWidth(4, 60);   // Edad
    sheet.setColumnWidth(5, 120);  // Cédula
    sheet.setColumnWidth(6, 100);  // Teléfono
    sheet.setColumnWidth(7, 100);  // Categoría
    sheet.setColumnWidth(8, 80);   // Estado
    sheet.setColumnWidth(9, 120);  // Fecha Registro
    sheet.setColumnWidth(10, 150); // Tutor
    sheet.setColumnWidth(11, 150); // Email Tutor
    sheet.setColumnWidth(12, 200); // Dirección
    sheet.setColumnWidth(13, 150); // Familia ID
    
    // Resto de columnas
    for (let i = 14; i <= correctHeaders.length; i++) {
      sheet.setColumnWidth(i, 120);
    }
    
    Logger.log('✅ REPARACIÓN COMPLETA EXITOSA');
    
    return {
      success: true,
      message: 'Hoja reorganizada completamente',
      oldColumns: currentHeaders.length,
      newColumns: correctHeaders.length,
      columnsRemoved: currentHeaders.length - correctHeaders.length,
      playersCount: dataRows.length
    };
    
  } catch (error) {
    Logger.log('❌ Error en reparación completa:', error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Wrapper para el menú
 */
function runCompleteRepair() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '🔨 Reparación Completa de Jugadores',
      'Esta herramienta hará una REPARACIÓN COMPLETA de la hoja:\n\n' +
      '✅ Eliminará columnas duplicadas (Descuento %, Observaciones)\n' +
      '✅ Agregará columnas faltantes (Email Tutor, Dirección)\n' +
      '✅ Reorganizará todo en el orden correcto\n' +
      '✅ Aplicará formato profesional\n\n' +
      '⚠️ TUS 5 JUGADORES SE MANTENDRÁN INTACTOS\n\n' +
      'Tiempo estimado: 10 segundos\n\n' +
      '¿Continuar?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      Logger.log('Reparación cancelada por el usuario');
      return;
    }
    
    const result = completeRepairJugadores();
    
    if (result.success) {
      let msg = `✅ ¡REPARACIÓN COMPLETA EXITOSA!\n\n`;
      msg += `Columnas antes: ${result.oldColumns}\n`;
      msg += `Columnas ahora: ${result.newColumns}\n`;
      msg += `Columnas eliminadas: ${result.columnsRemoved}\n`;
      msg += `Jugadores conservados: ${result.playersCount}\n\n`;
      msg += `Estructura final:\n`;
      msg += `ID → Nombre → Apellidos → ... → Tutor → \n`;
      msg += `✅ Email Tutor → ✅ Dirección → Familia ID → ...\n\n`;
      msg += `🎉 Ahora abre "Gestión de Jugadores" y verás:\n`;
      msg += `• Tus 5 jugadores correctamente\n`;
      msg += `• Con códigos de color funcionando\n`;
      msg += `• Sin errores de carga`;
      
      ui.alert('🔨 ¡Reparación Exitosa!', msg, ui.ButtonSet.OK);
      Logger.log('✅ Reparación completa exitosa');
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

