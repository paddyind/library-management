# Database Setup Instructions

Complete guide for setting up and syncing both SQLite and Supabase databases.

## 🚀 Quick Start (Recommended)

### Single Command Setup

**For Unix/Linux/Mac:**
```bash
cd library-management
./data/scripts/setup-database.sh
```

**For Windows:**
```cmd
cd library-management
data\scripts\setup-database.bat
```

**Or via Docker:**
```bash
docker compose exec backend npm run db:init
```

This will:
- ✅ Check Docker is running
- ✅ Run migrations (creates tables if missing)
- ✅ **Automatically execute Supabase migrations** (if configured)
- ✅ Restore from backup if available, OR seed with demo data
- ✅ Offer dual-seed for both databases

---

## 🧹 Clean Start (Fresh Setup)

### Option 1: Clean SQLite Only

**Unix/Linux/Mac:**
```bash
cd library-management
./data/scripts/setup-database.sh --clean
```

**Windows:**
```cmd
cd library-management
data\scripts\setup-database.bat --clean
```

### Option 2: Clean Both Databases

**Unix/Linux/Mac:**
```bash
cd library-management
./data/scripts/setup-database.sh --clean-all
```

**Windows:**
```cmd
cd library-management
data\scripts\setup-database.bat --clean-all
```

**For Supabase cleanup:**
1. The script generates SQL in `data/backups/supabase/supabase-cleanup.sql`
2. Copy the SQL from that file
3. Go to Supabase Dashboard → SQL Editor
4. Paste and run the SQL to drop all tables
5. Then run the setup script again

### Option 3: Force Clean (Including Backups)

**Unix/Linux/Mac:**
```bash
cd library-management
./data/scripts/setup-database.sh --clean-all --force
```

**Windows:**
```cmd
cd library-management
data\scripts\setup-database.bat --clean-all --force
```

This removes:
- SQLite database file
- SQLite backup files
- Generates Supabase cleanup SQL

---

## 📋 Script Options

### Unix/Linux/Mac (`setup-database.sh`)

```bash
./data/scripts/setup-database.sh [options]
```

**Options:**
- `--clean` - Clean SQLite database before setup
- `--clean-all` - Clean both SQLite and generate Supabase cleanup SQL
- `--force` - Force cleanup (removes backups too)
- `--sqlite-only` - Setup SQLite only
- `--supabase-only` - Setup Supabase only
- `--help` - Show help message

**Examples:**
```bash
# Smart setup (migrate + restore/seed)
./data/scripts/setup-database.sh

# Clean SQLite, then setup
./data/scripts/setup-database.sh --clean

# Full cleanup (including backups), then setup
./data/scripts/setup-database.sh --clean-all --force

# Setup SQLite only
./data/scripts/setup-database.sh --sqlite-only

# Setup Supabase only
./data/scripts/setup-database.sh --supabase-only
```

### Windows (`setup-database.bat`)

```cmd
data\scripts\setup-database.bat [options]
```

**Options:**
- `--clean` - Clean SQLite database before setup
- `--clean-all` - Clean both SQLite and generate Supabase cleanup SQL
- `--force` - Force cleanup (removes backups too)
- `--sqlite-only` - Setup SQLite only
- `--supabase-only` - Setup Supabase only
- `--help` - Show help message

**Examples:**
```cmd
REM Smart setup (migrate + restore/seed)
data\scripts\setup-database.bat

REM Clean SQLite, then setup
data\scripts\setup-database.bat --clean

REM Full cleanup (including backups), then setup
data\scripts\setup-database.bat --clean-all --force
```

---

## 🔄 What the Script Does

### Automatic Operations

1. **Docker Check**
   - Verifies Docker is running
   - Starts backend container if not running

2. **Migration (if needed)**
   - Runs database migrations
   - Creates tables if they don't exist
   - Idempotent (safe to run multiple times)

3. **Data Initialization**
   - Checks for backup files in `data/backups/sqlite/`
   - If backup exists: Restores data from backup
   - If no backup: Seeds with demo data

