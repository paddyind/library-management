# Database Modeling Documentation

This document describes the database schema for the Library Management System, including entity relationships, constraints, and migration strategy.

## 📊 Overview

The system supports two database backends:
- **Supabase** (PostgreSQL) - Production/Cloud
- **SQLite** - Development/Local

Both use the same logical schema, adapted for their respective SQL dialects.

## 🗂️ Schema Version

**Current Version**: `1.0.3`  
**Latest Migration**: `005_fix_transaction_status.sql`  
**Migration Location**: `data/migrations/` (root level)

### Migration Files Structure

**Supabase Migrations** (`data/migrations/supabase/`):
- `001_initial_schema.sql` - Initial schema with all core tables
- `002_add_is_demo_flag.sql` - Demo user flag for backup exclusion
- `003_add_user_fields.sql` - Phone, DOB, address, preferences (JSONB for Supabase, TIMESTAMPTZ for dates)
- `004_add_book_count.sql` - Book count column
- `004_add_reviews_ratings.sql` - Reviews and ratings tables
- `005_fix_transaction_status.sql` - Fix transaction status constraint (adds pending_return_approval)

**SQLite Migrations** (`data/migrations/sqlite/`):
- `001_initial_schema.sql` - Initial schema with all core tables
- `002_add_is_demo_flag.sql` - Demo user flag for backup exclusion
- `003_add_user_fields.sql` - Phone, DOB, address, preferences (TEXT for SQLite)
- `004_add_book_count.sql` - Book count column
- `004_add_reviews_ratings.sql` - Reviews and ratings tables

### Applying Migrations

**For SQLite** (automatic via migration runner):
```bash
cd library-management
npm run migrate  # Applies all migrations from data/migrations/sqlite/
```

**For Supabase** (manual via Dashboard - recommended):
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → SQL Editor
2. Open migration file: `data/migrations/supabase/XXX_description.sql`
3. Copy SQL content
4. Paste into SQL Editor and click "Run"
5. Verify success message

**Note**: All migrations are idempotent (safe to run multiple times) using `IF NOT EXISTS` checks or `DO $$` blocks.

## 📋 Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth - not in schema, external)
└────────┬─────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐      ┌─────────────────┐
│     users       │◄─────┤ group_members   │
│                 │ N:M  │                 │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │ 1:N                    │
         │                        │ N:1
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│     books       │      │     groups      │
│                 │      │                 │
└─────┬───────────┘      └─────────────────┘
      │
      │ 1:N
      ├─────────────────┐
      │                 │
      ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│  transactions   │ │    reviews      │
│                 │ │                 │
└────────┬─────────┘ └────────┬────────┘
         │                    │
         │ 1:N                │ 1:N
         ▼                    ▼
┌─────────────────┐ ┌─────────────────┐
│ reservations   │ │    ratings      │
│                │ │                 │
└────────────────┘ └─────────────────┘

┌─────────────────┐
│ notifications   │
│                 │
└────────┬─────────┘
         │
         │ N:1
         ▼
┌─────────────────┐
│     users       │
└─────────────────┘
```

## 📐 Table Definitions

### 1. `users` / `members`

**Purpose**: User profile information linked to authentication

**Supabase Schema**:
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    firstName TEXT,
    lastName TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'librarian', 'member')),
    is_demo BOOLEAN DEFAULT FALSE,  -- Indicates demo/test user (excluded from backups)
    notificationPreferences JSONB DEFAULT '{}',
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**SQLite Schema**:
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,  -- Hashed password (SQLite only)
    name TEXT,
    firstName TEXT,
    lastName TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'librarian', 'member')),
    is_demo INTEGER DEFAULT 0 CHECK (is_demo IN (0, 1)),  -- Indicates demo/test user (excluded from backups)
    notificationPreferences TEXT DEFAULT '{}',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Key Differences**:
- Supabase: Links to `auth.users` (UUID), no password field
- SQLite: Self-contained with password hash (TEXT), uses TEXT for dates

**Indexes**:
- `idx_users_email` - Fast email lookups
- `idx_users_role` - Role-based queries
- `idx_users_is_demo` - Fast demo user filtering

**Constraints**:
- Email must be unique
- Role must be one of: `admin`, `librarian`, `member`
- Supabase: Foreign key to `auth.users`

**Demo Users**:
- `is_demo = true` (Supabase) or `is_demo = 1` (SQLite) marks demo/test users
- Demo users are excluded from backups (can be recreated via seeding)
- Demo users: `demo_admin@library.com`, `demo_librarian@library.com`, `demo_member@library.com`

---

### 2. `books`

**Purpose**: Library book catalog

**Schema**:
```sql
-- Supabase
CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'reserved')),
    genre TEXT,
    tags JSONB DEFAULT '[]',
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SQLite
CREATE TABLE books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'reserved')),
    genre TEXT,
    tags TEXT DEFAULT '[]',  -- JSON stored as TEXT
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Indexes**:
- `idx_books_title` - Title search
- `idx_books_author` - Author search
- `idx_books_isbn` - ISBN lookup
- `idx_books_status` - Filter by availability
- `idx_books_owner_id` - Find books by owner

