# Environment Variables Setup Guide

This guide explains how to set up environment variables for the Library Management System.

## Quick Setup

1. **Create `.env` file** (in project root, same directory as `docker-compose.yml`):
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** and add your values (see sections below)

3. **Restart Docker Compose** to load new environment variables:
   ```bash
   docker compose restart
   ```

## Where Environment Variables Are Read From

### For Docker Compose (Recommended)

Docker Compose automatically reads environment variables from:
1. **`.env` file** in the project root (same directory as `docker-compose.yml`)
2. Your **shell environment** (variables you `export` before running `docker compose`)

**The `.env` file is the recommended method** because:
- ✅ Easy to manage
- ✅ Automatically gitignored (never committed)
- ✅ Persists across shell sessions
- ✅ Works with Docker Compose automatically

### For Running Scripts Directly (Outside Docker)

If you run scripts directly (e.g., `npm run db:status` from your host machine), you need to:

**Option 1: Load from `.env` file manually**
```bash
# Linux/macOS
export $(cat .env | xargs)
npm run db:status

# Or use a tool like dotenv-cli
npx dotenv-cli npm run db:status
```

**Option 2: Set in your shell**
```bash
export NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
npm run db:status
```

## Required Variables

### For Supabase Mode

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/anonymous key | Supabase Dashboard → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (⚠️ keep secret!) | Supabase Dashboard → Settings → API → service_role key |

### For SQLite Mode

No additional variables required. The system will use SQLite automatically if Supabase is not configured.

## Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_STORAGE` | Storage mode: `auto`, `supabase`, or `sqlite` | `auto` |
| `JWT_SECRET` | Secret key for JWT token signing | `development-secret-key` |
| `SQLITE_PATH` | Path to SQLite database file | `/app/data/library.sqlite` (inside Docker) |
| `HTTP_PROXY` | HTTP proxy URL (corporate networks) | - |
| `HTTPS_PROXY` | HTTPS proxy URL (corporate networks) | - |
| `NO_PROXY` | Comma-separated list of no-proxy hosts | - |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:3100` |

## Example `.env` File

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qgbofecjkmihqgfcrdyg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Storage Mode
AUTH_STORAGE=auto

# JWT Secret (generate a secure random string for production)
JWT_SECRET=your-secure-random-string-here

# SQLite Path (default, usually don't need to change)
SQLITE_PATH=/app/data/library.sqlite

# Proxy (uncomment if behind corporate proxy)
# HTTP_PROXY=http://proxy.company.com:8080
# HTTPS_PROXY=http://proxy.company.com:8080
# NO_PROXY=localhost,127.0.0.1,*.local
```

## Verifying Environment Variables

### Check in Docker Container

```bash
# Enter backend container
docker compose exec backend sh

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
echo $AUTH_STORAGE
```

### Check with Database Manager

```bash
# From project root (outside Docker)
docker compose exec backend npm run db:status

# Or if running directly (requires variables set in shell)
npm run db:status
```

The `db:status` command will show:
- ✅ Set - if variable is configured
- ❌ Not set - if variable is missing

## Troubleshooting

### Issue: Variables show as "Not set" in `db:status`

**Possible causes:**
1. `.env` file doesn't exist in project root
2. `.env` file exists but variables are not set (empty values)
3. Running script outside Docker without loading `.env`

**Solutions:**
1. Create `.env` file: `cp .env.example .env`
2. Add your values to `.env`
3. Restart Docker Compose: `docker compose restart`
4. Verify: `docker compose exec backend npm run db:status`

### Issue: Variables not loaded in Docker container

**Check:**
1. `.env` file is in the same directory as `docker-compose.yml`
2. Variable names match exactly (case-sensitive, no spaces around `=`)
3. No syntax errors in `.env` file (comments start with `#`)

**Restart containers:**
```bash
docker compose down
docker compose up -d
```

### Issue: Scripts run outside Docker can't find variables

**Solution:** Load `.env` file before running:
```bash
# Linux/macOS
export $(cat .env | grep -v '^#' | xargs)
npm run db:status

# Or install and use dotenv-cli
npm install -g dotenv-cli
dotenv npm run db:status
```

## Security Notes

1. **Never commit `.env` to git** - It's already in `.gitignore`
2. **Use `.env.example` as template** - Commit this, not `.env`
3. **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - Never expose in frontend code
4. **Use strong `JWT_SECRET` in production** - Generate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Additional Resources

- [Supabase Configuration Guide](SUPABASE_CONFIG.md)
- [Database Setup Quickstart](DATABASE_SETUP_QUICKSTART.md)
- [README.md](README.md)

