/**
 * ========================================
 * ARCHIVO: SearchEngine.gs
 * DESCRIPCIÓN: Motor de búsqueda avanzado del sistema
 * FUNCIONES: Búsquedas complejas, filtros, ordenamiento, paginación
 * ========================================
 */

/**
 * Busca jugadores con criterios avanzados
 */
function searchPlayersAdvanced(criteria) {
  try {
    const allPlayers = getAllPlayers();
    let results = allPlayers;
    
    // Aplicar filtros
    if (criteria.name) {
      results = filterByName(results, criteria.name);
    }
    
    if (criteria.cedula) {
      results = filterByCedula(results, criteria.cedula);
    }
    
    if (criteria.phone) {
      results = filterByPhone(results, criteria.phone);
    }
    
    if (criteria.category) {
      results = filterByCategory(results, criteria.category);
    }
    
    if (criteria.state) {
      results = filterByState(results, criteria.state);
    }
    
    if (criteria.type) {
      results = filterByType(results, criteria.type);
    }
    
    if (criteria.ageRange) {
      results = filterByAgeRange(results, criteria.ageRange);
    }
    
    if (criteria.familyId) {
      results = filterByFamily(results, criteria.familyId);
    }
    
    if (criteria.dateRange) {
      results = filterByDateRange(results, criteria.dateRange);
    }
    
    // Aplicar ordenamiento
    if (criteria.sortBy) {
      results = sortResults(results, criteria.sortBy, criteria.sortOrder || 'asc');
    }
    
    // Aplicar paginación
    if (criteria.page && criteria.pageSize) {
      results = paginateResults(results, criteria.page, criteria.pageSize);
    }
    
    return {
      results: results,
      total: allPlayers.length,
      filtered: results.length,
      criteria: criteria
    };
    
  } catch (error) {
    Logger.log('Error en búsqueda avanzada: ' + error.toString());
    return null;
  }
}

/**
 * Filtra por nombre (búsqueda parcial)
 */