**Constraints**:
- Status must be: `available`, `borrowed`, or `reserved`
- Owner can be NULL (orphaned books)

---

### 3. `groups`

**Purpose**: User groups for Role-Based Access Control (RBAC)

**Schema**:
```sql
-- Supabase
CREATE TABLE public.groups (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SQLite
CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT DEFAULT '[]',  -- JSON stored as TEXT
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Indexes**:
- `idx_groups_name` - Name lookup

**Constraints**:
- Name must be unique

**Example Data**:
- `Administrators` - Full system access
- `Librarians` - Book management permissions
- `Members` - Regular library members

---

### 4. `group_members`

**Purpose**: Junction table for many-to-many relationship between groups and users

**Schema**:
```sql
-- Supabase
CREATE TABLE public.group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT UQ_group_members UNIQUE (group_id, member_id)
);

-- SQLite
CREATE TABLE group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT UQ_group_members UNIQUE (group_id, member_id)
);
```

**Indexes**:
- `idx_group_members_group_id` - Find all members in a group
- `idx_group_members_member_id` - Find all groups for a user

**Constraints**:
- Unique constraint on (group_id, member_id) - prevents duplicate memberships
- CASCADE DELETE - removing group/user removes associations

---

### 5. `transactions`

**Purpose**: Book borrowing and returning transactions

**Schema**:
```sql
-- Supabase
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bookId UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    memberId UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'reserve', 'cancel')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    borrowedDate TIMESTAMPTZ,
    dueDate TIMESTAMPTZ,
    returnDate TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SQLite
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'reserve', 'cancel')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    borrowedDate TEXT,
    dueDate TEXT,
    returnDate TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Indexes**:
- `idx_transactions_book_id` - Find all transactions for a book
- `idx_transactions_member_id` - Find all transactions for a user
- `idx_transactions_status` - Filter by status
- `idx_transactions_type` - Filter by type

**Constraints**:
- Type: `borrow`, `return`, `reserve`, `cancel`
- Status: `active`, `completed`, `cancelled`

---

### 6. `reservations`

**Purpose**: Book reservation queue

**Schema**:
```sql
-- Supabase
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bookId UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    memberId UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    priority INTEGER DEFAULT 0,
    notifiedAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT UQ_reservation_book_member UNIQUE (bookId, memberId, status)
);

-- SQLite
CREATE TABLE reservations (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    priority INTEGER DEFAULT 0,
    notifiedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT UQ_reservation_book_member UNIQUE (bookId, memberId, status)
);
```

**Indexes**:
- `idx_reservations_book_id` - Find all reservations for a book
- `idx_reservations_member_id` - Find all reservations for a user
- `idx_reservations_status` - Filter by status

**Constraints**:
- Unique constraint on (bookId, memberId, status) - prevents duplicate pending reservations

---

### 7. `notifications`

**Purpose**: User notifications

