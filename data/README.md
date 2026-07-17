# Database Setup Guide

This directory contains complete database schemas and seed data for both Supabase (PostgreSQL) and SQLite.

> **v3.0.0 migration:** Target datastore is Firebase Firestore. Supabase/SQLite schemas here remain authoritative until cutover. See [TECH-MIGRATION.md](../TECH-MIGRATION.md).

## Directory Structure

```
data/
├── schema/
│   ├── supabase_complete_schema.sql    # Complete Supabase schema
│   └── sqlite_complete_schema.sql      # Complete SQLite schema
├── migrations/
│   └── supabase/
│       └── 006_add_ratings_reviews_approval_fields.sql
├── seeds/
│   ├── supabase_seed.sql                # Sample data for Supabase
│   └── sqlite_seed.sql                  # Sample data for SQLite
└── library.sqlite                       # SQLite database file (auto-generated)
```

## Quick Start

### Option 1: Supabase (Recommended for Production)

1. **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Create a new project
   - Note your project URL and service role key

2. **Run Complete Schema**
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `schema/supabase_complete_schema.sql`
   - Paste and run in SQL Editor
   - This creates all tables, indexes, and RLS policies

3. **Run Migration (if needed)**
   - Copy contents of `migrations/supabase/006_add_ratings_reviews_approval_fields.sql`
   - Run in SQL Editor (only if tables already exist)

4. **Seed Sample Data (Optional)**
   - Copy contents of `seeds/supabase_seed.sql`
   - Run in SQL Editor to populate with sample data

5. **Configure Environment**
   ```bash
   # .env file
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   AUTH_STORAGE=supabase
   ```

### Option 2: SQLite (Development/Fallback)

1. **Run Complete Schema**
   ```bash
   sqlite3 data/library.sqlite < data/schema/sqlite_complete_schema.sql
   ```

2. **Seed Sample Data (Optional)**
   ```bash
   sqlite3 data/library.sqlite < data/seeds/sqlite_seed.sql
   ```

3. **Configure Environment**
   ```bash
   # .env file
   AUTH_STORAGE=sqlite
   SQLITE_PATH=data/library.sqlite
   ```

## Schema Differences

### Supabase (PostgreSQL)
- Uses UUID for primary keys (`id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`)
- Uses TIMESTAMPTZ for dates
- Uses JSONB for JSON data
- Has Row Level Security (RLS) policies
- Foreign keys reference UUID columns

### SQLite
- Uses TEXT for primary keys (`id TEXT PRIMARY KEY`)
- Uses TEXT for dates (ISO format)
- Uses TEXT for JSON data (stored as string)
- No RLS (file-based security)
- Foreign keys reference TEXT columns

## Migration Strategy

When switching between databases:

1. **Supabase → SQLite**: Export data, convert UUIDs to strings, import
2. **SQLite → Supabase**: Export data, convert strings to UUIDs, import

## Backup and Restore

### Supabase
- Use Supabase Dashboard → Database → Backups
- Or use `pg_dump` for manual backups

### SQLite
```bash
# Backup
cp data/library.sqlite data/library.sqlite.backup

# Restore
cp data/library.sqlite.backup data/library.sqlite
```

## Troubleshooting

### Foreign Key Constraint Errors
- Ensure foreign keys are enabled: `PRAGMA foreign_keys = ON` (SQLite)
- Check that referenced IDs exist in parent tables
- Verify data types match (UUID in Supabase, TEXT in SQLite)

### Type Mismatch Errors
- Supabase uses UUID, SQLite uses TEXT
- Always use the correct schema for your database type
- Migration scripts handle type conversions automatically

### Missing Tables
- Run the complete schema SQL file for your database type
- Check that all migrations have been applied
- Verify environment variables are set correctly

