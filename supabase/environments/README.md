# GT Mart — Staging vs production

## Branches

| Branch | Purpose | Database |
|--------|---------|----------|
| **`develop`** | Daily development, features, testing | **Staging** Supabase (dev project) |
| **`master`** | Play Store releases, live admin | **Production** Supabase |

```
feature work → develop → test on dev DB → merge to master → prod DB + release
```

## One-time setup

### 1. Create dev Supabase project

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project** → e.g. `gt-mart-dev`
2. Save database password and project ref

### 2. Local env files (never commit)

```powershell
cd supabase\environments
copy staging.env.example staging.env
copy production.env.example production.env
```

Fill **staging.env** with dev keys. Fill **production.env** with live keys.

### 3. Bootstrap dev database (empty project)

```powershell
cd C:\Users\ADMIN\Projects\gt-mart
npm run db:staging:bootstrap
npm run db:staging:verify
```

### 4. Point preview builds at dev Supabase

After staging.env is filled, copy `EXPO_PUBLIC_*` values into **eas.json** → `build.preview.env`.

Production keys stay in **eas.json** → `build.production.env`.

### 5. Admin app

In **gt-mart-admin**:

```powershell
copy .env.staging.example .env.staging
copy .env.production.example .env.production
```

- Local dev: copy `.env.staging` → `.env`
- Hosting production: use `.env.production` values

### 6. Create `develop` branch (if not exists)

```powershell
git checkout master
git pull
git checkout -b develop
git push -u origin develop
```

## Daily workflow

```powershell
git checkout develop
npm run env:staging          # writes .env for local Expo
npx expo start --clear
# ... code changes ...
npm run db:staging:verify    # optional
git commit -m "your message"
```

## Release to production

```powershell
# 1. Apply new migrations on PROD first (if any)
npm run db:production:sync

# 2. Merge code
git checkout master
git merge develop
git push

# 3. Build & Play Store
npx eas-cli build --platform android --profile production

# 4. Deploy admin production
```

## Commands

| Command | Action |
|---------|--------|
| `npm run env:staging` | Dev Supabase → `gt-mart/.env` |
| `npm run env:production` | Prod Supabase → `gt-mart/.env` (use carefully) |
| `npm run db:staging:bootstrap` | Full schema on empty **dev** DB |
| `npm run db:staging:sync` | Idempotent sync on **dev** |
| `npm run db:staging:verify` | Health check **dev** |
| `npm run db:production:sync` | Idempotent sync on **prod** |
| `npm run db:production:verify` | Health check **prod** |

## Rules

- Never test experimental migrations on **production** first
- Never point **preview** / local `.env` at production while developing
- **master** should always match what's on Play Store