**Schema**:
```sql
-- Supabase
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    readAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SQLite
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    readAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Indexes**:
- `idx_notifications_user_id` - Find all notifications for a user
- `idx_notifications_read` - Filter read/unread
- `idx_notifications_created` - Sort by creation date

**Constraints**:
- Type: `info`, `warning`, `error`, `success`

---

## 🔄 Migration Strategy

### Creating New Migrations

1. **Create migration file**: `data/migrations/{storage}/XXX_description.sql`
   - Use sequential numbering: `001`, `002`, `003`, etc.
   - Use descriptive names: `002_add_book_genre.sql`
   - **Important**: Create matching files for both `sqlite/` and `supabase/` directories

2. **Write SQL statements** (make them idempotent):
   ```sql
   -- Migration: 002_add_book_genre
   -- Supabase version (use DO blocks for column checks)
   DO $$ 
   BEGIN
       IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'books' AND column_name = 'genre'
       ) THEN
           ALTER TABLE public.books ADD COLUMN genre TEXT;
       END IF;
   END $$;
   
   -- SQLite version (supports IF NOT EXISTS directly)
   ALTER TABLE books ADD COLUMN IF NOT EXISTS genre TEXT;
   ```

3. **Test locally**:
   ```bash
   cd library-management
   npm run migrate  # Runs SQLite migrations from data/migrations/sqlite/
   ```

4. **Apply to Supabase**:
   - **Option A: Via Supabase Dashboard (Recommended)**
     1. Go to https://supabase.com/dashboard → Your Project → SQL Editor
     2. Open the migration file: `data/migrations/supabase/XXX_description.sql`
     3. Copy and paste the SQL into the SQL Editor
     4. Click "Run" to execute
     5. Verify success message
   
   - **Option B: Via Script**:
     ```bash
     cd library-management
     node data/scripts/apply-supabase-migrations.js
     # Copy output SQL to Supabase SQL Editor
     ```

### Migration Best Practices

- ✅ Always include `IF NOT EXISTS` for idempotency
- ✅ Include rollback comments (`-- ROLLBACK: DROP INDEX ...`)
- ✅ Test on SQLite first (faster iteration)
- ✅ Document breaking changes
- ✅ Update this documentation when schema changes

---

## 💾 Backup and Restore

### Backup Strategy

Backups are JSON snapshots of all table data:

```bash
# Create backup
npm run backup:create

# Restore from backup (requires --confirm flag)
npm run backup:restore backups/sqlite/sqlite-backup-2025-10-31T13-00-00.json --confirm
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
    ...
  }
}
```

### Restore Process

1. **Full Restore** (scrap and recreate):
   ```bash
   # 1. Backup current data (optional)
   npm run backup:create
   
   # 2. Run migrations (recreates tables)
   npm run migrate
   
   # 3. Restore data from backup
   npm run backup:restore backups/sqlite/latest-backup.json --confirm
   ```

2. **Partial Restore** (selective tables):
   - Edit backup JSON to include only needed tables
   - Restore from modified backup

---

## 🔐 Security Considerations

### Supabase Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Users**: Readable by all, updatable by owner
- **Books**: Readable by all, writable by authenticated users
- **Groups**: Readable by authenticated users
- **Transactions/Reservations**: Users can only view their own
- **Notifications**: Users can only view their own

**Important**: For backend services, use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.

### SQLite

SQLite has no built-in security - access is controlled by file system permissions.  
**Recommendation**: Keep SQLite files in restricted directories (`data/`).

---

## 📊 Index Strategy

### Performance Indexes

All foreign keys and frequently queried fields are indexed:

- **User lookups**: `email`, `role`
- **Book searches**: `title`, `author`, `isbn`, `status`
- **Relationships**: All foreign key columns
- **Filtering**: Status fields, type fields

### Index Maintenance

- Indexes are created automatically via migrations
- No manual index management needed
- SQLite: Indexes stored in `.sqlite` file
- Supabase: Indexes stored in PostgreSQL system tables

---

## 🧪 Testing Schema Changes

1. **Local (SQLite)**:
   ```bash
   npm run migrate    # Apply migration
   npm run seed       # Add test data
   # Test application
   ```

2. **Supabase**:
   ```bash
   node scripts/apply-supabase-migrations.js
   # Copy SQL to Supabase SQL Editor
   npm run seed       # Add test data
   # Test application
   ```

---

## 📝 Schema Evolution Guidelines

### Adding Columns

✅ **Safe**:
```sql
ALTER TABLE books ADD COLUMN new_field TEXT DEFAULT NULL;
```

❌ **Breaking**:
```sql
ALTER TABLE books DROP COLUMN existing_field;
-- Requires data migration
```

### Renaming Columns

1. Add new column
2. Copy data: `UPDATE table SET new_col = old_col`
3. Drop old column in next migration

### Changing Data Types

1. Create new column with new type
2. Migrate data with transformation
3. Drop old column

---

## 🔧 Maintenance Scripts

### Available Commands

```bash
# Run migrations
npm run migrate

