# Análisis: Eliminación de Multi-Tenant

**Fecha**: 2024-12-18
**Rama**: refactor/remove-multi-tenant
**Backup**: backup/pre-remove-multitenant

## ⚠️ ACCIÓN MANUAL REQUERIDA

**CRÍTICO**: Antes de ejecutar migraciones SQL, debes crear backup de Supabase:
1. Supabase Dashboard → Database → Backups
2. Crear backup manual: `pre-single-tenant-2024-12-18`
3. Exportar esquema SQL completo
4. Exportar datos de tablas críticas

## Academia Principal Identificada

**URL**: sistema-adademia-de-futbol-tura.vercel.app

**Acción necesaria**: Obtener `academy_id` de base de datos ejecutando:
```sql
SELECT id, name, slug, domain FROM academies 
WHERE domain LIKE '%adademia-de-futbol-tura%' 
   OR slug = 'suarez'
LIMIT 5;
```

## Alcance del Refactor

### Estadísticas
- **898 referencias** a `academy_id/academyId` en **81 archivos**
- **315 referencias** a `academies` en **49 archivos**

### Archivos Multi-Tenant Principales

#### Middleware y Core
- `src/middleware.ts` (314 líneas) - Detección de academy por dominio
- `src/lib/supabase/server.ts` - RLS context setting
- `src/contexts/AcademyContext.tsx` - React context provider

#### Utils (7 archivos a eliminar)
- `src/lib/utils/academy.ts`
- `src/lib/utils/academy-client.ts`
- `src/lib/utils/academy-logos.ts`
- `src/lib/utils/academy-branding.ts`
- `src/lib/utils/academy-types.ts`
- `src/lib/utils/academy-payments.ts`
- `src/lib/brevo/academy-client.ts`

#### Actions (Server Actions)
Todos los archivos en `src/lib/actions/` con referencias a `academy_id`:
- academies.ts (ELIMINAR COMPLETO)
- super-admin.ts (ELIMINAR COMPLETO)
- players.ts (REFACTOR)
- tutors.ts (REFACTOR)
- families.ts (REFACTOR)
- payments.ts (REFACTOR)
- transactions.ts (REFACTOR)
- sponsors.ts (REFACTOR)
- email-queue.ts (REFACTOR)
- financial-reports.ts (REFACTOR)
- okrs.ts (REFACTOR)
- monthly-charges.ts (REFACTOR)
- late-fees.ts (REFACTOR)
- users.ts (REFACTOR)
- permissions.ts (REFACTOR)
- approvals.ts (REFACTOR)
- enrollment.ts (REFACTOR)

#### Components Super Admin (ELIMINAR COMPLETAMENTE)
- `src/components/super-admin/` (todo el directorio)
- `src/app/super-admin/` (todo el directorio)

#### Components Settings
- `src/components/settings/AcademySettingsSelector.tsx` (ELIMINAR)
- `src/app/dashboard/settings/page.tsx` (MODIFICAR - remover secciones super admin)

#### API Routes
- `src/app/api/academy/` (ELIMINAR directorio completo)
- Payment callbacks: Remover validación de academy_id
- Webhooks: Simplificar sin academy context

### Tablas de Base de Datos con academy_id

Tablas que requieren eliminación de columna `academy_id`:
1. players
2. tutors
3. families
4. payments
5. transactions
6. sponsors
7. sponsor_registrations
8. sponsor_player_assignments
9. email_queue
10. user_role_assignments
11. okrs
12. financial_reports
13. monthly_charges
14. late_fees
15. expense_categories
16. recurring_expenses
17. staff_members
18. staff_payments
19. tournaments

### Políticas RLS a Reescribir

Todas las políticas RLS que usan:
```sql
academy_id = current_setting('app.academy_id')::uuid
```

Deben cambiarse a políticas simples basadas en autenticación:
```sql
TO authenticated USING (true)
```

### Funciones SQL a Eliminar

- `set_academy_context(uuid)` - Función RLS que establece el contexto

### Migraciones SQL a Crear

**Nueva migración**: `migrations/2024_12_18_remove_multi_tenant.sql`

Estructura propuesta:
1. Backup temporal de datos importantes
2. Drop foreign keys relacionadas a academy_id
3. Drop columnas academy_id de todas las tablas
4. Drop tabla academies CASCADE
5. Drop tabla super_admins CASCADE
6. Drop función set_academy_context
7. Recrear políticas RLS sin academy filters
8. Cleanup e índices

## Estrategia de Implementación

### Orden Recomendado

1. **Fase 2: Capa de Aplicación** (TypeScript/React) - PRIMERO
   - Modificar código para no usar academy_id
   - Eliminar archivos de academy utils
   - Simplificar middleware
   - Actualizar actions

2. **Fase 3: Base de Datos** (SQL) - DESPUÉS
   - Ejecutar migraciones SQL
   - Eliminar columnas y tablas
   - Actualizar RLS policies

3. **Fase 5: Testing** - VALIDACIÓN
   - Testing exhaustivo antes de deploy

**Razón**: Es más seguro tener código que ignora academy_id pero la columna existe, que tener código que espera academy_id pero la columna ya no existe.

## Riesgos Identificados

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Pérdida de datos | CRÍTICO | Múltiples backups, testing en preview |
| RLS breaks completamente | ALTO | Políticas RLS bien testeadas |
| Payment gateway failures | CRÍTICO | Validar integraciones antes de prod |
| Downtime prolongado | ALTO | Migración SQL optimizada |

## Próximos Pasos

1. ✅ FASE 0: Backup completado (Git - Supabase pendiente manual)
2. 🔄 FASE 1: Análisis en progreso
3. ⏳ FASE 2: Refactor capa aplicación
4. ⏳ FASE 3: Migraciones SQL
5. ⏳ FASE 4: Configuración
6. ⏳ FASE 5: Testing
7. ⏳ FASE 6: Limpieza
8. ⏳ FASE 7: Deployment
9. ⏳ FASE 8: Monitoring

---

**Generado**: 2024-12-18
**Última actualización**: En progreso


