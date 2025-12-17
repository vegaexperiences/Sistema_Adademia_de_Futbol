# 🗄️ Ejecutar Migración Single-Tenant

Este documento explica cómo ejecutar la migración SQL que convierte la base de datos de multi-tenant a single-tenant.

## ⚠️ ADVERTENCIAS CRÍTICAS

1. **ESTA ES UNA MIGRACIÓN DESTRUCTIVA** - Elimina columnas y tablas permanentemente
2. **NO HAY ROLLBACK AUTOMÁTICO** - Solo puedes restaurar desde backup
3. **BACKUP ES OBLIGATORIO** - Crea backup completo ANTES de ejecutar
4. **PRUEBA PRIMERO EN DEV/STAGING** - Nunca ejecutes directamente en producción

## 📋 Pre-requisitos

- [ ] Código refactoreado deployado y funcionando (FASE 2 completa)
- [ ] Backup de Supabase creado (ver paso 1)
- [ ] Acceso a Supabase SQL Editor o psql
- [ ] Ventana de mantenimiento programada (estimado: 5-10 minutos de downtime)

## 🔄 Pasos de Ejecución

### 1. Crear Backup Completo de Supabase

**Opción A: Via Supabase Dashboard** (RECOMENDADO)
1. Ir a https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/general
2. Sección "Backups"
3. Click "Create backup" → "Manual backup"
4. Esperar confirmación (puede tomar 5-15 minutos)
5. Descargar backup para guardar localmente

**Opción B: Via CLI** (si tienes acceso)
```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Crear backup
supabase db dump -f backup_pre_single_tenant_$(date +%Y%m%d_%H%M%S).sql

# Verificar que el archivo se creó
ls -lh backup_pre_single_tenant_*.sql
```

### 2. Verificar Estado Actual

Ejecuta este query en Supabase SQL Editor para ver el estado actual:

```sql
-- Contar tablas con academy_id
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'academy_id'
ORDER BY table_name;

-- Debería retornar ~22 filas
```

### 3. Poner Aplicación en Modo Mantenimiento (OPCIONAL)

Si quieres evitar que usuarios accedan durante la migración:

**Opción A: Vercel**
```bash
# Desactivar temporalmente el deployment
vercel --prod --force

# O crear una página de mantenimiento temporal
```

**Opción B: Redirect en middleware**
```typescript
// src/middleware.ts - agregar al inicio
export async function middleware(request: NextRequest) {
  return NextResponse.json(
    { message: 'Sistema en mantenimiento. Volveremos pronto.' },
    { status: 503 }
  );
}
```

### 4. Ejecutar Migración SQL

**Via Supabase SQL Editor:**

1. Abrir https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Copiar TODO el contenido de `migrations/2024_12_18_remove_multi_tenant.sql`
3. Pegar en el editor
4. ⚠️ **VERIFICAR UNA VEZ MÁS QUE TIENES BACKUP**
5. Click "Run"
6. Esperar a que complete (debería tomar 30-60 segundos)
7. Verificar que muestra "SUCCESS: All academy_id columns have been removed"

**Via psql (si tienes acceso directo):**

```bash
# Obtener connection string de Supabase Dashboard
# Settings → Database → Connection string

# Ejecutar migración
psql "YOUR_CONNECTION_STRING" -f migrations/2024_12_18_remove_multi_tenant.sql

# Debería ver:
# BEGIN
# DROP POLICY
# ... (muchas líneas)
# NOTICE:  SUCCESS: All academy_id columns have been removed
# COMMIT
```

### 5. Validar Migración

Ejecuta estos queries de validación:

```sql
-- 1. Verificar que NO quedan columnas academy_id
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'academy_id';
-- Debe retornar 0 filas

-- 2. Verificar que tablas multi-tenant fueron eliminadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('academies', 'super_admins');
-- Debe retornar 0 filas

-- 3. Verificar que hay datos (no se perdió nada)
SELECT 'players' as table_name, COUNT(*) as count FROM players
UNION ALL
SELECT 'families', COUNT(*) FROM families
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;
-- Debe mostrar conteos > 0 si tenías datos

-- 4. Verificar nuevas RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Authenticated%'
ORDER BY tablename;
-- Debe mostrar las nuevas policies simplificadas
```

### 6. Probar Aplicación

1. Acceder a la aplicación
2. Login como usuario admin
3. Verificar que puedes:
   - [ ] Ver lista de jugadores
   - [ ] Ver lista de familias
   - [ ] Ver pagos y transacciones
   - [ ] Crear un nuevo jugador
   - [ ] Acceder a configuración
   - [ ] Gestionar usuarios y roles

### 7. Quitar Modo Mantenimiento

```bash
# Vercel
vercel --prod

# O revertir cambios en middleware
```

### 8. Monitoreo Post-Migración

Monitor por 24-48 horas:
- Logs de errores en Vercel
- Queries lentos en Supabase
- Reports de usuarios

## 🐛 Troubleshooting

### Error: "permission denied for table X"

**Causa**: RLS policies demasiado restrictivas

**Solución**:
```sql
-- Temporalmente deshabilitar RLS en la tabla problemática
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;

-- Luego re-crear policy correcta
```

### Error: "column academy_id does not exist"

**Causa**: Código aún referencia academy_id (refactor incompleto)

**Solución**:
```bash
# Buscar referencias restantes
grep -r "academy_id\|academyId" src/

# Fix y redeploy código
```

### Queries muy lentos después de migración

**Causa**: Índices eliminados

**Solución**:
```sql
-- Crear índices específicos para queries frecuentes
CREATE INDEX idx_payments_player_date ON payments(player_id, created_at);
CREATE INDEX idx_transactions_date ON transactions(created_at DESC);
```

### Datos perdidos / Tablas vacías

**Causa**: Migración corrupta o ejecutada en BD incorrecta

**Solución**: **RESTORE FROM BACKUP IMMEDIATELY**
```bash
# Via Supabase Dashboard
# Project Settings → Backups → Select backup → Restore

# O via psql
pg_restore -d database_url backup_file.dump
```

## 🔙 Rollback Completo

Si algo sale muy mal:

### Via Supabase Dashboard
1. Project Settings → Backups
2. Seleccionar backup pre-migración
3. Click "Restore"
4. Esperar 5-10 minutos
5. Verificar que datos están intactos

### Via psql
```bash
# Restore desde dump
pg_restore -d "YOUR_CONNECTION_STRING" -c backup_pre_single_tenant_YYYYMMDD.sql

# -c flag limpia la BD primero
```

⚠️ **IMPORTANTE**: Si haces rollback, también debes revertir el código:
```bash
git checkout dev
vercel --prod
```

## ✅ Checklist Final

- [ ] Backup creado y verificado
- [ ] Migración ejecutada sin errores
- [ ] Validación SQL pasada (0 academy_id columns)
- [ ] Aplicación funciona correctamente
- [ ] Usuarios pueden hacer operaciones normales
- [ ] No hay errores críticos en logs
- [ ] Documentar en changelog

## 📞 Contacto en Emergencia

Si encuentras problemas críticos:
1. Revertir deployment inmediatamente
2. Poner aplicación en modo mantenimiento
3. Restaurar backup
4. Documentar el error
5. NO intentar fix manual sin backup

---

**Última actualización**: 2024-12-18  
**Archivo de migración**: `migrations/2024_12_18_remove_multi_tenant.sql`  
**Tiempo estimado**: 5-10 minutos  
**Downtime estimado**: 2-5 minutos
