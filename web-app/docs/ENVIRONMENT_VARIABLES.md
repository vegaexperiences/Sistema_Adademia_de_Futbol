# Environment Variables Specification

**Last Updated:** 2024-12-18  
**Architecture:** Single-Tenant Replicable

This document provides a complete specification of all environment variables used in the application, organized by category and priority.

---

## Required Variables

These variables **must** be set for the application to function.

### Database Configuration

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | string (secret) | Supabase service role key for admin operations | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**Where to find:**
- Supabase Dashboard → Project Settings → API

**Security Notes:**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - keep secret, never expose to client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (used client-side)

---

## Application Configuration

### Site Settings

| Variable | Type | Required | Description | Default | Example |
|----------|------|----------|-------------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | string | Yes | Base URL for absolute links, password reset emails | - | `https://yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | string | No | Alternative to SITE_URL, used for callbacks | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_ACADEMY_NAME` | string | No | Display name throughout the app | `"Academia"` | `"SUAREZ ACADEMY"` |
| `NEXT_PUBLIC_ACADEMY_LOGO` | string | No | Logo URL path | `"/logo.png"` | `"/logo.png"` |
| `NEXT_PUBLIC_LOGO_URL` | string | No | Alternative logo URL | `NEXT_PUBLIC_ACADEMY_LOGO` | `"/logo.png"` |

**Note:** `VERCEL_URL` is automatically used as fallback in production if other URL vars are not set.

---

## Email Service (Brevo)

### Required

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `BREVO_API_KEY` | string (secret) | Brevo API key for sending emails | `xkeysib-xxxxx...` |
| `BREVO_FROM_EMAIL` | string | Default sender email address | `noreply@youracademy.com` |
| `BREVO_FROM_NAME` | string | Default sender name | `"Academia"` |

### Optional

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `BREVO_WEBHOOK_SECRET` | string (secret) | Secret for validating Brevo webhooks | `null` (validation skipped) |
| `BREVO_DEFAULT_SENDER_EMAIL` | string | Alternative name for FROM_EMAIL | `BREVO_FROM_EMAIL` |
| `BREVO_DEFAULT_SENDER_NAME` | string | Alternative name for FROM_NAME | `BREVO_FROM_NAME` |

**Where to find:**
- Brevo Dashboard → Settings → API Keys

---

## Payment Providers

### Yappy (Panama Mobile Payments)

| Variable | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `YAPPY_MERCHANT_ID` | string | Conditional* | Yappy merchant ID | `352eef93-b7d9-445b-a584-...` |
| `YAPPY_SECRET_KEY` | string (secret) | Conditional* | Yappy secret key | `WVBfOTA1RUZDQjUt...` |
| `YAPPY_DOMAIN_URL` | string | Conditional* | Domain registered in Yappy panel | `yourdomain.com` |
| `YAPPY_ENVIRONMENT` | enum | No | Environment: `production` or `testing` | `production` |

*Required only if using Yappy payments. If not set, Yappy features are disabled.

**Where to get:**
- Register with Banco General as merchant
- Request Yappy API credentials
- See `YAPPY_SETUP.md` for detailed setup

**Notes:**
- `YAPPY_DOMAIN_URL` can include or exclude `https://` - code handles both
- Domain must be registered in Yappy merchant panel

### PagueloFácil (Panama Payments)

| Variable | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `PAGUELOFACIL_ACCESS_TOKEN` | string (secret) | Conditional* | PagueloFácil API access token | `eyJhbGciOiJIUzI1NiIs...` |
| `PAGUELOFACIL_CCLW` | string (secret) | Conditional* | PagueloFácil CCLW code (128+ hex chars) | `a1b2c3d4e5f6...` |
| `PAGUELOFACIL_SANDBOX` | boolean | No | Enable sandbox mode | `false` |

*Required only if using PagueloFácil payments. If not set, PagueloFácil features are disabled.

**Where to get:**
- Contact PagueloFácil support
- Request merchant account credentials
- See `PAGUELOFACIL_SETUP.md` for detailed setup

**Notes:**
- CCLW should be 128+ hexadecimal characters
- Sandbox URLs: `https://sandbox.paguelofacil.com`
- Production URLs: `https://secure.paguelofacil.com`

---

## Contact Information

| Variable | Type | Required | Description | Default | Example |
|----------|------|----------|-------------|---------|---------|
| `ACADEMY_CONTACT_PHONE` | string | No | Contact phone number | `""` | `"60368042"` |
| `ACADEMY_CONTACT_EMAIL` | string | No | Contact email address | `""` | `"info@suarezacademy.com"` |

Used in email templates and contact forms.

---

## Cron Jobs

| Variable | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `CRON_SECRET` | string (secret) | No | Secret for protecting cron endpoints | `your-secret-here` |

**Note:** If not set, cron endpoints are unprotected (not recommended for production).

---

## Runtime Configuration

