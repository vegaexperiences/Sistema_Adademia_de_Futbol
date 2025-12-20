# Migration Authoring Guide

**Last Updated:** 2024-12-18  
**Purpose:** Guide for writing safe, idempotent, versioned migrations

---

## Migration Standards

### File Naming Convention

**Format:** `NNN_description.sql` or `YYYY_MM_DD_NNN_description.sql`

**Examples:**
- `001_create_system_versioning.sql`
- `002_create_feature_flags.sql`
- `2024_12_18_003_add_user_avatar_column.sql`

**Rules:**
- Use sequential numbers (001, 002, 003...)
- Or use date + sequence (2024_12_18_001)
- Use descriptive names
- Use lowercase with underscores

### Version Number Format

**Format:** `YYYY_MM_DD_NNN` or `NNN`

**Examples:**
- `2024_12_18_001`
- `2024_12_18_002`
- `001`
- `002`

---

## Migration Template

```sql
-- =====================================================
-- MIGRATION: [Brief Description]
-- Version: YYYY_MM_DD_NNN (e.g., 2024_12_18_003)
-- File: NNN_description.sql
-- Description: [Detailed description of what this migration does]
-- Idempotent: Yes/No
-- Reversible: Yes/No (if Yes, include rollback section)
-- Dependencies: [List version numbers, e.g., 2024_12_18_001, 2024_12_18_002]
-- =====================================================

BEGIN;

-- =====================================================
-- PRE-MIGRATION VALIDATION
-- =====================================================

DO $$
BEGIN
  -- Check dependencies
  IF NOT EXISTS (
    SELECT 1 FROM system_versions 
    WHERE version IN ('2024_12_18_001', '2024_12_18_002')
    AND status = 'applied'
  ) THEN
    RAISE EXCEPTION 'Missing required migrations. Please run dependencies first.';
  END IF;

  -- Check current state (if applicable)
  -- Example: Check if column already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    RAISE NOTICE 'Column users.avatar_url already exists - migration may have been applied';
  END IF;
END $$;

-- =====================================================
-- MIGRATION LOGIC
-- =====================================================

-- Example: Add column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Example: Create index
CREATE INDEX IF NOT EXISTS idx_users_avatar_url 
ON users(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Example: Insert data
INSERT INTO settings (key, value, description)
VALUES ('avatar_storage_enabled', 'true', 'Enable user avatar uploads')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- POST-MIGRATION VALIDATION
-- =====================================================

DO $$
BEGIN
  -- Verify migration succeeded
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    RAISE EXCEPTION 'Migration failed: column not created';
  END IF;
END $$;

-- =====================================================
-- RECORD MIGRATION
-- =====================================================

INSERT INTO system_versions (
  version,
  migration_file,
  description,
  checksum,
  status
)
VALUES (
  '2024_12_18_003',
  '003_add_user_avatar_column.sql',
  'Add avatar_url column to users table',
  NULL,  -- Will be calculated by migration runner
  'applied'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =====================================================
-- ROLLBACK SCRIPT (if Reversible: Yes)
-- =====================================================
-- To rollback this migration, execute:
--
-- BEGIN;
--   ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
--   DROP INDEX IF EXISTS idx_users_avatar_url;
--   DELETE FROM settings WHERE key = 'avatar_storage_enabled';
--   UPDATE system_versions SET status = 'rolled_back' WHERE version = '2024_12_18_003';
-- COMMIT;
```

---

## Idempotency

### Making Migrations Idempotent

**Critical Rule:** Migrations must be safe to run multiple times.

#### Use IF NOT EXISTS / IF EXISTS

```sql
-- ✅ GOOD: Idempotent
CREATE TABLE IF NOT EXISTS users (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ❌ BAD: Not idempotent
CREATE TABLE users (...);  -- Fails if table exists
ALTER TABLE users ADD COLUMN avatar_url TEXT;  -- Fails if column exists
```

#### Use ON CONFLICT

```sql
-- ✅ GOOD: Idempotent
INSERT INTO settings (key, value)
VALUES ('setting_key', 'value')
ON CONFLICT (key) DO NOTHING;

-- Or update if exists:
INSERT INTO settings (key, value)
VALUES ('setting_key', 'value')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

#### Check Before Drop

```sql
-- ✅ GOOD: Idempotent
DROP TABLE IF EXISTS old_table;
DROP INDEX IF EXISTS idx_old_index;
DROP POLICY IF EXISTS "Old Policy" ON table_name;

-- ❌ BAD: Not idempotent
DROP TABLE old_table;  -- Fails if table doesn't exist
```

---

## Dependency Management

### Declaring Dependencies

Always check that required migrations have been applied:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM system_versions 
    WHERE version = '2024_12_18_001'
    AND status = 'applied'
  ) THEN
    RAISE EXCEPTION 'Migration 2024_12_18_001 must be applied first';
  END IF;
END $$;
```

