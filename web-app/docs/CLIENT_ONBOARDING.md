# Client Onboarding Guide

**Last Updated:** 2024-12-18  
**Purpose:** Step-by-step guide to set up a new client deployment

---

## Prerequisites

Before starting, ensure you have:
- ✅ Access to Supabase (create new projects)
- ✅ Access to Vercel (create new projects)
- ✅ Client's payment provider credentials (Yappy, PagueloFácil)
- ✅ Client's email service credentials (Brevo)
- ✅ Client's domain/subdomain (optional)

---

## Step 1: Create Supabase Project

### 1.1 Create New Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: Client name (e.g., "Suarez Academy")
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to client
4. Click "Create new project"
5. Wait for project to be ready (~2 minutes)

### 1.2 Get Database Credentials

1. Go to Project Settings → API
2. Copy these values (you'll need them for Vercel):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

### 1.3 Run Initial Migrations

1. Go to SQL Editor in Supabase Dashboard
2. Run migrations in order:
   - `migrations/001_create_system_versioning.sql`
   - `migrations/002_create_feature_flags.sql`
   - All other migrations from `migrations/` directory (in order)

**Note:** See `docs/WRITING_MIGRATIONS.md` for migration execution details.

---

## Step 2: Create Vercel Project

### 2.1 Create New Project

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import repository (GitHub/GitLab/Bitbucket)
4. Select the repository and branch

### 2.2 Configure Project Settings

- **Project Name**: Client name (e.g., `client-academy`)
- **Framework Preset**: Next.js
- **Root Directory**: `web-app` (if monorepo) or `.` (if standalone)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 2.3 Add Environment Variables

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

#### Required Variables

```bash
# Database (from Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_SITE_URL=https://client-domain.com
NEXT_PUBLIC_ACADEMY_NAME="Client Academy Name"

# Email (Brevo)
BREVO_API_KEY=xkeysib-xxxxx...
BREVO_FROM_EMAIL=noreply@client-domain.com
BREVO_FROM_NAME="Client Academy Name"
```

#### Optional Variables

```bash
# Payments (if using Yappy)
YAPPY_MERCHANT_ID=xxxxx
YAPPY_SECRET_KEY=xxxxx
YAPPY_DOMAIN_URL=client-domain.com
YAPPY_ENVIRONMENT=production

# Payments (if using PagueloFácil)
PAGUELOFACIL_ACCESS_TOKEN=xxxxx
PAGUELOFACIL_CCLW=xxxxx
PAGUELOFACIL_SANDBOX=false

# Contact Info
ACADEMY_CONTACT_PHONE="+507 xxxx xxxx"
ACADEMY_CONTACT_EMAIL=info@client-domain.com

# Feature Flags (if different from defaults)
FEATURE_ENABLE_LATE_FEES=false
FEATURE_ENABLE_SPONSOR_SYSTEM=true
FEATURE_ENABLE_TOURNAMENTS=true

# Security
CRON_SECRET=your-random-secret-here
BREVO_WEBHOOK_SECRET=your-webhook-secret
```

**Important:** Set these for **Production**, **Preview**, and **Development** environments as needed.

---

## Step 3: Deploy Application

### 3.1 Initial Deployment

1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Check deployment logs for errors
4. Visit deployment URL to verify

### 3.2 Verify Deployment

1. Visit the deployment URL
2. Check that application loads
3. Verify no configuration errors in logs
4. Test login/authentication

---

## Step 4: Configure Domain (Optional)

### 4.1 Add Custom Domain

1. Go to Vercel Project → Settings → Domains
2. Add domain: `client-domain.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation

### 4.2 Update Environment Variables

After domain is configured, update:
```bash
NEXT_PUBLIC_SITE_URL=https://client-domain.com
```

Redeploy to apply changes.

---

## Step 5: Initial Database Setup

### 5.1 Create Initial Settings

Run initialization scripts (if available):

```bash
# Via Supabase SQL Editor
# Run scripts from scripts/ directory as needed
```

### 5.2 Configure Feature Flags

Set feature flags in database:

```sql
-- Enable/disable features per client
UPDATE feature_flags SET enabled = true WHERE key = 'enable_late_fees';
UPDATE feature_flags SET enabled = true WHERE key = 'enable_sponsor_system';
```

Or use environment variables (easier for initial setup).

---

## Step 6: Payment Provider Setup

### 6.1 Yappy Setup (if using)

1. Register with Banco General
2. Get merchant credentials
3. Register domain in Yappy panel
4. Add credentials to Vercel environment variables:
   - `YAPPY_MERCHANT_ID`
   - `YAPPY_SECRET_KEY`
   - `YAPPY_DOMAIN_URL`
5. Test payment flow

See `YAPPY_SETUP.md` for detailed instructions.

### 6.2 PagueloFácil Setup (if using)

1. Contact PagueloFácil support
2. Get merchant account credentials
3. Add credentials to Vercel environment variables:
   - `PAGUELOFACIL_ACCESS_TOKEN`
   - `PAGUELOFACIL_CCLW`
   - `PAGUELOFACIL_SANDBOX` (false for production)
4. Test payment flow

See `PAGUELOFACIL_SETUP.md` for detailed instructions.

---

## Step 7: Email Service Setup

### 7.1 Brevo Configuration

1. Create Brevo account (if needed)
2. Get API key from Brevo dashboard
3. Add to Vercel:
   - `BREVO_API_KEY`
   - `BREVO_FROM_EMAIL`
   - `BREVO_FROM_NAME`

### 7.2 Configure Webhook (Optional)

1. In Brevo dashboard, set webhook URL:
   - `https://client-domain.com/api/webhooks/brevo`
2. Add webhook secret to Vercel:
   - `BREVO_WEBHOOK_SECRET`

---

## Step 8: Create Initial Admin User

### 8.1 Sign Up

1. Visit deployment URL
2. Click "Sign Up"
3. Create admin account with email

### 8.2 Grant Admin Role

Run in Supabase SQL Editor:

```sql
-- Get user ID from auth.users table first
-- Then assign admin role
INSERT INTO user_role_assignments (user_id, role_id)
SELECT 
  'USER_ID_HERE',
  id
FROM user_roles
WHERE name = 'admin';
```

---

## Step 9: Verification Checklist

Verify the following:

- [ ] Application loads at deployment URL
- [ ] Can log in with admin account
- [ ] Database migrations all applied
- [ ] Feature flags configured correctly
- [ ] Payment provider works (if configured)
- [ ] Email sending works
- [ ] Custom domain configured (if applicable)
- [ ] Environment variables all set correctly
- [ ] No errors in Vercel logs
- [ ] No errors in Supabase logs

---

## Step 10: Handoff Documentation

Provide client with:

1. **Login Credentials**: Admin email/password
2. **Dashboard URL**: `https://client-domain.com/dashboard`
3. **Support Contact**: Your support email
4. **Documentation**: User guides, feature documentation

---

## Troubleshooting

### Common Issues

**Issue:** Application shows configuration errors  
**Solution:** Check all required environment variables are set in Vercel

**Issue:** Database connection fails  
**Solution:** Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

**Issue:** Payments not working  
**Solution:** Check payment provider credentials and domain configuration

**Issue:** Emails not sending  
**Solution:** Verify `BREVO_API_KEY` and `BREVO_FROM_EMAIL` are set

**Issue:** Feature not appearing  
**Solution:** Check feature flag in database or environment variable

---

## Post-Onboarding

After onboarding:

1. **Monitor** first few days for issues
2. **Collect feedback** from client
3. **Document** client-specific configurations
4. **Schedule** regular check-ins

---

## Related Documentation

- `docs/ARCHITECTURE.md` - Architecture overview
- `docs/ENVIRONMENT_VARIABLES.md` - Complete env var reference
- `docs/UPDATING_CLIENTS.md` - How to update client deployments
- `YAPPY_SETUP.md` - Yappy payment setup
- `PAGUELOFACIL_SETUP.md` - PagueloFácil payment setup
