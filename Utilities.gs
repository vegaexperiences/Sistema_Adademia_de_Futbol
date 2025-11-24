/**
 * ========================================
 * ARCHIVO: Utilities.gs
 * DESCRIPCIÓN: Utilidades y funciones auxiliares del sistema
 * FUNCIONES: Helpers, formateo, conversiones, validaciones generales
 * ========================================
 */

/**
 * Formatea una fecha para mostrar
 */
function formatDate(date, includeTime = false) {
  try {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return dateObj.toLocaleDateString('es-ES', options);
    
  } catch (error) {
    Logger.log('Error formateando fecha: ' + error.toString());
    return '';
  }
}

/**
 * Formatea una moneda
 */
function formatCurrency(amount, currency = 'USD') {
  try {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
    
  } catch (error) {
    Logger.log('Error formateando moneda: ' + error.toString());
    return '$0.00';
  }
}

/**
 * Genera un ID único
 */
function generateUniqueId(prefix = 'ID') {
  try {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}`;
    
  } catch (error) {
    Logger.log('Error generando ID único: ' + error.toString());
    return `${prefix}_${Date.now()}`;
  }
}

/**
 * Calcula la edad basada en el año de nacimiento
 */
function calculateAge(birthYear) {
  try {
    if (!birthYear || isNaN(birthYear)) return 0;
    
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(birthYear);
    
  } catch (error) {
    Logger.log('Error calculando edad: ' + error.toString());
    return 0;
  }
}

/**
 * Obtiene el año de nacimiento basado en la edad
 */
function getBirthYearFromAge(age) {
  try {
    if (!age || isNaN(age)) return null;
    
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(age);
    
  } catch (error) {
    Logger.log('Error obteniendo año de nacimiento: ' + error.toString());
    return null;
  }
}

/**
 * Valida un email
 */
function isValidEmail(email) {
  try {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
    
  } catch (error) {
    Logger.log('Error validando email: ' + error.toString());
    return false;
  }
}

/**
 * Limpia y formatea un número de teléfono
 */
function cleanPhoneNumber(phone) {
  try {
    if (!phone) return '';
    
    // Remover todos los caracteres no numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Formatear según el país (asumiendo formato internacional)
    if (cleaned.length >= 10) {
      return `+${cleaned}`;
    }
    
    return cleaned;
    
  } catch (error) {
    Logger.log('Error limpiando teléfono: ' + error.toString());
    return phone;
  }
}

/**
 * Convierte texto a título (primera letra mayúscula)
 */
function toTitleCase(text) {
  try {
    if (!text || typeof text !== 'string') return '';
    
    return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
  } catch (error) {
    Logger.log('Error convirtiendo a título: ' + error.toString());
    return text;
  }
}

/**
 * Trunca texto a una longitud específica
 */
function truncateText(text, maxLength = 50, suffix = '...') {
  try {
    if (!text || typeof text !== 'string') return '';
    
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - suffix.length) + suffix;
    
  } catch (error) {
    Logger.log('Error truncando texto: ' + error.toString());
    return text;
  }
}

/**
 * Convierte un objeto a CSV
 */
function objectToCSV(data, headers = null) {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }
    
    // Obtener headers si no se proporcionan
    if (!headers) {
      headers = Object.keys(data[0]);
    }
    
    // Crear fila de headers
    const csvRows = [headers.join(',')];
    
    // Crear filas de datos
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escapar comillas y envolver en comillas si contiene comas
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
    
  } catch (error) {
    Logger.log('Error convirtiendo a CSV: ' + error.toString());
    return '';
  }
}

/**
 * Convierte CSV a array de objetos
 */
function csvToObjects(csvText, hasHeaders = true) {
  try {
    if (!csvText || typeof csvText !== 'string') {
      return [];
    }
    
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    let headers = [];
    let dataLines = lines;
    
    if (hasHeaders) {
      headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      dataLines = lines.slice(1);
    }
    
    const objects = dataLines.map(line => {
      const values = parseCSVLine(line);
      const obj = {};
      
      values.forEach((value, index) => {
        const header = headers[index] || `column_${index}`;
        obj[header] = value.trim().replace(/"/g, '');
      });
      
      return obj;
    });
    
    return objects;
    
  } catch (error) {
    Logger.log('Error convirtiendo CSV a objetos: ' + error.toString());
    return [];
  }
}

/**
 * Parsea una línea CSV considerando comillas
 */
function parseCSVLine(line) {
  try {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Saltar la siguiente comilla
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current);
    return values;
    
  } catch (error) {
    Logger.log('Error parseando línea CSV: ' + error.toString());
    return line.split(',');
  }
}

/**
 * Obtiene el nombre del mes en español
 */
function getMonthName(monthIndex, short = false) {
  try {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const shortMonths = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    
    if (monthIndex < 0 || monthIndex > 11) return '';
    
    return short ? shortMonths[monthIndex] : months[monthIndex];
    
  } catch (error) {
    Logger.log('Error obteniendo nombre del mes: ' + error.toString());
    return '';
  }
}

/**
 * Obtiene el nombre del día de la semana en español
 */
function getDayName(dayIndex, short = false) {
  try {
    const days = [
      'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
    ];
    
    const shortDays = [
      'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'
    ];
    
    if (dayIndex < 0 || dayIndex > 6) return '';
    
    return short ? shortDays[dayIndex] : days[dayIndex];
    
  } catch (error) {
    Logger.log('Error obteniendo nombre del día: ' + error.toString());
    return '';
  }
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
function daysDifference(date1, date2) {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
  } catch (error) {
    Logger.log('Error calculando diferencia de días: ' + error.toString());
    return 0;
  }
}

/**
 * Verifica si una fecha está en el rango especificado
 */
function isDateInRange(date, startDate, endDate) {
  try {
    const checkDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(checkDate.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    return checkDate >= start && checkDate <= end;
    
  } catch (error) {
    Logger.log('Error verificando rango de fechas: ' + error.toString());
    return false;
  }
}

/**
 * Obtiene el primer día del mes
 */
function getFirstDayOfMonth(date = new Date()) {
  try {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
    
  } catch (error) {
    Logger.log('Error obteniendo primer día del mes: ' + error.toString());
    return new Date();
  }
}

/**
 * Obtiene el último día del mes
 */
function getLastDayOfMonth(date = new Date()) {
  try {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    
  } catch (error) {
    Logger.log('Error obteniendo último día del mes: ' + error.toString());
    return new Date();
  }
}

/**
 * Convierte bytes a formato legible
 */
function formatBytes(bytes, decimals = 2) {
  try {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    
  } catch (error) {
    Logger.log('Error formateando bytes: ' + error.toString());
    return '0 Bytes';
  }
}

/**
 * Genera un color aleatorio en formato hexadecimal
 */
function generateRandomColor() {
  try {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    
  } catch (error) {
    Logger.log('Error generando color aleatorio: ' + error.toString());
    return '#000000';
  }
}

/**
 * Convierte un color hexadecimal a RGB
 */
function hexToRgb(hex) {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
    
  } catch (error) {
    Logger.log('Error convirtiendo hex a RGB: ' + error.toString());
    return null;
  }
}

/**
 * Crea un delay/sleep
 */
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Ejecuta una función con retry automático
 */
function executeWithRetry(func, maxRetries = 3, delay = 1000) {
  return new Promise(async (resolve, reject) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await func();
        resolve(result);
        return;
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await sleep(delay * (i + 1)); // Delay incremental
        }
      }
    }
    
    reject(lastError);
  });
}

/**
 * Valida si un string es un JSON válido
 */
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convierte un objeto a JSON de forma segura
 */
function safeJSONStringify(obj, replacer = null, space = 2) {
  try {
    return JSON.stringify(obj, replacer, space);
  } catch (error) {
    Logger.log('Error convirtiendo a JSON: ' + error.toString());
    return '{}';
  }
}

/**
 * Convierte JSON a objeto de forma segura
 */
function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    Logger.log('Error parseando JSON: ' + error.toString());
    return defaultValue;
  }
}

/**
 * Obtiene un valor anidado de un objeto de forma segura
 */
function getNestedValue(obj, path, defaultValue = null) {
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  } catch (error) {
    Logger.log('Error obteniendo valor anidado: ' + error.toString());
    return defaultValue;
  }
}

/**
 * Establece un valor anidado en un objeto de forma segura
 */
function setNestedValue(obj, path, value) {
  try {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
    return true;
  } catch (error) {
    Logger.log('Error estableciendo valor anidado: ' + error.toString());
    return false;
  }
}

/**
 * Clona un objeto de forma profunda
 */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    Logger.log('Error clonando objeto: ' + error.toString());
    return obj;
  }
}

/**
 * Combina múltiples objetos
 */
function mergeObjects(...objects) {
  try {
    return Object.assign({}, ...objects);
  } catch (error) {
    Logger.log('Error combinando objetos: ' + error.toString());
    return {};
  }
}

/**
 * Obtiene las claves únicas de un array de objetos
 */
function getUniqueKeys(objects) {
  try {
    const keys = new Set();
    objects.forEach(obj => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => keys.add(key));
      }
    });
    return Array.from(keys);
  } catch (error) {
    Logger.log('Error obteniendo claves únicas: ' + error.toString());
    return [];
  }
}

/**
 * Agrupa un array de objetos por una propiedad
 */
function groupBy(array, key) {
  try {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  } catch (error) {
    Logger.log('Error agrupando array: ' + error.toString());
    return {};
  }
}

/**
 * Ordena un array de objetos por una propiedad
 */
function sortBy(array, key, ascending = true) {
  try {
    return array.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  } catch (error) {
    Logger.log('Error ordenando array: ' + error.toString());
    return array;
  }
}
