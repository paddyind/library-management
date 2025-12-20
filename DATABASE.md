# Database Documentation

Complete guide for database setup, schema, and management for the Library Management System.

## Overview

The system supports dual-database architecture:
- **Supabase (PostgreSQL)** - Production/Cloud (Primary)
- **SQLite** - Development/Local (Fallback)

The system automatically selects the appropriate database based on configuration. Supabase is the primary database, SQLite is used as a fallback when Supabase credentials are not available.

## Quick Start

### Supabase Setup (Recommended)

1. **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Create a new project
   - Note your project URL and service role key

2. **Run Complete Schema**
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `data/schema/supabase_complete_schema.sql`
   - Paste and run in SQL Editor
   - This creates all tables, indexes, and RLS policies

3. **Run Migrations (if needed)**
   - If tables already exist, run: `data/migrations/supabase/006_add_ratings_reviews_approval_fields.sql`
   - Copy and run in Supabase SQL Editor

4. **Configure Environment**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   AUTH_STORAGE=auto  # or 'supabase' to force Supabase
   ```

5. **Seed Sample Data (Optional)**
   ```bash
   docker compose exec backend npm run seed
   ```

### SQLite Setup (Fallback)

1. **Run Complete Schema**
   ```bash
   sqlite3 data/library.sqlite < data/schema/sqlite_complete_schema.sql
   ```

2. **Configure Environment**
   ```env
   AUTH_STORAGE=sqlite
   SQLITE_PATH=data/library.sqlite
   ```

3. **Seed Sample Data (Optional)**
   ```bash
   docker compose exec backend npm run seed
   ```

## Schema Version

**Current Version:** 2.0.1  
**Latest Migration:** `006_add_ratings_reviews_approval_fields.sql`

### Recent Changes (v2.0.1)
- Ratings are published immediately (status: 'approved')
- Reviews require admin approval (status: 'pending' → 'approved'/'rejected')
- Foreign key constraints properly validated
- UUID types for Supabase, TEXT types for SQLite

## Schema Files

Complete schemas are available in `data/schema/`:
- `supabase_complete_schema.sql` - Complete Supabase schema
- `sqlite_complete_schema.sql` - Complete SQLite schema

## Key Differences

### Supabase (PostgreSQL)
- Uses **UUID** for primary keys (`id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`)
- Uses **TIMESTAMPTZ** for dates
- Uses **JSONB** for JSON data
- Has **Row Level Security (RLS)** policies
- Foreign keys reference UUID columns

### SQLite
- Uses **TEXT** for primary keys (`id TEXT PRIMARY KEY`)
- Uses **TEXT** for dates (ISO format)
- Uses **TEXT** for JSON data (stored as string)
- No RLS (file-based security)
- Foreign keys reference TEXT columns
- Foreign keys must be enabled: `PRAGMA foreign_keys = ON`

## Core Tables

### Users
Stores user accounts with roles (admin, librarian, member).

### Books
Stores book catalog information.

### Transactions
Tracks borrowing and return transactions with status workflow.

### Ratings
Stores book ratings with approval workflow (pending/approved/rejected).

### Reviews
Stores book reviews with approval workflow (pending/approved/rejected).

### Reservations
Manages book reservation queue.

### Notifications
User notifications and alerts.

## Schema Details

For detailed schema documentation, see:
- `data/schema/supabase_complete_schema.sql` - Full Supabase schema with RLS policies
- `data/schema/sqlite_complete_schema.sql` - Full SQLite schema

## Migrations

### Supabase Migrations

Located in `data/migrations/supabase/`:
- `006_add_ratings_reviews_approval_fields.sql` - Adds approval workflow fields

**To Apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy migration SQL
3. Paste and run

### SQLite Migrations

SQLite schema is managed automatically via `sqlite.service.ts`. The service creates/updates tables on startup.

## Clean Reinitialize

### SQLite Only
```bash
rm -f data/library.sqlite
sqlite3 data/library.sqlite < data/schema/sqlite_complete_schema.sql
docker compose exec backend npm run seed
```

### Supabase Only
1. Go to Supabase Dashboard → SQL Editor
2. Run cleanup SQL (drop all tables)
3. Run complete schema: `data/schema/supabase_complete_schema.sql`
4. Seed data: `docker compose exec backend npm run seed`

### Both Databases
```bash
# Clean SQLite
rm -f data/library.sqlite

# Clean Supabase (via Dashboard SQL Editor)
# Then run complete schema and seed
```

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
- **SQLite**: Ensure foreign keys are enabled (`PRAGMA foreign_keys = ON`)
- **Supabase**: Verify UUID types match (transactionId and approvedBy must be UUID)
- Check that referenced IDs exist in parent tables

### Type Mismatch Errors
- Supabase uses UUID, SQLite uses TEXT
- Always use the correct schema for your database type
- Migration scripts handle type conversions automatically

### Missing Tables
- Run the complete schema SQL file for your database type
- Check that all migrations have been applied
- Verify environment variables are set correctly

### Connection Issues
- **Supabase**: Check credentials in `.env` file
- **SQLite**: Verify file path and permissions
- System automatically falls back to SQLite if Supabase is unavailable

## Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Storage Selection
AUTH_STORAGE=auto  # Options: 'auto', 'supabase', 'sqlite'

# SQLite Configuration (if using SQLite)
SQLITE_PATH=data/library.sqlite
```

## Additional Resources

- `data/README.md` - Database directory structure and quick reference
- `data/schema/` - Complete schema files
- `data/migrations/` - Migration scripts

