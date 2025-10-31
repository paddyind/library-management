# Corporate Network Configuration Guide

## Overview

This project supports automatic proxy configuration for corporate networks using Docker Compose override files.

## Files

- **`docker-compose.override.yml`** - Your local proxy config (GITIGNORED, not committed)
- **`docker-compose.override.template.yml`** - Template for others to copy (committed to repo)

## Quick Start

### On Corporate Network (Amdocs)

The file `docker-compose.override.yml` is already configured with Amdocs proxy. Just use:

```bash
docker compose up -d
```

### On Home/Public Network

Disable the proxy:

```bash
# Option 1: Rename the file
mv docker-compose.override.yml docker-compose.override.yml.disabled

# Option 2: Delete the file (can recreate from template later)
rm docker-compose.override.yml

# Restart services
docker compose restart
```

### Switching Networks

**Going to Office:**
```bash
# If you renamed it
mv docker-compose.override.yml.disabled docker-compose.override.yml

# Or recreate from scratch
cp docker-compose.override.template.yml docker-compose.override.yml
# Edit with your proxy details

docker compose restart
```

**Going Home:**
```bash
mv docker-compose.override.yml docker-compose.override.yml.disabled
docker compose restart
```

## How It Works

Docker Compose automatically merges files in this order:
1. `docker-compose.yml` (base configuration)
2. `docker-compose.override.yml` (if exists - local overrides)

When `docker-compose.override.yml` exists:
- Proxy environment variables are added to services
- Containers use corporate proxy for external requests
- Supabase API calls will work through proxy

When file doesn't exist:
- Direct connection to internet
- No proxy used
- Works on home/public networks

## Verification

### Check if proxy is configured:

```bash
# View merged configuration
docker compose config | grep -A 5 "PROXY"
```

### Test Supabase connection from container:

```bash
# Should succeed with or without proxy
docker compose exec backend sh -c "wget -O- https://qgbofecjkmihqgfcrdyg.supabase.co/auth/v1/health"
```

### Check authentication logs:

```bash
# Look for "Supabase authentication successful" (not "falling back to mock")
docker compose logs backend | grep -E "Supabase|Mock login"
```

## Proxy Configuration

Current proxy: `http://genproxy.amdocs.com:8080`

To change proxy settings:
1. Edit `docker-compose.override.yml`
2. Change `HTTP_PROXY` and `HTTPS_PROXY` values
3. Run `docker compose restart`

## Security Notes

✅ **Safe:**
- `docker-compose.override.yml` is in `.gitignore`
- Your proxy config won't be pushed to GitHub
- Only template file is committed

⚠️ **Be Careful:**
- Don't commit `docker-compose.override.yml`
- Don't put passwords in proxy URL if possible
- Keep template file generic

## Troubleshooting

### Proxy not working?

```bash
# 1. Check environment variables
docker compose exec backend env | grep -i proxy

# 2. Test DNS
docker compose exec backend nslookup qgbofecjkmihqgfcrdyg.supabase.co

# 3. Test direct connection to proxy
docker compose exec backend wget -O- http://genproxy.amdocs.com:8080

# 4. Check backend logs
docker compose logs backend --tail=50
```

### Still using mock authentication?

Check logs for "Supabase auth error, falling back to mock authentication"

Possible causes:
- Proxy requires authentication
- Proxy blocking HTTPS
- SSL certificate issues
- Proxy server unreachable

### Need to add proxy authentication?

Edit `docker-compose.override.yml`:

```yaml
- HTTP_PROXY=http://username:password@genproxy.amdocs.com:8080
- HTTPS_PROXY=http://username:password@genproxy.amdocs.com:8080
```

## Alternative: Run Backend Without Docker

If proxy issues persist, run backend locally:

```bash
# Stop Docker backend
docker compose stop backend

# Run locally (uses system proxy automatically)
cd backend
npm install
npm run start:dev

# Frontend stays in Docker, connects to host
```

This uses your system's proxy configuration automatically.

---

**Last Updated:** October 29, 2025
