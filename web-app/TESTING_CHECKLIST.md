# 🧪 Testing Checklist - Single Tenant Migration

This checklist covers all testing required after migrating from multi-tenant to single-tenant architecture.

## Pre-Testing Requirements

- [ ] Code refactor completed and deployed (FASE 2)
- [ ] SQL migration executed successfully (FASE 3)
- [ ] Configuration updated (FASE 4)
- [ ] Test environment matches production setup
- [ ] Test database has representative data

## Testing Phases

### Phase A: Database Validation ✅

Execute immediately after running SQL migration.

#### A1. Schema Validation

```sql
-- ✅ Verify NO academy_id columns remain
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'academy_id';
-- Expected: 0 rows

-- ✅ Verify multi-tenant tables dropped
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('academies', 'super_admins');
-- Expected: 0 rows

-- ✅ Verify data integrity (no data lost)
SELECT 
  (SELECT COUNT(*) FROM players) as players_count,
  (SELECT COUNT(*) FROM families) as families_count,
  (SELECT COUNT(*) FROM payments) as payments_count,
  (SELECT COUNT(*) FROM transactions) as transactions_count,
  (SELECT COUNT(*) FROM user_role_assignments) as roles_count;
-- Expected: All counts > 0 (if you had data before)
```

#### A2. RLS Policy Validation

```sql
-- ✅ Check new simplified policies exist
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Authenticated%'
ORDER BY tablename, policyname;
-- Expected: Multiple rows with new single-tenant policies

-- ✅ Verify no academy_id references in policies
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual::text LIKE '%academy_id%';
-- Expected: 0 rows
```

#### A3. Index Validation

```sql
-- ✅ Check indexes are optimized
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
-- Review: Should see new indexes like idx_players_status, idx_payments_player_id
```

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase B: Authentication & Authorization 🔐

#### B1. Login & Session Management

- [ ] Login with admin user succeeds
- [ ] Login with regular user succeeds
- [ ] Session persists across page refreshes
- [ ] Logout works correctly
- [ ] Invalid credentials show error message

#### B2. Password Reset Flow

- [ ] Request password reset sends email
- [ ] Password reset link works (not localhost in production)
- [ ] Reset password successfully
- [ ] Login with new password works
- [ ] Expired reset link shows proper error

**Test with**: Admin account, Regular user account  
**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### B3. Role-Based Access

- [ ] Admin can access all sections
- [ ] Staff cannot access admin-only sections (e.g., User Management)
- [ ] Unauthenticated users redirected to login
- [ ] Public enrollment form accessible without login
- [ ] Payment portal accessible without login

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase C: Core Features - Players & Families 👥

#### C1. Players Management

- [ ] View players list (loads without errors)
- [ ] Players display correct data (name, category, status)
- [ ] Search/filter players works
- [ ] Create new player succeeds
- [ ] Edit existing player succeeds
- [ ] Player details page shows all info
- [ ] Retire player (status → Rejected) works
- [ ] Cannot delete player (only retire)

**Test Data**:
- Active player
- Rejected player
- Player with family
- Player without family

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### C2. Families Management

- [ ] View families list
- [ ] Families show member count correctly
- [ ] Only families with 2+ approved players show
- [ ] Create new family succeeds
- [ ] Edit family (tutor info) succeeds
- [ ] Link player to family works
- [ ] Family discount calculates correctly

**Test Data**:
- Family with 2 players
- Family with 3+ players
- Family with mixed statuses (1 Active, 1 Rejected)

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase D: Financial Features 💰

#### D1. Payments & Transactions

- [ ] View all payments (no filters by academy)
- [ ] Payment details show correct info
- [ ] Payment statuses update correctly
- [ ] Manual payment entry works
- [ ] Payment confirmation sends email
- [ ] Transaction history shows all entries
- [ ] Balance calculations accurate

**Test Cases**:
1. Pending payment
2. Completed payment
3. Failed payment
4. Refund/adjustment transaction

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### D2. PagueLoFácil Integration

**Prerequisites**: 
- Valid merchant credentials
- Sandbox OR production mode

Tests:
- [ ] Create payment link succeeds
- [ ] Redirect to PagueLoFácil works
- [ ] Successful payment callback updates status
- [ ] Failed payment shows error to user
- [ ] 3DS authentication works (if enabled)
- [ ] Payment appears in transactions

**Test with**: Small amount ($1-5)  
**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### D3. Yappy Integration

**Prerequisites**:
- Valid Yappy merchant ID
- Yappy app installed on test phone

Tests:
- [ ] Generate Yappy payment QR
- [ ] Scan QR with Yappy app
- [ ] Complete payment in Yappy
- [ ] Callback updates payment status
- [ ] Payment confirmation email sent

**Test with**: Small amount ($1-5)  
**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### D4. Staff & Expenses

- [ ] View staff list
- [ ] Add new staff member
- [ ] Record staff payment
- [ ] Add expense (one-time)
- [ ] Add recurring expense
- [ ] Expense categories work
- [ ] Financial summary calculates correctly
- [ ] Income vs expense chart renders

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase E: Communication Features 📧

#### E1. Email Queue

- [ ] View email queue (pending/sent)
- [ ] Send test email succeeds
- [ ] Email status updates correctly
- [ ] Failed emails show error reason
- [ ] Retry failed email works
- [ ] Email templates load correctly

**Test with**: Your own email address  
**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### E2. Email Notifications

Trigger these events and verify emails are sent:

- [ ] Player accepted → welcome email
- [ ] Monthly payment reminder
- [ ] Payment received confirmation
- [ ] Password reset email
- [ ] Player rejected notification

