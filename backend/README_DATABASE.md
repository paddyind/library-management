# Database Management Guide

Complete guide for managing database schema, migrations, backups, and restores.

## 🚀 Quick Start

### Initial Setup

```bash
# Smart setup: Migrate + restore from backup (if exists) OR seed with demo data
npm run db:init

# OR for fresh setup without backup check:
npm run db:setup
```

### Supabase Setup

Since Supabase requires SQL Editor for migrations:

1. **Generate SQL**:
   ```bash
   npm run supabase:sql
   ```

2. **Apply to Supabase**:
   - Go to https://supabase.com/dashboard
   - Select your project → SQL Editor
   - Paste the generated SQL
   - Click "Run"

3. **Seed data**:
   ```bash
   npm run seed
   ```

---

## 📋 Available Commands

### Database Management

```bash
npm run db:init       # Smart setup: Migrate + restore from backup OR seed (recommended)
npm run db:setup      # Migrate + Seed (fresh setup, no backup check)
npm run db:reset      # Backup → Migrate → Restore (scrap and recreate)
npm run db:status     # Check database status and migrations
npm run db:help       # Show help
```

### Migration Commands

```bash
npm run migrate              # Run migrations
npm run supabase:sql        # Generate SQL for Supabase SQL Editor
```

### Backup/Restore Commands

```bash
npm run backup:create                  # Create backup snapshot
npm run backup:restore <file> --confirm # Restore from backup
```

### Seed Commands

```bash
npm run seed              # Seed database with demo data
```

---

## 📁 Project Structure

```
backend/
├── migrations/
│   ├── supabase/
│   │   └── 001_initial_schema.sql    # Supabase DDL
│   └── sqlite/
│       └── 001_initial_schema.sql    # SQLite DDL
├── backups/
│   ├── supabase/
│   │   └── supabase-backup-*.json    # Supabase backups
│   └── sqlite/
│       └── sqlite-backup-*.json      # SQLite backups
├── scripts/
│   ├── db-manager.ts                 # Main database manager
│   ├── backup-restore.ts             # Backup/restore utility
│   └── apply-supabase-migrations.js # Generate Supabase SQL
└── src/
    └── seed.ts                       # Seed script (uses migrations)
```

---

## 🔄 Migration Workflow

### Adding a New Migration

1. **Create migration file**:
   ```bash
   # Supabase
   touch migrations/supabase/002_add_column.sql
   
   # SQLite
   touch migrations/sqlite/002_add_column.sql
   ```

2. **Write migration SQL**:
   ```sql
   -- Migration: 002_add_column
   ALTER TABLE books ADD COLUMN new_field TEXT;
   CREATE INDEX idx_books_new_field ON books(new_field);
   ```

3. **Test locally (SQLite)**:
   ```bash
   npm run migrate
   ```

4. **Apply to Supabase**:
   ```bash
   npm run supabase:sql
   # Copy output to Supabase SQL Editor
   ```

---

## 💾 Backup and Restore

### Creating Backups

```bash
# Automatic backup (timestamped)
npm run backup:create

# Backups saved to:
# - backups/supabase/supabase-backup-YYYY-MM-DDTHH-MM-SS.json
# - backups/sqlite/sqlite-backup-YYYY-MM-DDTHH-MM-SS.json
```

**Backup Format**:
```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-31T13:00:00.000Z",
  "storage": "supabase",
  "tables": {
    "users": [...],
    "books": [...],
    "groups": [...],
    ...
  }
}
```

### Restoring from Backup

```bash
# Restore from specific backup
npm run backup:restore backups/sqlite/sqlite-backup-2025-10-31T13-00-00.json --confirm

# ⚠️ WARNING: --confirm flag is required to prevent accidental data loss
```

**Restore Process**:
1. Deletes all existing data in target tables
2. Inserts data from backup JSON
3. Maintains referential integrity

---

## 🔧 Scrap and Recreate (Full Reset)

Complete database reset with data preservation:

```bash
npm run db:reset
```

**This command**:
1. ✅ Creates backup of current data
2. ✅ Runs migrations (recreates tables)
3. ✅ Restores data from backup

**Use cases**:
- Schema changes requiring table recreation
- Migrating between databases
- Cleaning up corrupted data
- Testing migration scripts

---

## 📊 Database Status

Check database configuration and migration status:

```bash
npm run db:status
```

**Shows**:
- Environment variables (AUTH_STORAGE, URLs, keys)
- Migration file counts
- Backup counts
- Database connectivity

---

## 🗄️ Schema Documentation

See [DATABASE_MODELING.md](../DATABASE_MODELING.md) for:
- Complete table definitions
- Entity relationship diagrams
- Index strategy
- Security policies (RLS)
- Schema evolution guidelines

---

## 🔐 Supabase Specific

### Applying Migrations

Supabase doesn't support direct SQL execution via REST API. Use:

1. **Auto-generate SQL**:
   ```bash
   npm run supabase:sql
   ```

2. **Manual Application**:
   - Copy generated SQL from `backups/supabase-migration-combined.sql`
   - Or copy from `migrations/supabase/*.sql`
   - Paste into Supabase SQL Editor
   - Run

### Row Level Security (RLS)

Migrations include RLS policies. Ensure:
- Tables are in `public` schema
- RLS is enabled on all tables
- Policies allow necessary access patterns

### Service Role Key

For migrations and admin operations, use `SUPABASE_SERVICE_ROLE_KEY`:
- Bypasses RLS
- Full database access
- ⚠️ Keep secret - never commit to version control

---

## 🧪 Testing

### Test Migrations Locally

```bash
# SQLite (fast)
AUTH_STORAGE=sqlite npm run migrate
npm run seed

# Test application
npm run start:dev
```

### Test on Supabase

```bash
# Generate SQL
npm run supabase:sql

# Apply via SQL Editor
# Then seed
npm run seed
```

---

## 📝 Best Practices

1. **Always backup before migrations**:
   ```bash
   npm run backup:create
   npm run migrate
   ```

2. **Test migrations on SQLite first**:
   - Faster iteration
   - Same logical schema
   - Easy rollback

3. **Version control migrations**:
   - Commit all `.sql` files
   - Never modify existing migrations
   - Add new migrations for changes

4. **Document breaking changes**:
   - Update DATABASE_MODELING.md
   - Add migration notes
   - Update seed scripts if needed

5. **Regular backups**:
   - Before major changes
   - Before deployments
   - Scheduled backups in production

---

## 🆘 Troubleshooting

### Migration Fails

**Error**: Table already exists
- Solution: Migrations use `IF NOT EXISTS` - safe to rerun

**Error**: Column already exists  
- Solution: Add `IF NOT EXISTS` to ALTER TABLE statements

### Backup/Restore Issues

**Error**: Backup file not found
- Solution: Check file path, use absolute path if needed

**Error**: Restore fails on foreign keys
- Solution: Ensure backup includes all referenced tables

### Supabase Issues

**Error**: "relation does not exist"
- Solution: Run migrations via SQL Editor first

**Error**: "permission denied"
- Solution: Use `SUPABASE_SERVICE_ROLE_KEY` for migrations

---

## 📚 Related Documentation

- [DATABASE_MODELING.md](../DATABASE_MODELING.md) - Schema documentation
- [SUPABASE_CONFIG.md](../SUPABASE_CONFIG.md) - Supabase setup
- [README.md](../README.md) - Main project documentation

---

**Last Updated**: 2025-10-31

