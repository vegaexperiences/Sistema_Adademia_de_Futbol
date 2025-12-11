# 🚀 Cómo Ejecutar las Migraciones

## ⚠️ IMPORTANTE: Dos Tipos de Archivos

1. **Archivos `.sql`** → Se ejecutan en **Supabase Dashboard** (SQL Editor)
2. **Archivos `.ts`** → Se ejecutan con `npx tsx` en la terminal

---

## 📋 Paso 1: Ejecutar Migraciones SQL en Supabase Dashboard

### Instrucciones:

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **"SQL Editor"** (en el menú lateral izquierdo)
4. Haz clic en **"New query"**

### Ejecuta estas migraciones EN ORDEN:

#### ✅ Migración 1: `create_academies_and_super_admins.sql`

1. Abre el archivo: `migrations/create_academies_and_super_admins.sql`
2. **Copia TODO el contenido** (desde la línea 1 hasta el final)
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
5. Verifica que aparezca "Success" sin errores

#### ✅ Migración 2: `add_academy_id_to_all_tables.sql`

1. Abre el archivo: `migrations/add_academy_id_to_all_tables.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"**
5. Verifica que aparezca "Success"

#### ✅ Migración 3: `migrate_existing_data_to_suarez_academy.sql`

1. Abre el archivo: `migrations/migrate_existing_data_to_suarez_academy.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"**
5. Verifica que aparezca "Success"

#### ✅ Migración 4: `create_rls_policies.sql`

1. Abre el archivo: `migrations/create_rls_policies.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"**
5. Verifica que aparezca "Success"

---

## 📋 Paso 2: Ejecutar Script de Migración de Datos (Terminal)

**SOLO después** de ejecutar las 4 migraciones SQL anteriores, ejecuta en la terminal:

```bash
npx tsx scripts/migrate-to-multi-tenant-auto.ts
```

Este script verificará que todo esté correcto y migrará los datos.

---

## ❌ Errores Comunes

### Error: "syntax error at or near #!/"
- **Causa:** Estás intentando ejecutar un archivo `.ts` como SQL
- **Solución:** Los archivos `.ts` NO se ejecutan en Supabase Dashboard. Solo los archivos `.sql`

### Error: "Could not find the table 'public.academies'"
- **Causa:** No ejecutaste la primera migración SQL
- **Solución:** Ejecuta primero `create_academies_and_super_admins.sql` en Supabase Dashboard

### Error: "column academy_id does not exist"
- **Causa:** No ejecutaste la segunda migración SQL
- **Solución:** Ejecuta `add_academy_id_to_all_tables.sql` en Supabase Dashboard

---

## ✅ Verificación

Después de ejecutar todo, verifica:

1. Ve a Supabase Dashboard → Table Editor
2. Deberías ver la tabla `academies` con una fila "Suarez Academy"
3. Las tablas `families`, `players`, `payments`, etc. deberían tener la columna `academy_id`
4. Ejecuta en terminal: `npx tsx scripts/migrate-to-multi-tenant-auto.ts` y debería funcionar sin errores

