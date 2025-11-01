# VPN/DNS Fix for Supabase

## Problem Identified

Your DNS resolution works **off-VPN** but fails **on corporate VPN**:

- **Off VPN**: DNS resolves correctly → `104.18.38.10` and `172.64.149.246`
- **On VPN**: Corporate DNS (`10.78.86.12`) returns `NXDOMAIN` (domain not found)

This is because corporate VPN DNS servers block or can't resolve Supabase domains.

## Solution Applied

### Fix 1: Hardcoded IP Mapping (Bypasses DNS)

Updated `docker-compose.yml` to use `extra_hosts` - this maps the Supabase domain directly to IP addresses, completely bypassing DNS lookup:

```yaml
extra_hosts:
  - "qgbofecjkmihqgfcrdyg.supabase.co:104.18.38.10"    # Primary IP
  - "qgbofecjkmihqgfcrdyg.supabase.co:172.64.149.246"  # Secondary IP
```

**Benefits:**
- ✅ Works on VPN and off-VPN
- ✅ No DNS dependency
- ✅ Faster (no DNS lookup needed)

**Limitation:**
- ⚠️ If Supabase changes IPs, you'll need to update these
- ⚠️ Cloudflare (which Supabase uses) may rotate IPs - these are Anycast IPs so should be stable

### Fix 2: Forced Public DNS (Backup)

Docker Compose is configured to use public DNS servers that ignore VPN DNS:

```yaml
dns:
  - 8.8.8.8          # Google DNS
  - 8.8.4.4          # Google DNS
  - 1.1.1.1          # Cloudflare DNS
```

This ensures Docker containers use public DNS even when host is on VPN.

## Verification

After restarting backend, check logs:

```bash
docker compose logs backend | grep -i supabase
```

You should see:
```
✅ Supabase health check passed - connection is working
```

Or test manually:
```bash
docker compose exec backend node scripts/diagnose-supabase.js
```

## If IPs Change

If Supabase IPs change (unlikely but possible), update `docker-compose.yml`:

1. Find new IPs (off-VPN):
   ```bash
   nslookup qgbofecjkmihqgfcrdyg.supabase.co
   ```

2. Update `extra_hosts` in `docker-compose.yml`

3. Restart:
   ```bash
   docker compose restart backend
   ```

## Alternative: Use SQLite on VPN

If you want to avoid Supabase when on VPN entirely:

```bash
# Add to .env:
AUTH_STORAGE=sqlite

# Restart:
docker compose restart backend
```

This uses SQLite when on VPN, Supabase when off-VPN (if `AUTH_STORAGE=auto`).

## Summary

- **Root Cause**: Corporate VPN DNS blocks Supabase domain resolution
- **Fix**: Map domain directly to IP addresses (bypasses DNS)
- **Status**: Should now work on both VPN and off-VPN

