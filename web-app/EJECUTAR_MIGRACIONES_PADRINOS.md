# 🚀 Ejecutar Migraciones del Sistema de Padrinos

## ⚠️ IMPORTANTE: Ejecutar en Supabase Dashboard

Las migraciones SQL deben ejecutarse manualmente en el Supabase Dashboard SQL Editor.

---

## 📋 Paso 1: Ejecutar Migración de Sistema de Padrinos

### Instrucciones:

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **"SQL Editor"** (en el menú lateral izquierdo)
4. Haz clic en **"New query"**

### Ejecuta esta migración PRIMERO:

#### ✅ Migración 1: `create_sponsors_system.sql`

1. Abre el archivo: `migrations/create_sponsors_system.sql`
2. **Copia TODO el contenido** (desde la línea 1 hasta el final)
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
5. Verifica que aparezca "Success" sin errores

Esta migración crea:
- Tabla `sponsors` (niveles de padrinazgo)
- Tabla `sponsor_registrations` (registros de padrinos)
- Actualiza la tabla `payments` para soportar pagos de padrinos
- Crea índices y políticas RLS

---

## 📋 Paso 2: Ejecutar Migración de Asignaciones de Jugadores

### Ejecuta esta migración SEGUNDO:

#### ✅ Migración 2: `add_sponsor_player_assignments.sql`

1. Abre el archivo: `migrations/add_sponsor_player_assignments.sql`
2. **Copia TODO el contenido** (desde la línea 1 hasta el final)
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
5. Verifica que aparezca "Success" sin errores

Esta migración crea:
- Tabla `sponsor_player_assignments` (asignaciones de jugadores a padrinos)
- Índices para mejor rendimiento
- Políticas RLS para seguridad

---

## ✅ Verificación

Después de ejecutar ambas migraciones, puedes verificar que las tablas se crearon correctamente ejecutando:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sponsors', 'sponsor_registrations', 'sponsor_player_assignments');
```

Deberías ver las 3 tablas listadas.

---

## ❌ Si hay errores

Si encuentras algún error al ejecutar las migraciones:

1. **Error de constraint**: Puede que ya existan algunas columnas o constraints. Las migraciones usan `IF NOT EXISTS` y `DROP CONSTRAINT IF EXISTS`, así que deberían ser seguras de ejecutar múltiples veces.

2. **Error de función**: Si hay un error relacionado con `update_sponsors_updated_at()` o `update_updated_at_column()`, las migraciones crean estas funciones automáticamente.

3. **Error de RLS**: Si hay problemas con las políticas RLS, verifica que estés ejecutando las migraciones como un usuario con permisos suficientes.

---

---

## 📋 Paso 3: Ejecutar Seeding de Niveles Iniciales (Opcional pero Recomendado)

### Ejecuta esta migración TERCERO (opcional):

#### ✅ Migración 3: `seed_sponsor_levels.sql`

Esta migración crea automáticamente los 3 niveles de padrinazgo iniciales:
- **PADRINO GOLD** ($1,500 anual)
- **PADRINO PLATA** ($1,000 anual)
- **PADRINO BRONCE** ($500 anual)

1. Abre el archivo: `migrations/seed_sponsor_levels.sql`
2. **Copia TODO el contenido** (desde la línea 1 hasta el final)
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
5. Verifica que aparezca "Success" sin errores

**Nota**: Esta migración es segura de ejecutar múltiples veces - no creará duplicados si los niveles ya existen.

---

## 🎉 Después de ejecutar las migraciones

Una vez que todas las migraciones se ejecuten exitosamente:

1. La página `/sponsors` mostrará los 3 niveles de padrinazgo (si ejecutaste el seeding)
2. La sección "Gestión de Padrinos" en Configuraciones debería funcionar
3. Podrás crear, editar y gestionar niveles de padrinazgo
4. Podrás asignar jugadores a padrinos desde el tab "Registros de Padrinos"

