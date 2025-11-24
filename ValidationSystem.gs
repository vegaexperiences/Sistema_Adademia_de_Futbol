/**
 * ========================================
 * ARCHIVO: ValidationSystem.gs
 * DESCRIPCIÓN: Sistema de validación de datos para el sistema de Academia de Fútbol
 * FUNCIONES: Validación de formularios, datos de jugadores, pagos y configuraciones
 * ========================================
 */

/**
 * Valida los datos de admisión de un jugador
 */
function validateAdmissionData(formData) {
  const errors = [];
  
  // Validar que haya al menos un jugador
  if (!formData.players || formData.players.length === 0) {
    errors.push('Debe incluir al menos un jugador');
    return { isValid: false, errors: errors };
  }
  
  // Validar datos del tutor
  if (!formData.tutor.name || formData.tutor.name.trim() === '') {
    errors.push('El nombre del tutor es obligatorio');
  }
  
  if (!formData.tutor.phone || formData.tutor.phone.trim() === '') {
    errors.push('El teléfono del tutor es obligatorio');
  } else if (!isValidPhone(formData.tutor.phone)) {
    errors.push('El formato del teléfono del tutor no es válido');
  }
  
  // Validar cada jugador
  formData.players.forEach((player, index) => {
    const playerErrors = validatePlayerData(player, index + 1);
    errors.push(...playerErrors);
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida los datos de un torneo
 */
function validateTournamentData(formData) {
  const errors = [];
  
  // Validar nombre del torneo
  if (!formData.tournamentName || formData.tournamentName.trim() === '') {
    errors.push('El nombre del torneo es obligatorio');
  }
  
  // Validar datos del jugador
  const playerErrors = validatePlayerData(formData.player, 1);
  errors.push(...playerErrors);
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida los datos de un jugador individual
 */
function validatePlayerData(player, playerNumber = 1) {
  const errors = [];
  const prefix = playerNumber > 1 ? `Jugador ${playerNumber}: ` : '';
  
  // Validar nombre
  if (!player.name || player.name.trim() === '') {
    errors.push(`${prefix}El nombre es obligatorio`);
  } else if (player.name.length < 2) {
    errors.push(`${prefix}El nombre debe tener al menos 2 caracteres`);
  }
  
  // Validar apellidos
  if (!player.lastName || player.lastName.trim() === '') {
    errors.push(`${prefix}Los apellidos son obligatorios`);
  } else if (player.lastName.length < 2) {
    errors.push(`${prefix}Los apellidos deben tener al menos 2 caracteres`);
  }
  
  // Validar edad
  if (!player.age || isNaN(player.age)) {
    errors.push(`${prefix}La edad es obligatoria y debe ser un número`);
  } else {
    const age = parseInt(player.age);
    if (age < 4 || age > 18) {
      errors.push(`${prefix}La edad debe estar entre 4 y 18 años`);
    }
  }
  
  // Validar cédula/identificación
  if (!player.id || player.id.trim() === '') {
    errors.push(`${prefix}La cédula o identificación es obligatoria`);
  } else if (!isValidId(player.id)) {
    errors.push(`${prefix}El formato de la cédula no es válido`);
  }
  
  // Validar teléfono
  if (player.phone && !isValidPhone(player.phone)) {
    errors.push(`${prefix}El formato del teléfono no es válido`);
  }
  
  // Validar género
  if (player.gender && !['M', 'F'].includes(player.gender.toUpperCase())) {
    errors.push(`${prefix}El género debe ser M (Masculino) o F (Femenino)`);
  }
  
  // Validar que no exista otro jugador con la misma cédula
  if (player.id && playerExists(player.id)) {
    errors.push(`${prefix}Ya existe un jugador registrado con esta cédula`);
  }
  
  return errors;
}

/**
 * Valida los datos de un pago
 */
function validatePaymentData(paymentData) {
  const errors = [];
  
  // Validar jugador ID
  if (!paymentData.playerId || paymentData.playerId.trim() === '') {
    errors.push('El ID del jugador es obligatorio');
  } else if (!playerExistsById(paymentData.playerId)) {
    errors.push('El jugador especificado no existe');
  }
  
  // Validar tipo de pago
  const validTypes = Object.values(getPaymentTypes());
  if (!paymentData.type || !validTypes.includes(paymentData.type)) {
    errors.push('El tipo de pago no es válido');
  }
  
  // Validar monto
  if (!paymentData.amount || isNaN(paymentData.amount)) {
    errors.push('El monto es obligatorio y debe ser un número');
  } else {
    const amount = parseFloat(paymentData.amount);
    if (amount <= 0) {
      errors.push('El monto debe ser mayor a 0');
    }
  }
  
  // Validar fecha
  if (!paymentData.date) {
    errors.push('La fecha es obligatoria');
  } else if (!isValidDate(paymentData.date)) {
    errors.push('El formato de la fecha no es válido');
  }
  
  // Validar método de pago
  const validMethods = Object.values(getPaymentMethods());
  if (paymentData.method && !validMethods.includes(paymentData.method)) {
    errors.push('El método de pago no es válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida los datos de configuración financiera
 */
function validateFinancialConfig(config) {
  const errors = [];
  
  // Validar mensualidad
  if (config.monthlyFee !== undefined) {
    if (isNaN(config.monthlyFee) || config.monthlyFee < 0) {
      errors.push('La mensualidad debe ser un número mayor o igual a 0');
    }
  }
  
  // Validar matrícula
  if (config.enrollmentFee !== undefined) {
    if (isNaN(config.enrollmentFee) || config.enrollmentFee < 0) {
      errors.push('La matrícula debe ser un número mayor o igual a 0');
    }
  }
  
  // Validar mensualidad familiar
  if (config.familyMonthlyFee !== undefined) {
    if (isNaN(config.familyMonthlyFee) || config.familyMonthlyFee < 0) {
      errors.push('La mensualidad familiar debe ser un número mayor o igual a 0');
    }
    
    // Validar que sea menor que la mensualidad individual
    if (config.monthlyFee && config.familyMonthlyFee >= config.monthlyFee) {
      errors.push('La mensualidad familiar debe ser menor que la mensualidad individual');
    }
  }
  
  // Validar moneda
  if (config.currency && config.currency.length !== 3) {
    errors.push('La moneda debe tener 3 caracteres (ej: USD, EUR)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida un número de teléfono
 */
function isValidPhone(phone) {
  if (!phone) return false;
  
  // Remover espacios y caracteres especiales
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Validar que contenga solo números y tenga entre 7 y 15 dígitos
  const phoneRegex = /^\d{7,15}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Valida un número de cédula o identificación
 */
function isValidId(id) {
  if (!id) return false;
  
  // Remover espacios y caracteres especiales
  const cleanId = id.replace(/[\s\-]/g, '');
  
  // Validar que contenga solo números y tenga entre 7 y 20 dígitos
  const idRegex = /^\d{7,20}$/;
  return idRegex.test(cleanId);
}

/**
 * Valida una fecha
 */
function isValidDate(date) {
  if (!date) return false;
  
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
}

/**
 * Verifica si un jugador ya existe por cédula
 */
function playerExists(cedula) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) return false;
    
    const data = playersSheet.getDataRange().getValues();
    return data.some(row => row[4] === cedula); // Columna de cédula
    
  } catch (error) {
    Logger.log('Error verificando existencia de jugador: ' + error.toString());
    return false;
  }
}

/**
 * Verifica si un jugador existe por ID
 */
function playerExistsById(playerId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const playersSheet = ss.getSheetByName('Jugadores');
    
    if (!playersSheet) return false;
    
    const data = playersSheet.getDataRange().getValues();
    return data.some(row => row[0] === playerId); // Columna de ID
    
  } catch (error) {
    Logger.log('Error verificando existencia de jugador por ID: ' + error.toString());
    return false;
  }
}

/**
 * Valida los datos de un gasto
 */
function validateExpenseData(expenseData) {
  const errors = [];
  
  // Validar descripción
  if (!expenseData.description || expenseData.description.trim() === '') {
    errors.push('La descripción del gasto es obligatoria');
  }
  
  // Validar monto
  if (!expenseData.amount || isNaN(expenseData.amount)) {
    errors.push('El monto del gasto es obligatorio y debe ser un número');
  } else {
    const amount = parseFloat(expenseData.amount);
    if (amount <= 0) {
      errors.push('El monto del gasto debe ser mayor a 0');
    }
  }
  
  // Validar fecha
  if (!expenseData.date) {
    errors.push('La fecha del gasto es obligatoria');
  } else if (!isValidDate(expenseData.date)) {
    errors.push('El formato de la fecha no es válido');
  }
  
  // Validar categoría
  if (!expenseData.category || expenseData.category.trim() === '') {
    errors.push('La categoría del gasto es obligatoria');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida los datos de un descuento
 */
function validateDiscountData(discountData) {
  const errors = [];
  
  // Validar jugador ID
  if (!discountData.playerId || discountData.playerId.trim() === '') {
    errors.push('El ID del jugador es obligatorio');
  } else if (!playerExistsById(discountData.playerId)) {
    errors.push('El jugador especificado no existe');
  }
  
  // Validar porcentaje de descuento
  if (!discountData.percentage || isNaN(discountData.percentage)) {
    errors.push('El porcentaje de descuento es obligatorio y debe ser un número');
  } else {
    const percentage = parseFloat(discountData.percentage);
    if (percentage < 0 || percentage > 100) {
      errors.push('El porcentaje de descuento debe estar entre 0 y 100');
    }
  }
  
  // Validar fecha de inicio
  if (!discountData.startDate) {
    errors.push('La fecha de inicio del descuento es obligatoria');
  } else if (!isValidDate(discountData.startDate)) {
    errors.push('El formato de la fecha de inicio no es válido');
  }
  
  // Validar fecha de fin (opcional)
  if (discountData.endDate && !isValidDate(discountData.endDate)) {
    errors.push('El formato de la fecha de fin no es válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida los datos de configuración de formularios
 */
function validateFormsConfig(formsConfig) {
  const errors = [];
  
  // Validar ID del formulario de admisión
  if (formsConfig.admissionFormId) {
    if (!isValidGoogleFormId(formsConfig.admissionFormId)) {
      errors.push('El ID del formulario de admisión no es válido');
    }
  }
  
  // Validar ID del formulario de torneos
  if (formsConfig.tournamentFormId) {
    if (!isValidGoogleFormId(formsConfig.tournamentFormId)) {
      errors.push('El ID del formulario de torneos no es válido');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida un ID de Google Form
 */
function isValidGoogleFormId(formId) {
  if (!formId) return false;
  
  // Los IDs de Google Forms tienen un formato específico
  const formIdRegex = /^[a-zA-Z0-9_-]{44}$/;
  return formIdRegex.test(formId);
}

/**
 * Valida los datos de una familia
 */
function validateFamilyData(familyData) {
  const errors = [];
  
  // Validar nombre del tutor principal
  if (!familyData.tutorName || familyData.tutorName.trim() === '') {
    errors.push('El nombre del tutor principal es obligatorio');
  }
  
  // Validar teléfono del tutor
  if (!familyData.tutorPhone || familyData.tutorPhone.trim() === '') {
    errors.push('El teléfono del tutor es obligatorio');
  } else if (!isValidPhone(familyData.tutorPhone)) {
    errors.push('El formato del teléfono del tutor no es válido');
  }
  
  // Validar que haya al menos un jugador
  if (!familyData.playerIds || familyData.playerIds.length === 0) {
    errors.push('Debe incluir al menos un jugador en la familia');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Sanitiza los datos de entrada para prevenir inyección
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remover caracteres HTML
    .replace(/['"]/g, '') // Remover comillas
    .trim();
}

/**
 * Valida y sanitiza todos los datos de entrada
 */
function validateAndSanitizeData(data, type) {
  const sanitizedData = {};
  
  // Sanitizar todos los campos de texto
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      sanitizedData[key] = sanitizeInput(data[key]);
    } else {
      sanitizedData[key] = data[key];
    }
  });
  
  // Validar según el tipo
  let validation;
  switch (type) {
    case 'admission':
      validation = validateAdmissionData(sanitizedData);
      break;
    case 'tournament':
      validation = validateTournamentData(sanitizedData);
      break;
    case 'payment':
      validation = validatePaymentData(sanitizedData);
      break;
    case 'expense':
      validation = validateExpenseData(sanitizedData);
      break;
    case 'discount':
      validation = validateDiscountData(sanitizedData);
      break;
    case 'financial_config':
      validation = validateFinancialConfig(sanitizedData);
      break;
    case 'forms_config':
      validation = validateFormsConfig(sanitizedData);
      break;
    case 'family':
      validation = validateFamilyData(sanitizedData);
      break;
    default:
      validation = { isValid: true, errors: [] };
  }
  
  return {
    data: sanitizedData,
    validation: validation
  };
}
