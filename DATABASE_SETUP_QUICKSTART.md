# Database Setup Quick Start Guide

## 🚀 Quick Setup for Supabase

### Step 1: Generate SQL for Supabase

```bash
cd backend
npm run supabase:sql
```

This generates combined SQL in `backups/supabase-migration-combined.sql`

### Step 2: Apply SQL to Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project (`qgbofecjkmihqgfcrdyg`)
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the SQL from `backups/supabase-migration-combined.sql`
6. Paste into SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Seed Demo Data

```bash
npm run seed
```

This creates:
- ✅ Admin user: `admin@library.com` / `password`
- ✅ Librarian user: `librarian@library.com` / `password`
- ✅ Member user: `member@library.com` / `password`
- ✅ Sample books (8 books)
- ✅ Groups (Administrators, Librarians, Members)

---

## 🗄️ Database Management Commands

### Basic Commands

```bash
# Setup database (migrate + seed)
npm run db:setup

# Check database status
npm run db:status

# Create backup
npm run db:backup

# Restore from backup
npm run db:restore backups/sqlite/sqlite-backup-*.json --confirm

# Full reset (backup → migrate → restore)
npm run db:reset
```

### Migration Commands

```bash
# Run migrations
npm run migrate

# Generate Supabase SQL
npm run supabase:sql
```

### Seed Commands

```bash
# Seed with demo data
npm run seed
```

---

## 📋 What Tables Are Created?

The migration creates these tables:

1. **users** - User profiles (linked to Supabase Auth)
2. **books** - Book catalog
3. **groups** - User groups for RBAC
4. **group_members** - User-group associations
5. **transactions** - Book borrowing/returning
6. **reservations** - Book reservations
7. **notifications** - User notifications

**See**: [DATABASE_MODELING.md](DATABASE_MODELING.md) for complete schema details

---

## 🔄 Workflow Examples

### Fresh Setup (First Time)

```bash
# 1. Generate Supabase SQL
npm run supabase:sql

# 2. Apply SQL in Supabase SQL Editor (see Step 2 above)

# 3. Seed demo data
npm run seed
```

### Adding New Migration

```bash
# 1. Create migration file
touch migrations/supabase/002_add_feature.sql
touch migrations/sqlite/002_add_feature.sql

# 2. Write SQL in both files

# 3. Test on SQLite
npm run migrate

# 4. Generate Supabase SQL
npm run supabase:sql

# 5. Apply to Supabase SQL Editor
```

### Backup Before Changes

```bash
# 1. Create backup
npm run db:backup

# 2. Make changes (migrations, etc.)

# 3. If needed, restore
npm run db:restore backups/sqlite/latest-backup.json --confirm
```

### Scrap and Recreate (Full Reset)

```bash
# This will:
# 1. Backup current data
# 2. Run migrations (recreate tables)
# 3. Restore data from backup
npm run db:reset
```

---

## 📁 File Locations

```
backend/
├── migrations/
│   ├── supabase/
│   │   └── 001_initial_schema.sql    # Supabase DDL
│   └── sqlite/
│       └── 001_initial_schema.sql    # SQLite DDL
├── backups/
│   ├── supabase/
│   │   ├── supabase-backup-*.json    # Data backups
│   │   └── supabase-migration-combined.sql  # Generated SQL
│   └── sqlite/
│       └── sqlite-backup-*.json      # Data backups
└── scripts/
    ├── db-manager.ts                 # Main DB manager
    ├── backup-restore.ts             # Backup/restore
    └── apply-supabase-migrations.js  # Generate Supabase SQL
```

---

## ✅ Verification

After setup, verify tables exist:

```bash
npm run db:status
```

Check logs for:
- ✅ All required tables exist
- ✅ Migrations applied successfully
- ✅ Seed data created

---

## 🆘 Troubleshooting

### Supabase: "relation does not exist"

**Solution**: Apply migrations via SQL Editor:
```bash
npm run supabase:sql
# Copy SQL to Supabase SQL Editor
```

### SQLite: Tables not found

**Solution**: Run migrations:
```bash
npm run migrate
```

### Backup/Restore fails

**Solution**: Check backup file path and ensure `--confirm` flag is used

---

## 📚 Full Documentation

- **[DATABASE_MODELING.md](DATABASE_MODELING.md)** - Complete schema documentation
- **[backend/README_DATABASE.md](backend/README_DATABASE.md)** - Detailed database management guide

---

**Last Updated**: 2025-10-31