| Variable | Type | Required | Description | Default |
|----------|------|----------|-------------|---------|
| `NODE_ENV` | enum | No | Runtime environment | `development` |
| `VERCEL_URL` | string | Auto-set | Vercel deployment URL (auto-set by Vercel) | - |

**Note:** `NODE_ENV` is automatically set by Next.js/Vercel. Manual override not recommended.

---

## Deprecated / Legacy Variables

These variables may still be referenced but are deprecated:

| Variable | Status | Replacement | Notes |
|----------|--------|-------------|-------|
| `PAGUELOFACIL_CGDI` | Deprecated | `PAGUELOFACIL_ACCESS_TOKEN` | Old API format |
| `PAGUELOFACIL_SECRET_KEY` | Deprecated | `PAGUELOFACIL_CCLW` | Old API format |
| `PAGUELOFACIL_BASE_URL` | Deprecated | Auto-detected from `PAGUELOFACIL_SANDBOX` | No longer needed |
| `YAPPY_BASE_URL` | Deprecated | Hardcoded to `https://api.yappy.com.pa` | No longer configurable |
| `RESEND_WEBHOOK_SECRET` | Deprecated | Migrated to Brevo | Only used in legacy webhook handler |

---

## Configuration Risks & Hardcoded Values

### ⚠️ Hardcoded Values Found

**Location:** `YAPPY_SETUP.md`  
**Issue:** Contains actual credentials (merchant ID, secret key)  
**Action Required:** Remove actual credentials from documentation, use placeholders

**Location:** Various payment service files  
**Issue:** Hardcoded fallback URLs (sandbox.paguelofacil.com, api.yappy.com.pa)  
**Risk Level:** Low (expected behavior, but should be documented)

**Location:** `src/lib/utils/academy-stub.ts`, `src/components/layout/*`  
**Issue:** Hardcoded default values ("Academia", "/logo.png")  
**Risk Level:** Low (acceptable defaults, but should use config)

### ⚠️ Shared State Risks

**No shared state detected** - All configuration is per-instance via environment variables.

### ⚠️ Global Configuration Risks

**Risk:** Direct `process.env.*` access throughout codebase (114 instances)  
**Mitigation:** Phase 2 will centralize via configuration abstraction layer

**Risk:** Environment variable validation happens at module load time  
**Mitigation:** Will be enhanced with Zod schema validation

---

## Validation Rules

### Development Environment
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Missing optional vars: Warning logged, app continues
- Payment providers: Optional, features disabled if not configured

### Production Environment
- Required vars: All required vars must be set
- Missing required vars: Application fails to start with clear error
- Missing optional vars: Warning logged, affected features disabled

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use secret management** services (Vercel Environment Variables, AWS Secrets Manager)
3. **Rotate secrets** periodically, especially payment provider keys
4. **Use separate projects** for each client (isolated databases)
5. **Validate webhooks** using secrets (BREVO_WEBHOOK_SECRET, CRON_SECRET)
6. **Monitor access logs** for unusual patterns

---

## Per-Client Configuration

For multi-client deployments, each Vercel project should have:

1. **Separate Supabase project** (isolated database)
2. **Unique environment variables** (per-client credentials)
3. **Separate payment provider accounts** (recommended, or shared with proper tracking)
4. **Unique domain/subdomain** (for URL-based configuration)

**Example per-client setup:**
```
Client 1 (Suarez Academy):
  - NEXT_PUBLIC_SUPABASE_URL: https://client1-project.supabase.co
  - NEXT_PUBLIC_SITE_URL: https://suarez.academy.com
  - YAPPY_MERCHANT_ID: client1-merchant-id
  - ... (all other vars)

Client 2 (Other Academy):
  - NEXT_PUBLIC_SUPABASE_URL: https://client2-project.supabase.co
  - NEXT_PUBLIC_SITE_URL: https://other.academy.com
  - YAPPY_MERCHANT_ID: client2-merchant-id
  - ... (all other vars)
```

---

## Environment Variable Checklist

### For New Client Setup

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_ACADEMY_NAME`
- [ ] `BREVO_API_KEY`
- [ ] `BREVO_FROM_EMAIL`
- [ ] `BREVO_FROM_NAME`
- [ ] (Optional) `YAPPY_MERCHANT_ID` + `YAPPY_SECRET_KEY` + `YAPPY_DOMAIN_URL`
- [ ] (Optional) `PAGUELOFACIL_ACCESS_TOKEN` + `PAGUELOFACIL_CCLW`
- [ ] (Optional) `ACADEMY_CONTACT_PHONE`
- [ ] (Optional) `ACADEMY_CONTACT_EMAIL`
- [ ] (Recommended) `CRON_SECRET`

---

## Related Documentation

- `CONFIGURATION_GUIDE.md` - General configuration guide
- `YAPPY_SETUP.md` - Yappy payment setup
- `PAGUELOFACIL_SETUP.md` - PagueloFácil payment setup
- `docs/ARCHITECTURE.md` - Architecture overview
- `docs/CLIENT_ONBOARDING.md` - Client onboarding guide
