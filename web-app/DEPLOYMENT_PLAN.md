# 🚀 Deployment Plan - Single Tenant Migration

## Overview

This document outlines the deployment strategy for migrating from multi-tenant to single-tenant architecture.

## Deployment Strategy: Blue-Green with Gradual Rollout

### Why Blue-Green?

- Minimizes risk
- Instant rollback if issues found
- Zero-downtime deployment
- Easy A/B testing

### Environments

1. **Development** (localhost) - Already tested
2. **Preview/Staging** (Vercel preview) - Test with production-like data
3. **Production** (main domain) - Final rollout

## Phase-by-Phase Deployment

### FASE 6: Pre-Deployment Cleanup ✅

**Goal**: Ensure codebase is production-ready

**Tasks**:
- [ ] Remove debug/console logs
- [ ] Remove commented-out code
- [ ] Update documentation
- [ ] Review and close TODOs in code
- [ ] Run linter: `npm run lint`
- [ ] Fix any TypeScript errors: `npm run build`

**Timeline**: 1-2 hours

---

### FASE 7: Deployment Execution 🚀

#### Step 1: Create Staging Environment

**Vercel Preview Deployment**:

```bash
# Push to a staging branch
git checkout -b staging/single-tenant
git push origin staging/single-tenant

# Vercel auto-creates preview deployment
# URL: https://sistema-futbol-[hash]-team.vercel.app
```

**Configure Staging**:
1. Add staging environment variables in Vercel
2. Create separate Supabase project for staging (recommended)
3. Run SQL migration on staging DB
4. Test thoroughly using `TESTING_CHECKLIST.md`

**Validation**:
- [ ] All tests pass
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Stakeholders approve

**Timeline**: 2-3 days for testing

---

#### Step 2: Production Database Migration

**⚠️ CRITICAL STEP - CANNOT BE EASILY REVERSED**

**Pre-Migration**:
1. Schedule maintenance window (recommended: early morning, low traffic)
2. Notify users 24-48 hours in advance
3. Create full database backup (see `EXECUTE_MIGRATION_SINGLE_TENANT.md`)
4. Verify backup is downloadable and valid

**Migration Execution**:
```bash
# 1. Put app in maintenance mode (optional but recommended)
# Create src/app/maintenance/page.tsx or use middleware

# 2. Wait for all active connections to close (1-2 minutes)

# 3. Execute SQL migration
# Via Supabase SQL Editor or psql
# File: migrations/2024_12_18_remove_multi_tenant.sql

# 4. Validate migration success
# Run validation queries from EXECUTE_MIGRATION_SINGLE_TENANT.md
```

**Duration**: 5-10 minutes  
**Downtime**: 2-5 minutes (if maintenance mode used)

---

#### Step 3: Deploy Code to Production

**Method**: Vercel Production Deployment

```bash
# Merge to main/production branch
git checkout main
git merge refactor/remove-multi-tenant
git push origin main

# Vercel auto-deploys to production
# Monitor: https://vercel.com/your-team/your-project/deployments
```

**During Deployment**:
- Monitor Vercel deployment logs
- Check for build errors
- Verify deployment completes successfully

**Post-Deployment Validation** (immediate):
1. Load homepage - should work
2. Login as admin - should work
3. View players list - should show data
4. Check Vercel logs for errors
5. Check Supabase logs for query errors

**If Deployment Fails**:
```bash
# Instant rollback via Vercel
# Dashboard → Deployments → Previous deployment → Promote to Production

# Or via CLI
vercel rollback
```

**Duration**: 2-5 minutes  
**Downtime**: ~30 seconds (during Vercel switchover)

---

#### Step 4: Post-Deployment Monitoring

**First Hour** (active monitoring):
- [ ] Dashboard accessible and functional
- [ ] No 500 errors in logs
- [ ] Payments processing correctly
- [ ] Emails sending successfully
- [ ] Check Vercel Analytics for traffic/errors
- [ ] Check Supabase Dashboard for slow queries

**First 24 Hours** (passive monitoring):
- [ ] Monitor error rates (should be < 0.1%)
- [ ] Check user feedback/support tickets
- [ ] Monitor performance metrics
- [ ] Verify cron jobs run successfully

**First Week**:
- [ ] Daily check of logs and metrics
- [ ] Address any minor issues found
- [ ] Collect user feedback
- [ ] Document any lessons learned

---

### FASE 8: Stabilization & Optimization 🔧

**Week 1-2**: Active monitoring and quick fixes

