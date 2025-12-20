# Architecture Documentation

**Last Updated:** 2024-12-18  
**Architecture Model:** Single-Tenant Replicable

---

## Overview

This application follows a **single-tenant replicable** architecture, where:

- **One codebase** is deployed multiple times
- **Each deployment** connects to its own isolated database
- **Each client** has their own Vercel project and Supabase project
- **Configuration** is isolated per deployment via environment variables
- **Updates** are versioned and can be applied per client independently

This architecture provides:
- ✅ Complete data isolation between clients
- ✅ Independent scaling and updates per client
- ✅ No shared state or cross-client data leakage risks
- ✅ Professional, enterprise-grade deployment model

---

## Deployment Model

### Per-Client Deployment Structure

```
Codebase (Shared)
├── Client 1 Deployment
│   ├── Vercel Project: client1-academy
│   ├── Supabase Project: client1-db
│   └── Environment Variables: client1.env
│
├── Client 2 Deployment
│   ├── Vercel Project: client2-academy
│   ├── Supabase Project: client2-db
│   └── Environment Variables: client2.env
│
└── Client N Deployment
    ├── Vercel Project: clientN-academy
    ├── Supabase Project: clientN-db
    └── Environment Variables: clientN.env
```

### Isolation Guarantees

1. **Database Isolation**: Each client has a separate Supabase project (separate PostgreSQL database)
2. **Configuration Isolation**: Environment variables are per Vercel project
3. **Code Isolation**: Same codebase, but runtime configuration differs
4. **No Shared State**: Zero risk of data leakage between clients

---

## Configuration Management

### Centralized Configuration Layer

All configuration is accessed through `src/lib/config/client-config.ts`:

```typescript
import { getDatabaseConfig, getYappyConfig, getBrevoConfig } from '@/lib/config/client-config';

// Database config
const dbConfig = getDatabaseConfig();

// Payment config
const yappyConfig = getYappyConfig(); // Throws if not configured

// Email config
const brevoConfig = getBrevoConfig();
```

### Configuration Sources

1. **Environment Variables** (Primary source)
   - Loaded from `.env.local` (development) or Vercel Environment Variables (production)
   - Validated on application startup
   - Type-safe access via configuration layer

2. **Database Configuration** (Future)
   - Feature flags stored in `feature_flags` table
   - Can override environment variables per client
   - Useful for enabling/disabling features without redeployment

### Configuration Validation

Configuration is validated using Zod schemas:
- Required variables must be present in production
- Optional variables have sensible defaults
- Type checking ensures correct usage
- Clear error messages guide setup

---

## Database Versioning System

### Migration Tracking

All database migrations are tracked in the `system_versions` table:

```sql
CREATE TABLE system_versions (
  version TEXT PRIMARY KEY,          -- e.g., "2024_12_18_001"
  migration_file TEXT NOT NULL,      -- e.g., "001_create_system_versioning.sql"
  description TEXT,
  applied_at TIMESTAMPTZ,
  checksum TEXT,                     -- SHA256 for integrity
  status TEXT DEFAULT 'applied',     -- 'applied', 'rolled_back', 'failed'
  ...
);
```

### Migration Standards

All migrations must:
1. **Be idempotent**: Can be run multiple times safely
2. **Have version numbers**: Format: `YYYY_MM_DD_NNN` or `NNN_description`
3. **Include metadata**: Description, dependencies, reversibility
4. **Record themselves**: Insert into `system_versions` at end

### Migration Execution

Migrations are executed via:
1. **Manual**: Supabase Dashboard SQL Editor (current method)
2. **Automated**: `scripts/migrate.ts` (future - tracks versions)

**Safety Features:**
- Database fingerprinting prevents wrong-database execution
- Checksum validation ensures migration files haven't changed
- Pre-flight checks validate configuration and backups
- Rollback support (for reversible migrations)

---

## Feature Flag System

### Database-Based Flags

Feature flags are stored in the `feature_flags` table:

```sql
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,              -- e.g., "enable_late_fees"
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  environment_override JSONB,        -- Per-environment overrides
  ...
);
```

### Usage Pattern

```typescript
import { getFeatureFlag, isLateFeesEnabled } from '@/lib/config/feature-flags';

// Check flag
if (await getFeatureFlag('enable_late_fees')) {
  // Feature logic
}

// Convenience function
if (await isLateFeesEnabled()) {
  // Late fees logic
}
```

### Priority

1. **Database flags** (highest priority)
2. **Environment variables** (fallback)
3. **Default values** (lowest priority)

### Benefits

- Enable/disable features per client without code changes
- Gradual feature rollouts
- A/B testing capabilities
- Emergency feature toggles

---

## Database Fingerprinting

### Purpose

Prevents accidental operations on wrong databases (critical for multi-client deployments).

### Implementation

Fingerprint is generated from:
- Supabase project URL (always unique)
- First user ID (stable identifier)
- First record timestamp (stable identifier)

Fingerprint is stored and validated before:
- Running migrations
- Applying updates
- Performing destructive operations

### Usage

```typescript
import { validateDatabaseFingerprint } from '@/lib/config/database-fingerprint';

const validation = await validateDatabaseFingerprint();
if (!validation.valid) {
  throw new Error('Wrong database detected!');
}
```

---

## Update Pipeline

### Pre-Update Validation