4. **Demo Data**
   - Creates demo users:
     - `demo_admin@library.com` / `password`
     - `demo_librarian@library.com` / `password`
     - `demo_member@library.com` / `password`
   - Creates sample books and groups
   - Sets up relationships (group_members)

### Supabase Setup (Automated or Manual)

**Automated (Recommended):**
The script will automatically execute Supabase migrations if:
1. `SUPABASE_DB_PASSWORD` is set in `.env` file
2. `pg` library is installed (`npm install pg @types/pg`)

**Manual Fallback:**
If automated execution fails, the script:
1. Generates combined migration SQL (includes all tables and RLS policies)
2. **YOU MUST** apply it in Supabase SQL Editor:
   - Copy SQL from `data/backups/supabase-migration-combined.sql`
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run
3. Then seeds with demo data

---

## 📦 Manual Steps (Alternative)

If you prefer to run commands manually:

### SQLite Setup

```bash
cd library-management
docker compose exec backend npm run db:init
```

This will:
- Run migrations (create tables)
- Restore from backup if available, OR
- Seed with demo data if no backup

### Supabase Setup

**Option 1: Automated (Recommended)**

1. **Add database password to `.env`:**
   ```bash
   SUPABASE_DB_PASSWORD=your_database_password_here
   ```
   Get password from: Supabase Dashboard → Settings → Database → Connection string

2. **Install pg library (if not already installed):**
   ```bash
   cd backend
   npm install pg @types/pg
   ```

3. **Run automated migration:**
   ```bash
   docker compose exec backend npm run supabase:migrate
   ```

4. **Seed with demo data:**
   ```bash
   docker compose exec backend sh -c "AUTH_STORAGE=supabase npm run seed"
   ```

**Option 2: Manual**

1. **Generate migration SQL:**
   ```bash
   docker compose exec backend npm run supabase:sql
   ```

2. **Apply migrations:**
   - Copy SQL from `data/backups/supabase-migration-combined.sql`
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run the SQL

3. **Seed with demo data:**
   ```bash
   docker compose exec backend sh -c "AUTH_STORAGE=supabase npm run seed"
   ```

### Dual-Seed Both Databases

```bash
docker compose exec backend npm run db:sync
```

This seeds both SQLite and Supabase simultaneously.

---

## ✅ Verify Setup

### Check Database Status

```bash
docker compose exec backend npm run db:status
```

### Test Login

- **Admin**: `demo_admin@library.com` / `password`
- **Librarian**: `demo_librarian@library.com` / `password`
- **Member**: `demo_member@library.com` / `password`

---

## 🔧 Environment Variables

Ensure these are set in your `.env` file (project root):

```bash
# Supabase (required for Supabase operations)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database password (required for automated Supabase migrations)
SUPABASE_DB_PASSWORD=your_database_password_here
# Get from: Supabase Dashboard → Settings → Database → Connection string
# Extract password from: postgresql://postgres:[PASSWORD]@...

# Storage preference (optional)
AUTH_STORAGE=sqlite  # auto, supabase, or sqlite (default: sqlite for local dev)

# SQLite path (optional)
SQLITE_PATH=data/library.sqlite
```

**Important**: 
- `SUPABASE_SERVICE_ROLE_KEY` is required for backend operations (bypasses RLS)
- `SUPABASE_DB_PASSWORD` is required for automated migrations (not committed to git)
- Get database password from: Supabase Dashboard → Settings → Database → Connection string

---

## 🐛 Troubleshooting

### Script: "Command not found" or "Permission denied"

**Unix/Linux/Mac:**
```bash
chmod +x data/scripts/setup-database.sh
```

**Windows:**
- No action needed, `.bat` files are executable by default

### Supabase: "No rows returned" or "0 members"

- Ensure RLS policy for `group_members` is applied (included in migration SQL)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not just anon key)
- Check Supabase logs in Dashboard → Logs → API

### Supabase: "Trigger already exists" or "Policy already exists"

- ✅ **FIXED**: Migrations are now idempotent (use `DROP IF EXISTS` before `CREATE`)
- Safe to run migrations multiple times
- If you still see errors, the migration SQL has been updated - regenerate it

### Supabase: Automated migration fails

**If you see "pg library not installed":**
```bash
cd backend
npm install pg @types/pg
docker compose restart backend
```

