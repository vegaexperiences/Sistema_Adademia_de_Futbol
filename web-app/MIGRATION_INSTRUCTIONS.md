# 🚀 Instrucciones de Migración Multi-Tenant

## Paso 1: Ejecutar Migraciones SQL en Supabase Dashboard

**IMPORTANTE:** Debes ejecutar estas migraciones SQL en orden en el Supabase Dashboard antes de ejecutar el script de migración de datos.

### Cómo ejecutar las migraciones SQL:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **"SQL Editor"** en el menú lateral
4. Ejecuta cada archivo SQL en este orden exacto:

#### a) Primera migración: `migrations/create_academies_and_super_admins.sql`
   - Crea las tablas `academies` y `super_admins`
   - Crea las políticas RLS básicas
   - Crea funciones y triggers

#### b) Segunda migración: `migrations/add_academy_id_to_all_tables.sql`
   - Agrega la columna `academy_id` a todas las tablas existentes
   - Crea índices para mejorar el rendimiento

#### c) Tercera migración: `migrations/migrate_existing_data_to_suarez_academy.sql`
   - Crea la academia "Suarez Academy" por defecto
   - Asigna todos los datos existentes a esta academia

#### d) Cuarta migración: `migrations/create_rls_policies.sql`
   - Crea las políticas RLS para todas las tablas
   - Asegura el aislamiento de datos entre academias

### Para ejecutar cada migración:

1. Abre el archivo SQL correspondiente en tu editor
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl+Enter`
5. Verifica que no haya errores

## Paso 2: Ejecutar Script de Migración de Datos

Una vez que hayas ejecutado todas las migraciones SQL, ejecuta el script de migración de datos:

```bash
npx tsx scripts/migrate-to-multi-tenant-auto.ts
```

Este script:
- Verifica que la academia Suarez existe
- Asigna todos los datos existentes a la academia Suarez
- Muestra un resumen de los datos migrados

## Paso 3: Crear Super Admin (Opcional)

Para crear un super admin, ejecuta:

```bash
npx tsx scripts/migrate-to-multi-tenant.ts
```

Y responde "yes" cuando se te pregunte sobre crear un super admin. Necesitarás el email del usuario que quieres convertir en super admin.

## Verificación

Después de completar todos los pasos:

1. Verifica que la academia "Suarez Academy" existe en la tabla `academies`
2. Verifica que todos los registros tienen `academy_id` asignado
3. Prueba acceder al dashboard de super admin en `/super-admin/academies`
4. Crea una nueva academia desde el dashboard para probar

## Solución de Problemas

### Error: "Could not find the table 'public.academies'"
- **Solución:** Ejecuta primero `migrations/create_academies_and_super_admins.sql`

### Error: "column academy_id does not exist"
- **Solución:** Ejecuta `migrations/add_academy_id_to_all_tables.sql`

### Error: "permission denied"
- **Solución:** Asegúrate de estar usando el Service Role Key en `.env.local`

### Los datos no se muestran después de la migración
- **Solución:** Verifica que el middleware esté funcionando correctamente y que el dominio/subdominio esté configurado

## Archivos de Migración

- `migrations/create_academies_and_super_admins.sql` - Tablas base
- `migrations/add_academy_id_to_all_tables.sql` - Agregar columnas
- `migrations/migrate_existing_data_to_suarez_academy.sql` - Migrar datos
- `migrations/create_rls_policies.sql` - Políticas de seguridad

## Scripts Disponibles

- `scripts/migrate-to-multi-tenant-auto.ts` - Migración automática de datos
- `scripts/migrate-to-multi-tenant.ts` - Migración interactiva (incluye super admin)

