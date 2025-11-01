# Supabase Configuration Guide

This document outlines the options for configuring and using Supabase with the Library Management System.

## Overview

The application supports **Supabase as primary database** with **SQLite as fallback**. The system automatically detects Supabase availability and switches to SQLite if Supabase is not configured or unavailable.

## Configuration Options

### Option 1: Use Supabase (Recommended for Production)

#### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Name**: Your project name (e.g., "library-management")
   - **Database Password**: Choose a strong password (save it securely)
   - **Region**: Select closest region
5. Wait for project setup to complete (2-3 minutes)

#### Step 2: Get Your Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - Keep this secret!

#### Step 3: Set Environment Variables

Create a `.env` file in the project root or set these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Authentication Storage (optional)
AUTH_STORAGE=supabase  # Force Supabase only
# OR
AUTH_STORAGE=auto     # Auto-detect (default)
```

#### Step 4: Create Database Tables

Run the seed script to create necessary tables and initial data:

```bash
docker compose exec backend npm run seed
```

**Note**: The seed script needs to be updated to create tables if they don't exist. Currently, it assumes tables exist.

#### Step 5: Configure SQL Schema (if needed)

If tables don't exist, create them manually in Supabase SQL Editor:

```sql
-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  owner_id UUID REFERENCES members(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add more tables as needed (loans, reservations, etc.)
```

### Option 2: Use SQLite Only (Development/Fallback)

If you don't want to use Supabase, the system will automatically use SQLite:

```bash
# Force SQLite mode
AUTH_STORAGE=sqlite
```

**Benefits:**
- ✅ No external dependencies
- ✅ Works offline
- ✅ Faster local development
- ✅ No API keys needed

**Limitations:**
- ❌ Not suitable for production (single-file database)
- ❌ No built-in backup/replication
- ❌ Limited concurrent access

### Option 3: Auto-Detect (Default)

The system automatically chooses between Supabase and SQLite:

```bash
# Default behavior (auto-detect)
AUTH_STORAGE=auto
```

**How it works:**
1. At startup, the system performs a health check on Supabase
2. If Supabase is configured and accessible → Uses Supabase
3. If Supabase is not configured or fails → Falls back to SQLite
4. Once decided, the choice persists for the session (until restart)

## Corporate Network Configuration

If you're behind a corporate proxy, configure proxy settings:

```bash
# Add to .env or docker-compose.yml
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,*.local
```

The Docker container will use these proxy settings for all HTTP/HTTPS requests.

## Troubleshooting

### Issue: "Supabase not configured" warnings

**Solution:** Either:
1. Configure Supabase credentials (see Option 1)
2. Set `AUTH_STORAGE=sqlite` to use SQLite only
3. Leave as-is - system will use SQLite automatically

### Issue: "Access denied" for admin routes

**Solution:** 
- Ensure user roles are fetched from database (already fixed)
- Check that admin user exists with role='admin'
- Verify JWT token contains correct user ID

### Issue: Supabase connection timeout

**Possible causes:**
- Network/firewall blocking Supabase
- Corporate proxy not configured
- DNS resolution issues

**Solutions:**
- Check proxy configuration
- Verify DNS settings in docker-compose.yml
- Try using SQLite as fallback

### Issue: Database sync between Supabase and SQLite

**Important:** Supabase and SQLite are **separate databases**. Data is NOT automatically synced between them.

**Best Practice:**
- Use Supabase for production
- Use SQLite for local development
- Don't mix them - choose one for your deployment

## Migration Strategy

### From SQLite to Supabase

1. Export data from SQLite (if needed)
2. Configure Supabase credentials
3. Run seed script or import data
4. Set `AUTH_STORAGE=supabase`
5. Restart application

### From Supabase to SQLite

1. Export data from Supabase (if needed)
2. Set `AUTH_STORAGE=sqlite`
3. Import data into SQLite (manual process)
4. Restart application

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No* | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | No* | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No* | - |
| `AUTH_STORAGE` | Storage preference: `auto`, `supabase`, or `sqlite` | No | `auto` |
| `SQLITE_PATH` | Path to SQLite database file | No | `data/library.sqlite` |
| `HTTP_PROXY` | HTTP proxy URL | No | - |
| `HTTPS_PROXY` | HTTPS proxy URL | No | - |
| `NO_PROXY` | Comma-separated list of no-proxy hosts | No | - |

*Required only if using Supabase

## Recommendations

### For Development
- Use SQLite (`AUTH_STORAGE=sqlite`) for faster iteration
- No external dependencies needed

### For Production
- Use Supabase for scalability and reliability
- Set `AUTH_STORAGE=supabase` to force Supabase (no fallback)
- Configure proper backup strategies

### For Hybrid
- Use `AUTH_STORAGE=auto` for automatic failover
- Supabase as primary, SQLite as backup
- Monitor logs for fallback events