**If you see "password authentication failed":**
- Check `SUPABASE_DB_PASSWORD` in `.env` is correct
- Get password from: Supabase Dashboard → Settings → Database
- Or use manual approach: `npm run supabase:sql`

**If you see connection errors:**
- Check network connectivity to Supabase
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Or use manual approach: `npm run supabase:sql`

### SQLite: "Table already exists"

- This is OK - migrations are idempotent
- Use `--clean` flag to start fresh if needed

### Docker: "Container not running"

- The script will attempt to start it automatically
- Or manually: `docker compose up -d backend`

### Both databases: "Connection failed"

- Check `.env` file has correct credentials
- For Supabase: Verify network/proxy settings
- For SQLite: Check file permissions on `data/` directory

### Supabase: "Could not find the table 'public.reviews'" or "'public.ratings'"

**Cause**: Reviews and ratings tables missing from Supabase schema.

**Solution**:
1. Apply the quick-fix SQL:
   ```bash
   # Generate/update migration SQL
   docker compose exec backend npm run supabase:sql
   ```

2. Copy SQL from `data/backups/supabase-quick-fix.sql` (or use the combined file)

3. Apply in Supabase Dashboard:
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run the SQL
   - This creates reviews and ratings tables

4. Restart backend:
   ```bash
   docker compose restart backend
   ```

### Supabase: "Failed to return book: Error: TIMEOUT_ERROR"

**Cause**: Return operations timing out due to slow Supabase connection or network issues.

**Solutions**:

1. **Check Network**: VPN or corporate proxy may slow connections
   - Temporarily disconnect from VPN
   - Check Supabase status: https://status.supabase.com/

2. **Verify Transaction Status Constraint**: Missing `pending_return_approval` status
   - Apply migration `data/migrations/supabase/005_fix_transaction_status.sql`:
     - Go to Supabase Dashboard → SQL Editor
     - Copy SQL from the file and run it
   - The backend already has increased timeouts (30s for updates, 20s for verification)

3. **Use SQLite Temporarily**:
   - Set in `.env`: `AUTH_STORAGE=sqlite`
   - Restart backend: `docker compose restart backend`

4. **Check Supabase RLS Policies**: Ensure transactions table policies allow updates
   ```sql
   -- Run in Supabase SQL Editor to verify policies exist
   SELECT * FROM pg_policies WHERE tablename = 'transactions';
   ```

---

## 📝 Notes

- **Migration Location**: All migrations are in `data/migrations/` (root level)
  - Supabase: `data/migrations/supabase/`
  - SQLite: `data/migrations/sqlite/`
- **Demo users** are marked with `is_demo = true` (Supabase) or `is_demo = 1` (SQLite)
- **Backups exclude demo users** - they can be recreated via seeding
- **Migrations are idempotent** - safe to run multiple times (use `IF NOT EXISTS` or `DO $$` blocks)
- **Service role key** bypasses RLS - required for backend operations
- **RLS policies** are included in the main migration (no manual patching needed)
- **Triggers and policies** use `DROP IF EXISTS` before `CREATE` (idempotent)
- **Applying Individual Migrations**: For Supabase, apply via Dashboard SQL Editor (see manual approach above)

---

## 🔄 Workflow Examples

### Fresh Project Setup

```bash
# 1. Clean everything
./data/scripts/setup-database.sh --clean-all --force

# 2. Setup both databases (automatically applies Supabase migrations if configured)
./data/scripts/setup-database.sh
```

### Update Existing Database

```bash
# Just run migrations (tables created if missing, data preserved)
./data/scripts/setup-database.sh
```

### Sync Data Between Databases

```bash
docker compose exec backend npm run db:sync-data -- --direction=both
```

### Automated Supabase Migration Only

```bash
# Requires SUPABASE_DB_PASSWORD in .env
docker compose exec backend npm run supabase:migrate
```

---

## 📚 Related Documentation

- [README.md](README.md) - Main project documentation
- [DATABASE_MODELING.md](DATABASE_MODELING.md) - Database schema details
- [CHANGELOG.md](CHANGELOG.md) - Version history
