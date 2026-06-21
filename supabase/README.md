# Supabase backend for GT Mart

PostgreSQL database + API via [Supabase](https://supabase.com).

## Quick setup

### 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → name it `gt-mart` (or any name)
3. Save your database password

### 2. Run the database schema

In the Supabase dashboard: **SQL Editor** → **New query**

1. Paste and run `supabase/migrations/001_initial_schema.sql`
2. Paste and run `supabase/seed.sql`
3. Run remaining migrations (`002`–`010`) for admin login, customer auth, security, and phone-only launch mode.

### 3. Connect the mobile app

1. In Supabase: **Project Settings** → **API**
2. Copy **Project URL** and **anon public** key
3. In the app root, create `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Restart Expo: `npx expo start --clear`

Without `.env`, the app uses **local mock data** (same as before).

## Database tables

| Table | Purpose |
|-------|---------|
| `profiles` | Customer accounts (phone, name, address) |
| `otp_verifications` | Mobile OTP codes (hashed, expiring) |
| `customer_sessions` | Active login sessions |
| `categories` | Product categories |
| `products` | Grocery catalog |
| `orders` | Orders (COD, status, delivery info) |
| `order_items` | Line items per order |
| `order_notifications` | WhatsApp update log |

## OTP SMS (real login)

Production login sends a 6-digit OTP by SMS via a Supabase Edge Function.

### 1. Run migration `009_otp_sms_integration.sql`

This adds `store_customer_otp_hash` (service role only) and blocks the old public `request_customer_otp` RPC.

### 2. Deploy the Edge Function

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-customer-otp
```

### 3. Set secrets (Supabase Dashboard → Edge Functions → send-customer-otp → Secrets)

**Option A — MSG91 (recommended for India)**

| Secret | Example |
|--------|---------|
| `SMS_PROVIDER` | `msg91` |
| `MSG91_AUTH_KEY` | your MSG91 auth key |
| `MSG91_TEMPLATE_ID` | DLT-approved OTP template ID |

Create an OTP template in [MSG91](https://msg91.com/) with a `##OTP##` variable.

**Option B — Twilio**

| Secret | Example |
|--------|---------|
| `SMS_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` | AC... |
| `TWILIO_AUTH_TOKEN` | ... |
| `TWILIO_PHONE_NUMBER` | +1... |

**Option C — Log only (testing)**

| Secret | Value |
|--------|-------|
| `SMS_PROVIDER` | `log` |

OTP is written to function logs only (Supabase → Edge Functions → Logs). No SMS is sent.

### 4. Mobile app

The app calls `send-customer-otp` instead of `request_customer_otp`. Verification still uses `verify_customer_otp`.

Local dev without Supabase still uses mock OTP `123456` from `config.ts`.

### Password auth (launch mode)

Set in `.env` or EAS build env:

```env
EXPO_PUBLIC_PASSWORD_AUTH=true
EXPO_PUBLIC_PHONE_ONLY_AUTH=false
```

Sign up / log in with mobile + password. Run migration `011_customer_password_auth.sql`.

When MSG91 OTP is ready, set `EXPO_PUBLIC_PASSWORD_AUTH=false` and enable OTP or phone-only as needed.

### Phone-only auth (interim)

Set in `.env` or EAS build env:

```env
EXPO_PUBLIC_PHONE_ONLY_AUTH=true
```

Login skips OTP — customer enters mobile number only. Run migration `010_phone_only_auth.sql`.

When MSG91 is ready, set `EXPO_PUBLIC_PHONE_ONLY_AUTH=false` and rebuild.

## API functions (RPC)

| Function | Purpose |
|----------|---------|
| `upsert_profile` | Create/update profile by phone |
| `request_customer_otp` | ~~Generate OTP~~ (use Edge Function `send-customer-otp`) |
| `store_customer_otp_hash` | Store OTP hash (service role / Edge Function only) |
| `register_customer` | Sign up with mobile + password |
| `login_customer` | Log in with mobile + password |
| `login_customer_by_phone` | ~~Launch login without OTP~~ (disabled when password auth is on) |
| `verify_customer_otp` | Validate OTP and create session |
| `validate_customer_session` | Restore login on app open |
| `revoke_customer_session` | Log out |
| `place_order` | Create order + items + first notification |
| `update_order_status` | Advance order status |
| `generate_order_number` | `GT-YYYYMMDD-0001` format |

## Security note

RLS policies are **open for MVP** (anon can read/write). Before launch:

- Enable **Supabase Phone Auth** (or another auth provider)
- Restrict `profiles` and `orders` to authenticated users
- Use Edge Functions with service role for shop admin actions

## Optional: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```
