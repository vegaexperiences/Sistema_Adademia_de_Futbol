# Client Update Guide

**Last Updated:** 2024-12-18  
**Purpose:** Safe procedures for updating client deployments

---

## Overview

This guide covers procedures for updating client deployments safely, including:
- Code updates (deployments)
- Database migrations
- Configuration updates
- Rollback procedures

---

## Update Types

### 1. Code Updates (No Database Changes)

**When:** Bug fixes, UI improvements, feature additions (no schema changes)

**Procedure:**
1. Merge changes to main branch
2. Vercel automatically deploys to production
3. Verify deployment is healthy
4. Monitor for issues

**Risk Level:** Low  
**Rollback:** Revert deployment in Vercel dashboard

### 2. Database Migrations (Schema Changes)

**When:** New tables, columns, indexes, or data transformations

**Procedure:**
1. **Pre-Update Validation**
   ```bash
   tsx scripts/validate-before-update.ts
   ```

2. **Create Backup**
   ```bash
   tsx scripts/backup-before-migration.ts
   ```
   Or manually via Supabase Dashboard

3. **Run Migrations**
   - Execute SQL files in Supabase Dashboard SQL Editor
   - Or use migration runner (future): `tsx scripts/migrate.ts`

4. **Post-Update Verification**
   ```bash
   tsx scripts/verify-after-migration.ts --expected-version YYYY_MM_DD_NNN
   ```

5. **Deploy Code** (if code changes included)
   - Vercel automatically deploys

**Risk Level:** Medium to High  
**Rollback:** Restore from backup + revert code deployment

### 3. Configuration Updates

**When:** Changing environment variables, feature flags

**Procedure:**
1. Update environment variables in Vercel
2. Redeploy application (or wait for auto-deploy)
3. Verify configuration is applied
4. Test affected features

**Risk Level:** Low to Medium  
**Rollback:** Revert environment variable changes

---

## Detailed Procedures

### Code Update Procedure

#### Step 1: Prepare Update

1. Ensure changes are tested locally
2. Code review completed
3. Merge to main branch

#### Step 2: Deploy

1. Vercel automatically deploys on merge (if connected to Git)
2. Or manually trigger deployment in Vercel dashboard
3. Monitor build logs for errors

#### Step 3: Verify

1. Visit deployment URL
2. Test critical user flows
3. Check error logs in Vercel
4. Monitor for 15-30 minutes

#### Step 4: Rollback (if needed)

1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "Promote to Production"
4. Verify rollback successful

---

### Database Migration Procedure

#### Pre-Migration Checklist

- [ ] Migration tested on development/staging database
- [ ] Backup created
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Rollback plan documented
- [ ] Client notified of maintenance window (if needed)

#### Step 1: Pre-Update Validation

```bash
tsx scripts/validate-before-update.ts
```

**Checks:**
- Configuration valid
- Database connection healthy
- Database fingerprint matches
- Backup exists

**If validation fails:** Fix issues before proceeding

#### Step 2: Create Backup

**Option A: Automated (Recommended)**

```bash
tsx scripts/backup-before-migration.ts
```

**Option B: Manual**

1. Go to Supabase Dashboard
2. Project Settings → Database → Backups
3. Click "Create backup" → "Manual backup"
4. Wait for completion
5. Download backup file (optional, for local storage)

#### Step 3: Execute Migration

**Option A: Supabase Dashboard (Current Method)**

1. Go to Supabase Dashboard → SQL Editor
2. Open migration file
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run" or press Ctrl+Enter
6. Verify "Success" message
7. Check for errors in output

**Option B: Migration Runner (Future)**

```bash
# Dry run first
tsx scripts/migrate.ts --dry-run

# Execute
tsx scripts/migrate.ts
```

#### Step 4: Post-Update Verification

```bash
tsx scripts/verify-after-migration.ts --expected-version 2024_12_18_001
```

**Checks:**
- Database version matches expected
- Data integrity checks pass
- Critical queries work
- RLS policies active

#### Step 5: Monitor

- Monitor application logs for 1-2 hours
- Check error rates
- Verify user reports
- Test critical features

