# Migration Standard Update Strategy

**Last Updated:** 2024-12-18  
**Purpose:** Strategy for updating existing migrations to new versioned standard

---

## Current Status

- ✅ **New migrations** (001, 002) follow the new standard
- ⚠️ **Old migrations** (70+ files) follow old standard
- 📝 **Strategy:** Update incrementally as migrations are touched

---

## New Migration Standard

All new migrations must follow this format:

```sql
-- =====================================================
-- MIGRATION: [Description]
-- Version: YYYY_MM_DD_NNN
-- File: NNN_description.sql
-- Description: [Details]
-- Idempotent: Yes/No
-- Reversible: Yes/No
-- Dependencies: [Version numbers]
-- =====================================================

BEGIN;

-- Pre-migration validation
-- Migration logic (using IF NOT EXISTS, ON CONFLICT, etc.)
-- Post-migration validation
-- Record in system_versions

COMMIT;
```

See `docs/WRITING_MIGRATIONS.md` for complete template.

---

## Update Priority

### High Priority (Update Soon)

These migrations are likely to be referenced or re-run:

1. `2024_12_18_remove_multi_tenant.sql` - Recent major migration
2. `add_late_fees_system.sql` - Recent feature addition
3. `create_sponsors_system.sql` - Recent feature addition
4. `add_sponsor_player_assignments.sql` - Recent feature addition

### Medium Priority (Update When Touched)

- Migrations from last 6 months
- Migrations that are frequently referenced
- Migrations used in setup scripts

### Low Priority (Leave As-Is)

- Historical migrations already applied
- Migrations that won't be re-run
- Deprecated migrations

---

## Update Process

### When to Update a Migration

Update a migration to new standard when:
- ✅ Migration needs to be re-run
- ✅ Migration is referenced in new code
- ✅ Migration has issues/bugs
- ✅ Migration is part of setup process

### How to Update

1. **Add Version Header**
   ```sql
   -- Version: YYYY_MM_DD_NNN (derive from filename or date)
   ```

2. **Make Idempotent**
   - Add `IF NOT EXISTS` to CREATE statements
   - Add `IF EXISTS` to DROP statements
   - Add `ON CONFLICT DO NOTHING` to INSERT statements

3. **Add Validation**
   - Pre-migration checks
   - Post-migration verification

4. **Record in system_versions**
   ```sql
   INSERT INTO system_versions (version, migration_file, description, status)
   VALUES ('YYYY_MM_DD_NNN', 'filename.sql', 'Description', 'applied')
   ON CONFLICT (version) DO NOTHING;
   ```

5. **Add Rollback Script** (if reversible)
   - Include in comments

---

## Notes on Old Migrations

### Academy ID References

Many old migrations reference `academy_id` columns. These were created during the multi-tenant era and were removed in migration `2024_12_18_remove_multi_tenant.sql`.

**Handling:**
- Old migrations that reference `academy_id` are **historical** - they've already been executed
- Don't re-run these migrations on single-tenant databases
- If updating an old migration, remove `academy_id` references

### Migration Execution History

Old migrations were executed manually via Supabase Dashboard. The `system_versions` table was created later, so old migrations aren't recorded there.

**For new deployments:**
- Run new migrations (001, 002) first
- Old migrations are already applied (historical)

---

## Incremental Update Approach

### Phase 1: New Migrations ✅

All new migrations (starting with 001, 002) follow the new standard.

### Phase 2: Critical Migrations (In Progress)

Update most recent/important migrations as needed.

### Phase 3: Full Update (Future)

Update all migrations when time permits (lower priority).

---

## Migration Runner Compatibility

The migration runner (`scripts/migrate.ts`) is designed to:
- Track versions in `system_versions` table
- Execute new-format migrations
- Skip old migrations (they're already applied)

**For now:** Manual execution via Supabase Dashboard is still the primary method. Migration runner provides version tracking.

---

## Related Documentation

- `docs/WRITING_MIGRATIONS.md` - How to write new migrations
- `docs/UPDATING_CLIENTS.md` - How to execute migrations
- `migrations/001_create_system_versioning.sql` - Versioning system