Run `scripts/validate-before-update.ts` to check:
- ✅ Configuration validity
- ✅ Database connection health
- ✅ Database fingerprint match
- ✅ Backup existence

### Backup Hook

Run `scripts/backup-before-migration.ts` to:
- Create Supabase backup (manual or automated)
- Store backup metadata
- Enable rollback if needed

### Migration Execution

1. **Manual Method** (Current):
   - Execute SQL in Supabase Dashboard
   - Track versions manually (future: automatic)

2. **Automated Method** (Future):
   ```bash
   tsx scripts/migrate.ts --dry-run  # Preview
   tsx scripts/migrate.ts             # Execute
   ```

### Post-Update Verification

Run `scripts/verify-after-migration.ts` to verify:
- ✅ Database version matches expected
- ✅ Data integrity checks pass
- ✅ Critical queries work
- ✅ RLS policies active

---

## Code Structure

### Key Directories

```
src/
├── lib/
│   ├── config/              # Configuration management
│   │   ├── client-config.ts      # Centralized config loader
│   │   ├── feature-flags.ts      # Feature flag manager
│   │   └── database-fingerprint.ts # Database fingerprinting
│   ├── supabase/            # Database clients
│   │   ├── server.ts             # Server-side client (uses config)
│   │   └── client.ts             # Browser client (uses config)
│   ├── payments/            # Payment services
│   │   ├── yappy.ts              # Yappy integration (uses config)
│   │   └── paguelofacil.ts       # PagueloFácil integration (uses config)
│   └── brevo/               # Email service
│       └── client.ts             # Brevo client (uses config)
└── ...

scripts/
├── migrate.ts               # Migration runner
├── backup-before-migration.ts  # Backup hook
├── validate-before-update.ts   # Pre-update validation
└── verify-after-migration.ts   # Post-update verification

migrations/
├── 001_create_system_versioning.sql
├── 002_create_feature_flags.sql
└── ... (all migrations)
```

### Configuration Flow

```
Environment Variables
        ↓
client-config.ts (validates & loads)
        ↓
Service Modules (getYappyConfig, getBrevoConfig, etc.)
        ↓
Application Code
```

---

## Safety Guards

### Database Fingerprinting

**Prevents:** Running migrations on wrong database

**Implementation:**
- Unique fingerprint per database
- Validated before migrations
- Stored in `settings` table or `system_versions`

### Migration Checksums

**Prevents:** Modified migrations being applied incorrectly

**Implementation:**
- SHA256 hash of migration file
- Stored in `system_versions.checksum`
- Validated before execution

### Pre-Flight Checks

**Prevents:** Running updates in invalid state

**Checks:**
- Configuration valid
- Database connection healthy
- Backup exists
- Fingerprint matches

### Transaction-Wrapped Migrations

**Prevents:** Partial migrations leaving database inconsistent

**Implementation:**
- Migrations wrapped in `BEGIN`/`COMMIT`
- Rollback on error
- Status tracked in `system_versions`

---

## Deployment Isolation

### Per-Client Isolation

Each client deployment is completely isolated:

1. **Separate Vercel Project**
   - Independent deployments
   - Separate environment variables
   - Independent scaling

2. **Separate Supabase Project**
   - Separate PostgreSQL database
   - Separate auth users
   - Separate storage buckets
   - No cross-client data access possible

3. **Separate Configuration**
   - Environment variables per project
   - Feature flags per database
   - Payment credentials per client

### Zero Shared State

- ❌ No shared databases
- ❌ No shared configuration
- ❌ No shared cache
- ❌ No shared sessions
- ✅ Complete isolation

---

## Update Strategy

### Independent Updates

Each client can be updated independently:

1. **Code Updates**: Deploy to client's Vercel project
2. **Migration Updates**: Run migrations on client's database
3. **Feature Rollouts**: Enable features via feature flags per client

### Versioning Strategy

- **Code Version**: Git tags, Vercel deployments
- **Database Version**: `system_versions` table
- **Migration Version**: Format `YYYY_MM_DD_NNN`

### Rollback Strategy

1. **Code Rollback**: Revert Vercel deployment
2. **Migration Rollback**: Restore from backup + re-apply previous migrations
3. **Feature Rollback**: Disable feature flag

---

## Security Considerations

### Data Isolation

- ✅ Separate databases (no SQL injection can access other clients' data)
- ✅ Separate auth (no cross-client user access)
- ✅ Separate storage (no file access across clients)

### Configuration Security

- ✅ Secrets in environment variables (never in code)
- ✅ Service role keys never exposed to client
- ✅ Webhook secrets validated

### Migration Security

- ✅ Fingerprinting prevents wrong-database operations
- ✅ Checksums prevent tampering
- ✅ Transaction wrapping prevents partial updates

---

## Scalability

### Horizontal Scaling

- Each client deployment scales independently
- No shared bottlenecks
- Client-specific performance tuning

### Database Scaling

- Each Supabase project scales independently
- No cross-client query contention
- Client-specific database optimization

---

## Related Documentation

- `docs/ENVIRONMENT_VARIABLES.md` - Complete environment variable specification
- `docs/CLIENT_ONBOARDING.md` - Step-by-step client setup guide
- `docs/UPDATING_CLIENTS.md` - Update and migration procedures
- `docs/WRITING_MIGRATIONS.md` - Migration authoring guide