---

### Rollback Procedure

#### Code Rollback

1. **Immediate Rollback (Vercel)**
   - Go to Deployments
   - Promote previous deployment to production
   - Usually completes in 1-2 minutes

2. **Git Rollback (Permanent)**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
   - Vercel will redeploy automatically

#### Database Migration Rollback

**⚠️ WARNING: Only if migration is reversible**

1. **Check Migration Status**
   ```sql
   SELECT * FROM system_versions 
   WHERE version = 'YYYY_MM_DD_NNN' 
   ORDER BY applied_at DESC;
   ```

2. **Restore from Backup**
   - Go to Supabase Dashboard
   - Settings → Database → Backups
   - Select backup from before migration
   - Click "Restore"
   - Wait for completion

3. **Verify Restoration**
   ```bash
   tsx scripts/verify-after-migration.ts
   ```

4. **Update system_versions**
   ```sql
   UPDATE system_versions 
   SET status = 'rolled_back' 
   WHERE version = 'YYYY_MM_DD_NNN';
   ```

**Note:** Not all migrations are reversible. Check migration documentation.

---

## Update Communication

### Before Update

Notify client if:
- ⚠️ Maintenance window required
- ⚠️ Downtime expected
- ⚠️ Breaking changes
- ⚠️ User action required

### After Update

Confirm:
- ✅ Update completed successfully
- ✅ No issues detected
- ✅ New features available (if applicable)

---

## Semi-Automatic Updates

### CI/CD Integration

For automated deployments with approval gates:

1. **Pull Request** → Automated tests run
2. **Merge to Main** → Staging deployment
3. **Approval** → Production deployment
4. **Migrations** → Manual execution (safety)

### Update Workflow

```
Developer → PR → Review → Merge → Auto-Deploy (Code)
                                    ↓
                           Manual Migration (if needed)
                                    ↓
                           Verification → Complete
```

---

## Emergency Procedures

### If Update Fails

1. **Immediate:** Rollback code deployment
2. **Assess:** Check error logs
3. **Database:** Check migration status
4. **Restore:** Use backup if needed
5. **Communicate:** Notify client of issue

### If Database is Corrupted

1. **Stop:** All application traffic (if possible)
2. **Assess:** Determine corruption extent
3. **Restore:** Use most recent backup
4. **Verify:** Run verification scripts
5. **Investigate:** Root cause analysis

---

## Testing Updates

### Before Production

1. **Local Testing**
   - Test on local database
   - Verify all features work

2. **Staging Testing** (if available)
   - Deploy to staging environment
   - Run full test suite
   - Manual testing

3. **Migration Testing**
   - Test migration on copy of production data
   - Verify data integrity
   - Check performance impact

### After Production

1. **Smoke Tests**
   - Login/logout
   - Critical user flows
   - Payment processing (if applicable)

2. **Monitoring**
   - Error rates
   - Response times
   - Database query performance

---

## Update Frequency

### Recommended Schedule

- **Critical Fixes:** Immediately
- **Security Updates:** Within 24 hours
- **Feature Updates:** Weekly/Bi-weekly
- **Major Releases:** Monthly/Quarterly

### Per-Client Customization

Each client can have different update schedules:
- Some clients prefer frequent updates
- Others prefer stable, infrequent updates
- Coordinate with client on update timing

---

## Update Records

### Tracking Updates

Maintain records of:
- Update date/time
- Migration versions applied
- Configuration changes
- Issues encountered
- Rollback events

### Documentation

Document:
- What changed
- Why it changed
- Impact on users
- Known issues

---

## Best Practices

1. **Always backup** before migrations
2. **Test first** on development/staging
3. **Validate** before and after
4. **Monitor** after deployment
5. **Communicate** with clients
6. **Document** all changes
7. **Have rollback plan** ready

---

## Related Documentation

- `docs/ARCHITECTURE.md` - Architecture overview
- `docs/WRITING_MIGRATIONS.md` - Migration authoring guide
- `docs/CLIENT_ONBOARDING.md` - Client setup guide
- `docs/ENVIRONMENT_VARIABLES.md` - Configuration reference