### Dependency Chains

Document dependencies in migration header:
```sql
-- Dependencies: 2024_12_18_001, 2024_12_18_002
```

---

## Reversibility

### Making Migrations Reversible

**Not all migrations are reversible.** Destructive operations (dropping columns with data) cannot be fully reversed.

#### Reversible Operations

- ✅ Adding columns (can drop)
- ✅ Creating indexes (can drop)
- ✅ Adding constraints (can drop)
- ✅ Inserting default data (can delete)

#### Irreversible Operations

- ❌ Dropping columns with data
- ❌ Changing column types (data conversion)
- ❌ Removing constraints (data may violate)

### Rollback Script Format

Include rollback SQL in migration comments:

```sql
-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- BEGIN;
--   ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
--   UPDATE system_versions SET status = 'rolled_back' WHERE version = '2024_12_18_003';
-- COMMIT;
```

---

## Common Patterns

### Adding a Column

```sql
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT default_value;

CREATE INDEX IF NOT EXISTS idx_table_column 
ON table_name(column_name);
```

### Creating a Table

```sql
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_table_name ON table_name(name);
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Adding RLS Policy

```sql
CREATE POLICY IF NOT EXISTS "Policy name"
ON table_name
FOR SELECT
TO authenticated
USING (true);
```

### Data Migration

```sql
-- Migrate data safely
UPDATE table_name
SET new_column = old_column
WHERE new_column IS NULL
AND old_column IS NOT NULL;
```

---

## Testing Migrations

### Local Testing

1. **Create Test Database**
   ```bash
   # Use Supabase local or separate test project
   ```

2. **Run Migration**
   - Execute in test database
   - Verify results

3. **Test Idempotency**
   - Run migration again
   - Should complete without errors

4. **Test Rollback** (if applicable)
   - Execute rollback script
   - Verify database state

### Staging Testing

1. Run on staging database (copy of production)
2. Verify application works
3. Test performance impact
4. Check for data issues

---

## Best Practices

### DO

✅ Always use `IF NOT EXISTS` / `IF EXISTS`  
✅ Always use `ON CONFLICT` for inserts  
✅ Always wrap in `BEGIN` / `COMMIT`  
✅ Always validate before and after  
✅ Always record in `system_versions`  
✅ Always document dependencies  
✅ Always test idempotency  
✅ Always include rollback script (if reversible)

### DON'T

❌ Don't use `DROP` without `IF EXISTS`  
❌ Don't skip validation  
❌ Don't forget to record in `system_versions`  
❌ Don't make assumptions about current state  
❌ Don't run destructive migrations without backup  
❌ Don't skip dependency checks

---

## Migration Checklist

Before submitting a migration:

- [ ] File named correctly (`NNN_description.sql`)
- [ ] Version number in header matches filename
- [ ] Migration is idempotent
- [ ] Dependencies declared and checked
- [ ] Pre-migration validation included
- [ ] Post-migration validation included
- [ ] Recorded in `system_versions`
- [ ] Rollback script included (if reversible)
- [ ] Tested locally
- [ ] Tested idempotency (run twice)
- [ ] Tested on staging (if available)
- [ ] Documentation updated

---

## Examples

### Example 1: Simple Column Addition

```sql
-- =====================================================
-- MIGRATION: Add email_verified column to users
-- Version: 2024_12_18_004
-- File: 004_add_email_verified_column.sql
-- Description: Adds email_verified boolean column to users table
-- Idempotent: Yes
-- Reversible: Yes
-- Dependencies: None
-- =====================================================

BEGIN;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_verified
ON users(email_verified)
WHERE email_verified = false;

INSERT INTO system_versions (version, migration_file, description, status)
VALUES ('2024_12_18_004', '004_add_email_verified_column.sql', 
        'Add email_verified column to users table', 'applied')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK: ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
```

### Example 2: Table Creation with RLS

```sql
-- =====================================================
-- MIGRATION: Create notifications table
-- Version: 2024_12_18_005
-- File: 005_create_notifications_table.sql
-- Description: Creates notifications table for user notifications
-- Idempotent: Yes
-- Reversible: Yes
-- Dependencies: None
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

INSERT INTO system_versions (version, migration_file, description, status)
VALUES ('2024_12_18_005', '005_create_notifications_table.sql',
        'Create notifications table with RLS', 'applied')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK: DROP TABLE IF EXISTS notifications;
```

---

## Related Documentation

- `docs/ARCHITECTURE.md` - Architecture overview
- `docs/UPDATING_CLIENTS.md` - Update procedures
- `migrations/001_create_system_versioning.sql` - Versioning system migration