**Check**:
- Email received in inbox
- Correct recipient
- Proper branding/formatting
- Links work (especially password reset)

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### E3. Brevo Integration

- [ ] Check Brevo dashboard shows sent emails
- [ ] No excessive failures/bounces
- [ ] Webhook events logged (if configured)
- [ ] Under daily send limit

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase F: Enrollment & Public Features 🌐

#### F1. Public Enrollment Form

**Test as unauthenticated user**:

- [ ] Form loads without login
- [ ] All fields render correctly
- [ ] File upload works (cedula, player photo)
- [ ] Form validation shows errors
- [ ] Submit succeeds
- [ ] Confirmation email sent
- [ ] Application appears in "Pending Players"

**Test Cases**:
1. Complete valid form
2. Missing required fields
3. Invalid file type
4. Large file (>5MB)

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### F2. Payment Portal

**Test as unauthenticated user** (using payment link):

- [ ] Open payment link (/pay/[playerId])
- [ ] Shows correct player info
- [ ] Shows pending payments
- [ ] Can select payment method
- [ ] Payment process works
- [ ] Success page shows confirmation

**Test with**: 
- Active player with pending payment
- Multiple pending payments

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### F3. Sponsor Registration

**Test as public user**:

- [ ] Sponsor form loads
- [ ] Can select player to sponsor
- [ ] Submit registration succeeds
- [ ] Admin sees pending sponsor request
- [ ] Admin can approve/reject sponsor

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase G: Administrative Features ⚙️

#### G1. User Management

**As admin**:

- [ ] View all users
- [ ] Create new user (manual)
- [ ] Assign role to user
- [ ] Remove role from user
- [ ] Reset user password
- [ ] Delete user (if implemented)

**Test with**: 
- Create test user
- Assign "staff" role
- Login as that user
- Verify permissions

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### G2. Settings Management

- [ ] View settings page
- [ ] Update general settings
- [ ] Late fee configuration works
- [ ] OKR settings update correctly
- [ ] Changes persist after refresh

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### G3. Reports Dashboard

- [ ] KPI cards show data
- [ ] Financial charts render
- [ ] Date range filters work
- [ ] Export to Excel works
- [ ] Business projection calculates

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase H: Performance & Edge Cases 🚀

#### H1. Performance

- [ ] Initial page load < 3 seconds
- [ ] Subsequent navigations < 1 second
- [ ] Large lists (100+ items) load quickly
- [ ] Search/filter is responsive
- [ ] No console errors in browser
- [ ] No memory leaks (check DevTools)

**Test with**: 
- Large dataset (100+ players, payments)
- Slow 3G network simulation

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### H2. Edge Cases

- [ ] Empty states show helpful messages
  - No players yet
  - No payments yet
  - No pending approvals
- [ ] Long names/text don't break layout
- [ ] Special characters in names work (ñ, á, etc.)
- [ ] Very old dates don't cause errors
- [ ] Null/undefined data handled gracefully

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### H3. Mobile Responsive

Test on actual mobile device or Chrome DevTools:

- [ ] Navigation hamburger menu works
- [ ] Tables scroll horizontally
- [ ] Forms usable on mobile
- [ ] Buttons large enough to tap
- [ ] Text readable (not too small)
- [ ] Images scale correctly

**Test on**:
- Phone (iOS/Android)
- Tablet
- Desktop (1920x1080)

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase I: Cron Jobs & Background Tasks ⏰

#### I1. Monthly Statement Cron

**Manual trigger** (if testing before schedule):

```bash
# Via API call
curl -X GET https://your-domain.com/api/cron/send-monthly-statements \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Verify:
- [ ] Cron job runs without errors
- [ ] Statements generated for all active players
- [ ] Emails queued/sent
- [ ] Check logs for any failures

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### I2. Email Processing Cron

- [ ] Processes queued emails
- [ ] Updates statuses correctly
- [ ] Retries failed emails
- [ ] Logs errors properly

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

### Phase J: Security & Error Handling 🔒

#### J1. Security

- [ ] SQL injection attempts fail safely
- [ ] XSS attempts sanitized
- [ ] Unauthorized API calls rejected (401)
- [ ] Service role key not exposed in client
- [ ] Sensitive data not in console logs
- [ ] HTTPS enforced (production)

**Test**:
- Try SQL injection in search fields
- Try XSS in text inputs
- Call API routes without auth

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

#### J2. Error Handling

- [ ] 404 page for invalid routes
- [ ] 500 error shows user-friendly message
- [ ] Network errors show retry option
- [ ] Form validation errors clear
- [ ] Toast notifications for success/error

**Test by**:
- Navigating to /invalid-route
- Disconnecting internet mid-operation
- Submitting invalid form data

**Results**: □ Pass / □ Fail  
**Notes**: _________________________________

---

## Final Checklist ✅

Before marking testing as complete:

- [ ] All critical paths tested (A-J)
- [ ] No blocking bugs found
- [ ] Performance acceptable
- [ ] Mobile experience good
- [ ] Security validated
- [ ] Documentation updated with any issues
- [ ] Test results documented
- [ ] Stakeholders approve for production

## Known Issues / Limitations

Document any known issues discovered during testing:

1. _________________________________
2. _________________________________
3. _________________________________

## Testing Summary

**Date**: _________________  
**Tester**: _________________  
**Environment**: □ Development / □ Staging / □ Production  
**Overall Result**: □ Pass / □ Fail / □ Pass with minor issues  

**Recommendation**: □ Proceed to production / □ Fix issues first

**Signatures**:
- Developer: _________________
- QA: _________________
- Product Owner: _________________

---

**Last Updated**: 2024-12-18  
**Version**: Single-Tenant v1.0