**Tasks**:
- [ ] Fix any bugs discovered post-launch
- [ ] Optimize slow queries (if any)
- [ ] Adjust cron schedules if needed
- [ ] Update documentation with real-world learnings
- [ ] Train users on any UI changes

**Performance Optimization** (if needed):
```sql
-- Add indexes for slow queries
CREATE INDEX idx_custom ON table_name(column) WHERE condition;

-- Analyze tables
ANALYZE players;
ANALYZE payments;
```

**Timeline**: Ongoing for 2 weeks

---

## Rollback Procedures

### Code Rollback (Easy)

**Via Vercel**:
1. Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"
4. Done in 30 seconds

**Via CLI**:
```bash
vercel rollback
```

### Database Rollback (HARD - Requires Backup)

**⚠️ This is why backup is CRITICAL**

**Steps**:
1. Access Supabase Dashboard
2. Settings → Backups
3. Select pre-migration backup
4. Click "Restore"
5. Wait 5-10 minutes
6. Also rollback code to multi-tenant version

**Alternative** (if backup downloaded):
```bash
# Restore from local backup
pg_restore -d "CONNECTION_STRING" backup_file.dump
```

**Note**: Any data created AFTER migration will be lost in rollback.

---

## Communication Plan

### Pre-Deployment Communication

**24-48 hours before**:
```
Subject: Scheduled Maintenance - [Date] at [Time]

Dear Users,

We will be performing system upgrades on [Date] at [Time] [Timezone].

Expected Downtime: 5-10 minutes
Affected Services: All dashboard features

The system will be inaccessible during this time. Please plan accordingly.

Thank you for your understanding.
```

### During Maintenance

**On maintenance page**:
```
🔧 System Maintenance in Progress

We're currently upgrading our systems to serve you better.

Expected completion: [Time]
Status: [Progress indicator]

Thank you for your patience!
```

### Post-Deployment Communication

**After successful deployment**:
```
Subject: System Upgrade Complete

Dear Users,

Our system upgrade has been completed successfully!

You can now access the platform as normal. If you experience any issues, please contact support.

What's New:
- Improved performance
- Enhanced reliability
- Better user experience

Thank you for your patience during the maintenance.
```

---

## Monitoring Dashboards

### Vercel Analytics
- Real-time traffic
- Error rates
- Performance metrics
- Geographic distribution

### Supabase Dashboard
- Database performance
- Query analytics
- Authentication logs
- Storage usage

### Third-Party Services
- **Brevo**: Email delivery rates
- **PagueLoFácil**: Payment success rates
- **Yappy**: Transaction volumes

---

## Success Criteria

Deployment considered successful if:

- [ ] No critical bugs for 48 hours
- [ ] Error rate < 0.5%
- [ ] Page load time < 3 seconds (p95)
- [ ] Payment success rate > 95%
- [ ] Email delivery rate > 98%
- [ ] No data integrity issues
- [ ] User satisfaction maintained
- [ ] All core features functional

---

## Escalation Plan

### Issue Severity Levels

**P0 - Critical** (site down, data loss):
- **Response**: Immediate rollback
- **Timeline**: < 15 minutes
- **Contact**: All stakeholders

**P1 - Major** (feature broken, payments failing):
- **Response**: Deploy hotfix within 1 hour
- **Timeline**: < 2 hours
- **Contact**: Dev team + Product owner

**P2 - Minor** (UI bug, non-critical feature):
- **Response**: Fix in next deployment
- **Timeline**: < 24 hours
- **Contact**: Dev team

**P3 - Trivial** (typo, minor styling):
- **Response**: Fix when convenient
- **Timeline**: < 1 week
- **Contact**: Dev team

### Contact List

**Development Team**:
- Lead Developer: [Contact]
- Backend Engineer: [Contact]
- Frontend Engineer: [Contact]

**Operations**:
- DevOps: [Contact]
- Database Admin: [Contact]

**Business**:
- Product Owner: [Contact]
- Support Team: [Contact]

---

## Post-Mortem (After 2 Weeks)

**Document**:
1. What went well?
2. What went wrong?
3. What was unexpected?
4. What would we do differently?
5. Action items for future deployments

**Share with**: All stakeholders

---

## Appendices

### A. Helpful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Rollback
vercel rollback

# Run build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### B. Emergency Contacts

**Vercel Support**: https://vercel.com/support  
**Supabase Support**: https://supabase.com/dashboard/support  
**Brevo Support**: https://www.brevo.com/support/  

---

**Last Updated**: 2024-12-18  
**Document Owner**: Development Team  
**Review Schedule**: After each major deployment