function filterByName(players, name) {
  try {
    const searchTerm = name.toLowerCase();
    return players.filter(player => 
      player.Nombre.toLowerCase().includes(searchTerm) ||
      player.Apellidos.toLowerCase().includes(searchTerm) ||
      `${player.Nombre} ${player.Apellidos}`.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    Logger.log('Error filtrando por nombre: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por cédula
 */
function filterByCedula(players, cedula) {
  try {
    return players.filter(player => 
      player.Cédula && player.Cédula.includes(cedula)
    );
  } catch (error) {
    Logger.log('Error filtrando por cédula: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por teléfono
 */
function filterByPhone(players, phone) {
  try {
    return players.filter(player => 
      player.Teléfono && player.Teléfono.includes(phone)
    );
  } catch (error) {
    Logger.log('Error filtrando por teléfono: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por categoría
 */
function filterByCategory(players, category) {
  try {
    return players.filter(player => 
      player.Categoría === category
    );
  } catch (error) {
    Logger.log('Error filtrando por categoría: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por estado
 */
function filterByState(players, state) {
  try {
    return players.filter(player => 
      player.Estado === state
    );
  } catch (error) {
    Logger.log('Error filtrando por estado: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por tipo
 */
function filterByType(players, type) {
  try {
    return players.filter(player => 
      player.Tipo === type
    );
  } catch (error) {
    Logger.log('Error filtrando por tipo: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por rango de edad
 */
function filterByAgeRange(players, ageRange) {
  try {
    const minAge = ageRange.min || 0;
    const maxAge = ageRange.max || 100;
    
    return players.filter(player => {
      const age = parseInt(player.Edad);
      return age >= minAge && age <= maxAge;
    });
  } catch (error) {
    Logger.log('Error filtrando por rango de edad: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por familia
 */
function filterByFamily(players, familyId) {
  try {
    return players.filter(player => 
      player['Familia ID'] === familyId
    );
  } catch (error) {
    Logger.log('Error filtrando por familia: ' + error.toString());
    return players;
  }
}

/**
 * Filtra por rango de fechas
 */
function filterByDateRange(players, dateRange) {
  try {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    return players.filter(player => {
      const playerDate = new Date(player['Fecha Registro']);
      return playerDate >= startDate && playerDate <= endDate;
    });
  } catch (error) {
    Logger.log('Error filtrando por rango de fechas: ' + error.toString());
    return players;
  }
}

/**
 * Ordena resultados
 */
function sortResults(players, sortBy, sortOrder = 'asc') {
  try {
    return players.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Manejar diferentes tipos de datos
      if (sortBy === 'Edad' || sortBy === 'Descuento %') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortBy === 'Fecha Registro') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  } catch (error) {
    Logger.log('Error ordenando resultados: ' + error.toString());
    return players;
  }
}

/**
 * Pagina resultados
 */
function paginateResults(players, page, pageSize) {
  try {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return players.slice(startIndex, endIndex);
  } catch (error) {
    Logger.log('Error paginando resultados: ' + error.toString());
    return players;
  }
}

/**
 * Busca pagos con criterios avanzados
 */
function searchPaymentsAdvanced(criteria) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentsSheet = ss.getSheetByName('Pagos');
    
    if (!paymentsSheet) {
      return null;
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    const headers = data[0];
    let payments = data.slice(1).map(row => {
      const payment = {};
      headers.forEach((header, index) => {
        payment[header] = row[index];
      });
      return payment;
    });
    
    // Aplicar filtros
    if (criteria.playerId) {
      payments = payments.filter(p => p['Jugador ID'] === criteria.playerId);
    }
    
    if (criteria.type) {
      payments = payments.filter(p => p.Tipo === criteria.type);
    }
    
    if (criteria.state) {
      payments = payments.filter(p => p.Estado === criteria.state);
    }
    
    if (criteria.method) {
      payments = payments.filter(p => p['Método Pago'] === criteria.method);
    }
    
    if (criteria.amountRange) {
      payments = payments.filter(p => {
        const amount = parseFloat(p.Monto);
        return amount >= criteria.amountRange.min && amount <= criteria.amountRange.max;
      });
    }
    
    if (criteria.dateRange) {
      payments = payments.filter(p => {
        const paymentDate = new Date(p.Fecha);
        return paymentDate >= new Date(criteria.dateRange.start) && 
               paymentDate <= new Date(criteria.dateRange.end);
      });
    }
    
    // Ordenar por fecha descendente por defecto
    payments.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
    
    return {
      results: payments,
      total: payments.length,
      criteria: criteria
    };
    
  } catch (error) {
    Logger.log('Error en búsqueda de pagos: ' + error.toString());
    return null;
  }
}

/**
 * Busca gastos con criterios avanzados
 */
function searchExpensesAdvanced(criteria) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const expensesSheet = ss.getSheetByName('Gastos');
    
    if (!expensesSheet) {
      return null;
    }
    
    const data = expensesSheet.getDataRange().getValues();
    const headers = data[0];
    let expenses = data.slice(1).map(row => {
      const expense = {};
      headers.forEach((header, index) => {
        expense[header] = row[index];
      });
      return expense;
    });
    
    // Aplicar filtros
    if (criteria.category) {
      expenses = expenses.filter(e => e.Categoría === criteria.category);
    }
    
    if (criteria.method) {
      expenses = expenses.filter(e => e['Método Pago'] === criteria.method);
    }
    
    if (criteria.amountRange) {
      expenses = expenses.filter(e => {
        const amount = parseFloat(e.Monto);
        return amount >= criteria.amountRange.min && amount <= criteria.amountRange.max;
      });
    }
    
    if (criteria.dateRange) {
      expenses = expenses.filter(e => {
        const expenseDate = new Date(e.Fecha);
        return expenseDate >= new Date(criteria.dateRange.start) && 
               expenseDate <= new Date(criteria.dateRange.end);
      });
    }
    
    if (criteria.description) {
      const searchTerm = criteria.description.toLowerCase();
      expenses = expenses.filter(e => 
        e.Descripción.toLowerCase().includes(searchTerm)
      );
    }
    
    // Ordenar por fecha descendente por defecto
    expenses.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
    
    return {
      results: expenses,
      total: expenses.length,
      criteria: criteria
    };
    
  } catch (error) {
    Logger.log('Error en búsqueda de gastos: ' + error.toString());
    return null;
  }
}

/**
 * Busca aprobaciones con criterios avanzados
 */
function searchApprovalsAdvanced(criteria) {
  try {
    const allApprovals = getPendingApprovals();
    let results = allApprovals;
    
    // Aplicar filtros
    if (criteria.name) {
      results = filterApprovalsByName(results, criteria.name);
    }
    
    if (criteria.cedula) {
      results = results.filter(a => a.Cédula && a.Cédula.includes(criteria.cedula));
    }
    
    if (criteria.category) {
      results = results.filter(a => a.Categoría === criteria.category);
    }
    
    if (criteria.status) {
      results = results.filter(a => a.Estado === criteria.status);
    }
    
    if (criteria.type) {
      results = results.filter(a => a['Tipo Aprobación'] === criteria.type);
    }
    
    if (criteria.dateRange) {
      results = results.filter(a => {
        const approvalDate = new Date(a['Fecha Aplicación']);
        return approvalDate >= new Date(criteria.dateRange.start) && 
               approvalDate <= new Date(criteria.dateRange.end);
      });
    }
    
    // Ordenar por fecha de aplicación descendente por defecto
    results.sort((a, b) => new Date(b['Fecha Aplicación']) - new Date(a['Fecha Aplicación']));
    
    return {
      results: results,
      total: allApprovals.length,
      filtered: results.length,
      criteria: criteria
    };
    
  } catch (error) {
    Logger.log('Error en búsqueda de aprobaciones: ' + error.toString());
    return null;
  }
}

/**
 * Filtra aprobaciones por nombre
 */
function filterApprovalsByName(approvals, name) {
  try {
    const searchTerm = name.toLowerCase();
    return approvals.filter(approval => 
      approval.Nombre.toLowerCase().includes(searchTerm) ||
      approval.Apellidos.toLowerCase().includes(searchTerm) ||
      `${approval.Nombre} ${approval.Apellidos}`.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    Logger.log('Error filtrando aprobaciones por nombre: ' + error.toString());
    return approvals;
  }
}

/**
 * Búsqueda global en todo el sistema
 */
function globalSearch(searchTerm) {
  try {
    const results = {
      players: [],
      payments: [],
      expenses: [],
      approvals: [],
      total: 0
    };
    
    // Buscar en jugadores
    const players = getAllPlayers();
    results.players = players.filter(player => 
      player.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.Apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.Cédula.includes(searchTerm) ||
      (player.Teléfono && player.Teléfono.includes(searchTerm))
    );
    
    // Buscar en pagos
    const paymentsSearch = searchPaymentsAdvanced({
      playerId: searchTerm
    });
    if (paymentsSearch) {
      results.payments = paymentsSearch.results;
    }
    
    // Buscar en gastos
    const expensesSearch = searchExpensesAdvanced({
      description: searchTerm
    });
    if (expensesSearch) {
      results.expenses = expensesSearch.results;
    }
    
    // Buscar en aprobaciones
    const approvalsSearch = searchApprovalsAdvanced({
      name: searchTerm
    });
    if (approvalsSearch) {
      results.approvals = approvalsSearch.results;
    }
    
    results.total = results.players.length + results.payments.length + 
                   results.expenses.length + results.approvals.length;
    
    return results;
    
  } catch (error) {
    Logger.log('Error en búsqueda global: ' + error.toString());
    return null;
  }
}

/**
 * Obtiene sugerencias de búsqueda
 */
function getSearchSuggestions(partialTerm, type = 'all') {
  try {
    const suggestions = [];
    const term = partialTerm.toLowerCase();
    
    if (type === 'all' || type === 'players') {
      const players = getAllPlayers();
      players.forEach(player => {
        const fullName = `${player.Nombre} ${player.Apellidos}`;
        if (fullName.toLowerCase().includes(term)) {
          suggestions.push({
            type: 'player',
            value: fullName,
            id: player.ID,
            category: player.Categoría
          });
        }
      });
    }
    
    if (type === 'all' || type === 'categories') {
      const categories = getAllCategories();
      categories.forEach(category => {
        if (category.toLowerCase().includes(term)) {
          suggestions.push({
            type: 'category',
            value: category,
            id: category
          });
        }
      });
    }
    
    // Limitar sugerencias
    return suggestions.slice(0, 10);
    
  } catch (error) {
    Logger.log('Error obteniendo sugerencias: ' + error.toString());
    return [];
  }
}

/**
 * Guarda búsqueda frecuente
 */
function saveFrequentSearch(searchTerm, criteria) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let searchesSheet = ss.getSheetByName('Búsquedas');
    
    if (!searchesSheet) {
      searchesSheet = ss.insertSheet('Búsquedas');
      const headers = ['Término', 'Criterios', 'Fecha', 'Frecuencia'];
      searchesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const data = searchesSheet.getDataRange().getValues();
    const existingRowIndex = data.findIndex(row => row[0] === searchTerm);
    
    if (existingRowIndex >= 0) {
      // Incrementar frecuencia
      const currentFreq = parseInt(data[existingRowIndex][3]) || 0;
      searchesSheet.getRange(existingRowIndex + 1, 4).setValue(currentFreq + 1);
      searchesSheet.getRange(existingRowIndex + 1, 3).setValue(new Date());
    } else {
      // Agregar nueva búsqueda
      searchesSheet.appendRow([
        searchTerm,
        JSON.stringify(criteria),
        new Date(),
        1
      ]);
    }
    
  } catch (error) {
    Logger.log('Error guardando búsqueda frecuente: ' + error.toString());
  }
}

/**
 * Obtiene búsquedas frecuentes
 */
function getFrequentSearches(limit = 10) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const searchesSheet = ss.getSheetByName('Búsquedas');
    
    if (!searchesSheet) {
      return [];
    }
    
    const data = searchesSheet.getDataRange().getValues();
    const searches = data.slice(1).map(row => ({
      term: row[0],
      criteria: safeJSONParse(row[1], {}),
      date: row[2],
      frequency: parseInt(row[3]) || 0
    }));
    
    // Ordenar por frecuencia descendente
    searches.sort((a, b) => b.frequency - a.frequency);
    
    return searches.slice(0, limit);
    
  } catch (error) {
    Logger.log('Error obteniendo búsquedas frecuentes: ' + error.toString());
    return [];
  }
}
