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
3. Run remaining migrations (`002`–`005`) for admin login and customer OTP auth

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

## API functions (RPC)

| Function | Purpose |
|----------|---------|
| `upsert_profile` | Create/update profile by phone |
| `request_customer_otp` | Generate OTP for mobile login |
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
