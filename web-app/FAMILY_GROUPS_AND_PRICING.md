# Grupos Familiares y Lógica de Costos

## Tabla de Contenidos
1. [Proceso de Creación de Grupos Familiares](#proceso-de-creación-de-grupos-familiares)
2. [Lógica de Costos Familiares](#lógica-de-costos-familiares)
3. [Configuración de Fechas de Temporada](#configuración-de-fechas-de-temporada)
4. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Proceso de Creación de Grupos Familiares

### Descripción General

El sistema agrupa automáticamente a los jugadores en familias basándose en la información del tutor (padre/madre/representante). Cuando múltiples jugadores comparten el mismo tutor, se crea o se utiliza una familia existente.

### Flujo del Proceso

1. **Durante el Enrollment** (`src/app/api/enrollment/route.ts`):
   - El usuario completa el formulario de inscripción con información del tutor y uno o más jugadores
   - El sistema busca si ya existe una familia con el mismo `tutor_cedula` (cédula única)
   - Si no existe, busca por `tutor_name` como respaldo
   - Si no se encuentra ninguna familia, se crea una nueva en la tabla `families`
   - Todos los jugadores del mismo tutor se vinculan a la misma familia mediante `family_id`

2. **Estructura de Datos**:
   ```sql
   -- Tabla families
   CREATE TABLE families (
     id UUID PRIMARY KEY,
     name TEXT NOT NULL,
     tutor_cedula TEXT UNIQUE NOT NULL,  -- Identificador único
     tutor_name TEXT NOT NULL,
     tutor_email TEXT,
     tutor_phone TEXT,
     created_at TIMESTAMPTZ
   );

   -- Tabla players
   CREATE TABLE players (
     id UUID PRIMARY KEY,
     family_id UUID REFERENCES families(id),  -- Vinculación a familia
     first_name TEXT NOT NULL,
     last_name TEXT NOT NULL,
     -- ... otros campos
   );
   ```

3. **Identificación de Familias**:
   - **Primario**: Por `tutor_cedula` (único en la base de datos)
   - **Secundario**: Por `tutor_name` (si la cédula no está disponible)
   - Si se encuentra una familia existente, se actualiza la información del tutor (email, teléfono)
   - Si no se encuentra, se crea una nueva familia

### Ejemplo de Código

```typescript
// Buscar familia existente por cédula
const { data: existingFamily } = await supabase
  .from('families')
  .select('id')
  .eq('tutor_cedula', tutorCedula)
  .maybeSingle();

if (existingFamily) {
  // Usar familia existente
  familyId = existingFamily.id;
} else {
  // Crear nueva familia
  const { data: newFamily } = await supabase
    .from('families')
    .insert({
      name: `Familia ${tutorName}`,
      tutor_cedula: tutorCedula,
      tutor_name: tutorName,
      tutor_email: tutorEmail,
      tutor_phone: tutorPhone
    })
    .select()
    .single();
  
  familyId = newFamily.id;
}

// Vincular jugadores a la familia
await supabase
  .from('pending_players')
  .insert({
    family_id: familyId,
    first_name: playerFirstName,
    last_name: playerLastName,
    // ... otros campos
  });
```

---

## Lógica de Costos Familiares

### Descripción General

El sistema aplica descuentos automáticos para familias con múltiples jugadores. El primer jugador paga el precio regular, y los jugadores adicionales (segundo en adelante) pagan un precio familiar reducido.

### Implementación

La lógica está implementada en `src/lib/actions/payments.ts` en la función `calculateMonthlyFee()`.

### Reglas de Prioridad

El cálculo de la mensualidad sigue este orden de prioridad:

1. **`custom_monthly_fee`** (si está configurado)
   - Si un jugador tiene una mensualidad personalizada, se usa ese valor
   - Sobrescribe todas las demás reglas

2. **Scholarship** (Beca)
   - Si el jugador tiene status `'Scholarship'`, la mensualidad es $0
   - No se aplican descuentos familiares

3. **Descuento Familiar** (si aplica)
   - Se aplica cuando:
     - El jugador tiene `family_id` asignado
     - La familia tiene 2 o más jugadores activos
     - El jugador NO es el primero en la familia (índice >= 1)
   - Los jugadores se ordenan por `created_at` para determinar el orden

4. **Precio Regular** (por defecto)
   - Se aplica al primer jugador de la familia o a jugadores sin familia

### Cálculo del Índice del Jugador

```typescript
// Obtener todos los jugadores de la familia ordenados por fecha de creación
const { data: familyPlayers } = await supabase
  .from('players')
  .select('id, first_name')
  .eq('family_id', familyId)
  .order('created_at');  // Orden cronológico

// Determinar índice
const playerIndex = familyPlayers.findIndex(p => p.id === playerId);

// Si el índice es >= 1, aplicar precio familiar
if (playerIndex >= 1) {
  return familyFee;  // $110.50 (por defecto)
} else {
  return normalFee;   // $130 (por defecto)
}
```

### Configuración de Precios

Los precios se configuran en la tabla `settings`:

- `price_monthly`: Precio regular de mensualidad (default: $130)
- `price_monthly_family`: Precio familiar de mensualidad (default: $110.50)

Estos valores se pueden modificar en `/dashboard/settings`.

### Ejemplos Prácticos

#### Ejemplo 1: Familia con 2 jugadores
- **Jugador 1** (Juan, creado primero): $130 (precio regular)
- **Jugador 2** (María, creado segundo): $110.50 (precio familiar)
- **Total mensual**: $240.50

#### Ejemplo 2: Familia con 3 jugadores
- **Jugador 1** (Pedro): $130 (precio regular)
- **Jugador 2** (Ana): $110.50 (precio familiar)
- **Jugador 3** (Luis): $110.50 (precio familiar)
- **Total mensual**: $351.00

#### Ejemplo 3: Jugador con mensualidad personalizada
- **Jugador 1** (Carlos): $130 (precio regular)
- **Jugador 2** (Sofía, `custom_monthly_fee = $100`): $100 (personalizada, no familiar)
- **Total mensual**: $230.00

#### Ejemplo 4: Familia con becado
- **Jugador 1** (Diego): $130 (precio regular)
- **Jugador 2** (Laura, status = 'Scholarship'): $0 (becado)
- **Total mensual**: $130.00

---

## Configuración de Fechas de Temporada

### Descripción General

El sistema permite definir fechas de inicio y fin de temporada que controlan cuándo se pueden generar mensualidades automáticamente. Esto es útil para:
- No generar mensualidades antes de que comience la temporada
- Detener la generación de mensualidades después de que termine la temporada
- Controlar períodos de descanso o vacaciones

### Configuración

1. **Acceder a Configuración**:
   - Ir a `/dashboard/settings`
   - Buscar la sección "📅 Configuración de Temporada"

2. **Configurar Fechas**:
   - **Fecha de Inicio**: No se generarán mensualidades antes de esta fecha
   - **Fecha de Fin**: No se generarán mensualidades después de esta fecha
   - **Valores Vacíos**: Si se dejan vacíos (cadena vacía), no hay restricción (comportamiento por defecto)

3. **Guardar Configuración**:
   - Hacer clic en "Guardar" para cada fecha
   - Los cambios se aplican inmediatamente

### Implementación Técnica

#### Función Helper: `isSeasonActive()`

```typescript
// src/lib/actions/payments.ts
export async function isSeasonActive(checkDate?: Date): Promise<boolean> {
  // Obtener fechas de temporada desde settings
  const seasonStartDate = settingsMap['season_start_date'];
  const seasonEndDate = settingsMap['season_end_date'];
  
  // Si no hay fechas configuradas (cadena vacía), temporada siempre activa
  if ((!seasonStartDate || seasonStartDate === '') && 
      (!seasonEndDate || seasonEndDate === '')) {
    return true;
  }
  
  // Verificar si la fecha está dentro del rango
  if (seasonStartDate && seasonStartDate !== '' && checkDate < seasonStartDate) {
    return false;  // Antes de inicio
  }
  
  if (seasonEndDate && seasonEndDate !== '' && checkDate > seasonEndDate) {
    return false;  // Después de fin
  }
  
  return true;  // Dentro del rango
}
```

#### Validación en Generación de Estados de Cuenta

```typescript
// src/lib/actions/monthly-statements.ts
export async function getPlayersDueForStatement() {
  // ... verificar día de pago ...
  
  // Verificar si temporada está activa
  const seasonActive = await isSeasonActive(today);
  if (!seasonActive) {
    console.log('Season is not active. Skipping statement generation.');
    return [];
  }
  
  // ... continuar con generación de estados de cuenta ...
}
```

### Comportamiento

- **Sin fechas configuradas** (cadena vacía): El sistema genera mensualidades normalmente sin restricciones
- **Solo fecha de inicio**: No se generan mensualidades antes de la fecha de inicio
- **Solo fecha de fin**: No se generan mensualidades después de la fecha de fin
- **Ambas fechas**: Solo se generan mensualidades dentro del rango configurado

### Ejemplos de Uso

#### Ejemplo 1: Temporada de Septiembre a Mayo
- **Fecha de inicio**: 2024-09-01
- **Fecha de fin**: 2025-05-31
- **Resultado**: 
  - Mensualidades generadas: Septiembre, Octubre, Noviembre, Diciembre, Enero, Febrero, Marzo, Abril, Mayo
  - Mensualidades NO generadas: Junio, Julio, Agosto

#### Ejemplo 2: Solo fecha de inicio
- **Fecha de inicio**: 2024-09-15
- **Fecha de fin**: (vacío)
- **Resultado**:
  - Mensualidades generadas desde el 15 de septiembre en adelante
  - No hay restricción de fin

#### Ejemplo 3: Sin restricciones
- **Fecha de inicio**: (vacío)
- **Fecha de fin**: (vacío)
- **Resultado**: Mensualidades generadas todos los meses sin restricción

### Migración de Base de Datos

Para agregar los settings de temporada, ejecutar:

```sql
-- migrations/add_season_dates_setting.sql
-- Note: Using empty string ('') instead of NULL because value column has NOT NULL constraint
INSERT INTO settings (key, value, description)
VALUES 
  ('season_start_date', '', 'Fecha de inicio de temporada (YYYY-MM-DD). Vacío = sin restricción'),
  ('season_end_date', '', 'Fecha de fin de temporada (YYYY-MM-DD). Vacío = sin restricción')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    description = EXCLUDED.description;
```

---

## Ejemplos Prácticos

### Escenario 1: Cargar Base de Datos con Familias

```typescript
// 1. Crear familia
const { data: family } = await supabase
  .from('families')
  .insert({
    name: 'Familia García',
    tutor_cedula: '8-1234-5678',
    tutor_name: 'Juan García',
    tutor_email: 'juan@example.com',
    tutor_phone: '+507 1234-5678'
  })
  .select()
  .single();

// 2. Crear jugadores vinculados a la familia
await supabase
  .from('players')
  .insert([
    {
      family_id: family.id,
      first_name: 'Pedro',
      last_name: 'García',
      category: 'U-12 M',
      status: 'Active'
    },
    {
      family_id: family.id,
      first_name: 'Ana',
      last_name: 'García',
      category: 'U-10 F',
      status: 'Active'
    }
  ]);

// Resultado:
// - Pedro: $130/mes (primer jugador)
// - Ana: $110.50/mes (segundo jugador)
```

### Escenario 2: Configurar Temporada 2024-2025

1. Ir a `/dashboard/settings`
2. En "Configuración de Temporada":
   - Fecha de inicio: `2024-09-01`
   - Fecha de fin: `2025-05-31`
3. Guardar ambas fechas

**Resultado**: Las mensualidades solo se generarán entre septiembre 2024 y mayo 2025.

### Escenario 3: Verificar Estado de Temporada

```typescript
import { isSeasonActive } from '@/lib/actions/payments';

// Verificar si hoy está en temporada
const active = await isSeasonActive();
console.log('Temporada activa:', active);

// Verificar fecha específica
const checkDate = new Date('2024-08-15');
const activeOnDate = await isSeasonActive(checkDate);
console.log('Temporada activa el 15 de agosto:', activeOnDate);
```

---

## Resumen

- **Grupos Familiares**: Se crean automáticamente basándose en `tutor_cedula` durante el enrollment
- **Costos Familiares**: El primer jugador paga precio regular, los siguientes precio familiar
- **Prioridad**: `custom_monthly_fee` > Scholarship > Descuento Familiar > Precio Regular
- **Fechas de Temporada**: Controlan cuándo se generan mensualidades automáticamente
- **Configuración**: Todo se gestiona desde `/dashboard/settings`

