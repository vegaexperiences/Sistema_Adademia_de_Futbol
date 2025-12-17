# ⚙️ Configuration Guide - Single Tenant

## Overview

After removing multi-tenant architecture, the application now requires simplified configuration. This guide covers all necessary environment variables and deployment settings.

## Environment Variables

### Required Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

### 1. Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find**:
- Supabase Dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (⚠️ Keep secret!)

### 2. Site Configuration

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_ACADEMY_NAME="SUAREZ ACADEMY"
```

**Purpose**:
- `NEXT_PUBLIC_SITE_URL`: Base URL for password reset emails, absolute links
- `NEXT_PUBLIC_ACADEMY_NAME`: Display name throughout the app

**For Local Development**:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. PagueLoFácil (Panama Payments)

```bash
PAGUELOFACIL_CGDI=your-cgdi-here
PAGUELOFACIL_SECRET_KEY=your-secret-key-here
PAGUELOFACIL_BASE_URL=https://sandbox.paguelofacil.com
```

**For Production**:
```bash
PAGUELOFACIL_BASE_URL=https://api.paguelofacil.com
```

**Where to get credentials**:
- Contact PagueLoFácil support
- Request merchant account credentials
- See `PAGUELOFACIL_SETUP.md` for detailed setup

### 4. Yappy (Panama Mobile Payments)

```bash
YAPPY_MERCHANT_ID=your-merchant-id
YAPPY_SECRET_KEY=your-yappy-secret-key
YAPPY_BASE_URL=https://api.yappy.com.pa
```

**Where to get credentials**:
- Register with Banco General as merchant
- Request Yappy API credentials
- See `YAPPY_SETUP.md` for detailed setup

### 5. Brevo (Email Service)

```bash
BREVO_API_KEY=your-brevo-api-key
BREVO_DEFAULT_SENDER_EMAIL=noreply@youracademy.com
BREVO_DEFAULT_SENDER_NAME="Your Academy Name"
```

**Setup Steps**:
1. Create account at https://www.brevo.com
2. Verify sender email domain
3. Generate API key at Settings → SMTP & API
4. See `BREVO_WEBHOOK_SETUP.md` for webhooks

### 6. Optional Feature Flags

```bash
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_ENABLE_SPONSORS=true
NEXT_PUBLIC_ENABLE_TOURNAMENTS=true
```

Use these to disable features temporarily.

## Vercel Deployment Configuration

### 1. Project Settings

In Vercel Dashboard → Project → Settings:

**Framework Preset**: Next.js
**Root Directory**: `web-app`
**Node Version**: 18.x or 20.x

### 2. Build Settings

Already configured in `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### 3. Environment Variables in Vercel

Add all variables from `.env.example` to Vercel:

1. Project Settings → Environment Variables
2. Add each variable with appropriate value
3. Select environment: Production, Preview, Development
4. Click "Add"

**Important**: 
- Use same variable names as `.env.example`
- `NEXT_PUBLIC_*` vars are exposed to browser (safe for public info)
- Others are server-only (keep secrets here)

### 4. Cron Jobs

Already configured in `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/send-monthly-statements",
    "schedule": "0 8 * * *"
  },
  {
    "path": "/api/cron/process-emails",
    "schedule": "0 9 * * *"
  }
]
```

**Schedules** (in UTC):
- Monthly statements: Daily at 8:00 AM
- Process emails: Daily at 9:00 AM

To change schedule, update `vercel.json` and redeploy.

## Local Development Setup

### 1. Install Dependencies

```bash
cd web-app
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Run Development Server

```bash
npm run dev
```

Application runs at http://localhost:3000

### 4. Testing Payments Locally

For local payment testing, you need to expose your local server:

**Option A: ngrok** (Recommended for testing)
```bash
# Install ngrok
npm install -g ngrok

# Start local server
npm run dev

# In another terminal, expose it
ngrok http 3000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Update NEXT_PUBLIC_SITE_URL in .env.local temporarily
```

**Option B: Vercel Preview Deployment**
```bash
# Push to a branch
git push origin feature-branch

# Vercel auto-deploys preview
# Use preview URL for testing
```

## Supabase Configuration

### 1. Authentication Settings

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL**: `https://your-production-domain.com`

**Redirect URLs** (add all):
```
https://your-production-domain.com/auth/callback
https://your-production-domain.com/auth/reset-password
https://preview-*.vercel.app/auth/callback
https://preview-*.vercel.app/auth/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

Use wildcards for preview deployments:
```
https://*.vercel.app/auth/callback
https://*.vercel.app/auth/reset-password
```

### 2. Email Templates

Update Supabase email templates to use your branding:

Authentication → Email Templates:
- Magic Link
- Confirm Signup  
- Reset Password
- Email Change

Replace default text with academy-specific messaging.

### 3. RLS Policies

After running migration, RLS policies are simplified to:
- Public access for enrollment forms
- Authenticated access for dashboard
- Admin role checks where needed

No more per-academy filtering!

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured in Vercel
- [ ] Supabase redirect URLs updated
- [ ] Database migration executed (see `EXECUTE_MIGRATION_SINGLE_TENANT.md`)
- [ ] Email templates updated in Supabase
- [ ] Payment provider credentials tested
- [ ] Brevo sender email verified
- [ ] Cron jobs schedule reviewed
- [ ] SSL certificate active (automatic in Vercel)
- [ ] Custom domain configured (if applicable)

## Troubleshooting

### Build Fails in Vercel

**Check**:
1. All required env vars are set
2. Node version is compatible (18.x or 20.x)
3. No TypeScript errors: `npm run build` locally
4. Dependencies are in `package.json`, not just `devDependencies`

**Common Fix**:
```bash
# Clear cache and rebuild
vercel --force
```

### Password Reset Links Don't Work

**Check**:
1. `NEXT_PUBLIC_SITE_URL` is set correctly
2. Supabase redirect URLs include your domain
3. `/auth/callback` route exists and is accessible

**See**: `PASSWORD_RESET_SETUP.md` for detailed troubleshooting

### Payments Fail

**Check**:
1. Payment provider credentials are correct
2. Using correct base URL (sandbox vs production)
3. Webhook URLs are publicly accessible
4. Test with small amount first

**See**: Provider-specific setup docs (`PAGUELOFACIL_SETUP.md`, `YAPPY_SETUP.md`)

### Email Sending Fails

**Check**:
1. Brevo API key is valid
2. Sender email is verified in Brevo
3. Not exceeding daily limits (free tier: 300/day)
4. Check Brevo dashboard for error logs

## Security Notes

⚠️ **Never commit secrets to Git**:
- `.env.local` is in `.gitignore`
- Only commit `.env.example` with placeholder values
- Use Vercel dashboard for production secrets

🔐 **Service Role Key**:
- Only use server-side (API routes, server actions)
- Never expose in client code (`NEXT_PUBLIC_*`)
- Grants full database access, bypass RLS

🌐 **CORS and API Security**:
- API routes in `/api` folder
- Middleware handles authentication
- No additional CORS configuration needed (Next.js handles it)

## Migration from Multi-Tenant

If migrating from multi-tenant version:

1. **Code**: Already refactored (FASE 2)
2. **Database**: Run migration (FASE 3)
3. **Config**: Update env vars (this guide)
4. **Test**: Verify all features work
5. **Deploy**: Follow deployment checklist

See `REFACTOR_CHECKPOINT.md` for overall migration status.

---

**Last Updated**: 2024-12-18  
**Version**: Single-Tenant v1.0  
**Next.js**: 15.x  
**Node**: 18.x / 20.x