# Create backup
npm run backup:create

# Restore from backup
npm run backup:restore <backup-file> --confirm

# Setup database (migrate + seed)
npm run db:setup

# Reset database (backup + migrate + restore)
npm run db:reset

# Generate Supabase SQL (for manual application)
node scripts/apply-supabase-migrations.js
```

---

## 💾 Backup & Restore Strategy

### Demo User Indicator

All demo/test users are marked with `is_demo = true` (Supabase) or `is_demo = 1` (SQLite). This allows:
- **Exclusion from backups**: Demo users are automatically excluded from backups
- **Safe recreation**: Demo users can be safely deleted and recreated during seeding
- **Data protection**: Real user data is protected during backups

**Demo Users**:
- `demo_admin@library.com`
- `demo_librarian@library.com`
- `demo_member@library.com`

### Backup Location

Backups are stored in `backend/backups/`:
- Supabase: `backend/backups/supabase/supabase-backup-*.json`
- SQLite: `backend/backups/sqlite/sqlite-backup-*.json`

### Backup Commands

```bash
# Create backup (auto-detects storage type)
npm run db:backup

# Restore from backup
npm run db:restore <backup-file> --confirm

# Scrap and recreate (backup → migrate → restore)
npm run db:reset
```

### What Gets Backed Up

- ✅ Real users (is_demo = false/0)
- ✅ Books
- ✅ Groups and group_members
- ✅ Transactions
- ✅ Reservations
- ✅ Notifications

- ❌ Demo users (excluded automatically)

### Restore Process

When restoring from backup:
1. Run migrations to ensure schema is up-to-date
2. Restore backup data (real users only)
3. Run seed to recreate demo users

This ensures:
- Real user data is preserved
- Demo users are always in sync with seed script
- Schema is always current

---

## 📚 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-31 | Initial schema with all core tables |
| 2.0.0 | 2025-10-31 | Added is_demo flag to users table |

---

## 🎯 Future Enhancements

Planned schema additions:
- `subscriptions` table for subscription management
- `book_requests` table for user book requests
- `loans` table (if separated from transactions)
- Audit tables for change tracking

---

---

### 8. `reviews`

**Purpose**: User reviews for books

**Supabase Schema**:
```sql
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    review TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_review_book_member" UNIQUE ("bookId", "memberId")
);
```

**SQLite Schema**:
```sql
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT "UQ_review_book_member" UNIQUE (bookId, memberId)
);
```

**Indexes**:
- `idx_reviews_book_id` - Find all reviews for a book
- `idx_reviews_member_id` - Find all reviews by a user
- `idx_reviews_created` - Sort by creation date

**Constraints**:
- Unique constraint on (bookId, memberId) - one review per user per book

---

### 9. `ratings`

**Purpose**: User ratings for books (1-5 stars)

**Supabase Schema**:
```sql
CREATE TABLE public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_rating_book_member" UNIQUE ("bookId", "memberId")
);
```

**SQLite Schema**:
```sql
CREATE TABLE ratings (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT "UQ_rating_book_member" UNIQUE (bookId, memberId)
);
```

**Indexes**:
- `idx_ratings_book_id` - Find all ratings for a book
- `idx_ratings_member_id` - Find all ratings by a user
- `idx_ratings_rating` - Filter by rating value

**Constraints**:
- Rating must be between 1 and 5
- Unique constraint on (bookId, memberId) - one rating per user per book

---

**Last Updated**: 2025-11-05  
**Maintained By**: Library Management System Team

