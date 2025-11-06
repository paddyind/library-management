# Clean Reinitialize Guide

## 🧹 Complete Database Reset

This guide helps you **scrap everything and start fresh** when you want to reinitialize your databases.

---

## Quick Command (Recommended)

### For SQLite Only (Fastest, No Network Required)
```bash
cd library-management
./data/scripts/setup-database.sh --clean --sqlite-only
```

### For Both SQLite + Supabase (Clean Start)
```bash
cd library-management
./data/scripts/setup-database.sh --clean-all
```

### Force Clean (Removes Backups Too)
```bash
cd library-management
./data/scripts/setup-database.sh --clean-all --force
```

---

## Manual Clean Reinitialize Steps

### Step 1: Clean SQLite Database

```bash
# Remove SQLite database
docker compose exec backend rm -f data/library.sqlite

# Optional: Remove SQLite backups
docker compose exec backend rm -rf data/backups/sqlite/*.json
```

### Step 2: Clean Supabase Database

**Option A: Using Cleanup SQL (Recommended)**

1. Generate cleanup SQL:
   ```bash
   cd library-management
   ./data/scripts/setup-database.sh --clean-all
   ```

2. The script generates: `data/backups/supabase/supabase-cleanup.sql`

3. **Manual Steps:**
   - Open: `data/backups/supabase/supabase-cleanup.sql`
   - Copy ALL the SQL content
   - Go to: https://supabase.com/dashboard
   - Select your project → **SQL Editor**
   - Paste and run the cleanup SQL
   - Wait for completion (should show "Success")

**Option B: Manual SQL (if cleanup script doesn't work)**

Run this in Supabase SQL Editor:
```sql
-- Drop all tables and data
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

### Step 3: Run Migrations

**For SQLite:**
```bash
docker compose exec backend npm run db:migrate
```

**For Supabase:**

**Option A: Automated (if network/DNS works)**
```bash
docker compose exec backend npm run supabase:migrate
```

**Option B: Manual (if DNS/network issues - recommended for VPN)**
```bash
# Generate combined migration SQL
docker compose exec backend npm run supabase:sql

# This creates: data/backups/supabase-migration-combined.sql
# Then:
# 1. Open: data/backups/supabase-migration-combined.sql
# 2. Copy ALL the SQL content
# 3. Go to: https://supabase.com/dashboard
# 4. Select your project → SQL Editor
# 5. Paste and run the SQL
```

### Step 4: Seed Data

**SQLite:**
```bash
docker compose exec backend npm run db:init
```

**Supabase:**
```bash
docker compose exec backend sh -c "AUTH_STORAGE=supabase npm run seed"
```

**Both (Dual-seed):**
```bash
# Seed SQLite
docker compose exec backend npm run db:init

# Seed Supabase
docker compose exec backend sh -c "AUTH_STORAGE=supabase npm run seed"
```

---

## Handling DNS/Network Errors

If you see `EAI_AGAIN` or `getaddrinfo` errors when running `npm run supabase:migrate`:

### ✅ Solution: Use Manual Migration

1. **Generate migration SQL:**
   ```bash
   docker compose exec backend npm run supabase:sql
   ```

2. **File created:** `data/backups/supabase-migration-combined.sql`

3. **Apply manually:**
   - Open the SQL file
   - Copy all content
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run

### Alternative: Use SQLite Only

If Supabase network issues persist:

1. Set in `.env`:
   ```bash
   AUTH_STORAGE=sqlite
   ```

2. Restart backend:
   ```bash
   docker compose restart backend
   ```

3. Use SQLite only:
   ```bash
   ./data/scripts/setup-database.sh --clean --sqlite-only
   ```

---

## Complete Clean Reinitialize Flow

```bash
# 1. Clean everything
./data/scripts/setup-database.sh --clean-all --force

# 2. For Supabase: Apply cleanup SQL manually in Supabase Dashboard
#    (See Step 2 above)

# 3. For Supabase: Apply migration SQL manually in Supabase Dashboard  
#    (See Step 3 Option B above)

# 4. Seed both databases
docker compose exec backend npm run db:init
docker compose exec backend sh -c "AUTH_STORAGE=supabase npm run seed"
```

---

## Troubleshooting

### DNS Error: `getaddrinfo EAI_AGAIN`
- **Cause**: Network/VPN blocking Supabase DNS resolution
- **Solution**: Use manual migration approach (see above)

### Migration Already Applied
- **Cause**: Tables/triggers already exist
- **Solution**: Run cleanup SQL first, then migration SQL

### Password Authentication Failed
- **Cause**: Wrong `SUPABASE_DB_PASSWORD`
- **Solution**: Get correct password from Supabase Dashboard → Settings → Database

---

## Files Generated During Clean Reinitialize

- `data/backups/supabase/supabase-cleanup.sql` - Cleanup SQL (deletes everything)
- `data/backups/supabase-migration-combined.sql` - All migrations combined
- `data/library.sqlite` - SQLite database (recreated during setup)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Clean SQLite only | `./data/scripts/setup-database.sh --clean` |
| Clean both | `./data/scripts/setup-database.sh --clean-all` |
| Force clean | `./data/scripts/setup-database.sh --clean-all --force` |
| Generate Supabase SQL | `npm run supabase:sql` |
| Auto migrate Supabase | `npm run supabase:migrate` |
| Seed SQLite | `npm run db:init` |
| Seed Supabase | `AUTH_STORAGE=supabase npm run seed` |

