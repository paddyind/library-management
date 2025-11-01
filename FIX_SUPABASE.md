# Fix Supabase Connection Issues

## Current Problem

Your Supabase credentials are configured, but the connection is timing out with:
```
❌ Supabase health check failed: This operation was aborted
```

This means the backend cannot reach `https://qgbofecjkmihqgfcrdyg.supabase.co`

## Quick Diagnostic

Run the diagnostic script to identify the exact issue:

```bash
docker compose exec backend node scripts/diagnose-supabase.js
```

## Common Causes & Solutions

### 1. Corporate Firewall/Proxy (Most Common)

**Symptoms:**
- Connection timeout after 5 seconds
- Works on home network but not office network
- "This operation was aborted" error

**Solution:**

Add proxy configuration to your `.env` file:

```bash
# Add these lines to .env file in project root
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,*.local

# If you don't know your proxy settings, ask your IT department
```

Then restart:
```bash
docker compose restart backend
```

**To find your proxy:**
- **macOS**: System Preferences → Network → Advanced → Proxies
- **Windows**: Settings → Network & Internet → Proxy
- **Linux**: Check `echo $HTTP_PROXY` or network settings

### 2. Supabase Project Paused (Free Tier)

**Symptoms:**
- Project was working before but stopped
- No changes to network/firewall

**Solution:**

1. Go to https://supabase.com/dashboard
2. Log in to your account
3. Find your project (`qgbofecjkmihqgfcrdyg`)
4. If it shows "Paused" or "Pausing", click "Restore" or "Resume"
5. Wait 2-3 minutes for project to resume
6. Restart backend: `docker compose restart backend`

**Prevention:** Free tier projects pause after 7 days of inactivity. Regular activity keeps them active.

### 3. Network/Firewall Blocking

**Symptoms:**
- Connection timeout
- Works from other networks (e.g., mobile hotspot) but not current network

**Solution:**

**Option A: Check Firewall Rules**
- Allow HTTPS (port 443) to `*.supabase.co`
- Allow outbound connections to `qgbofecjkmihqgfcrdyg.supabase.co`

**Option B: Use SQLite Instead**
If Supabase is blocked and you can't change firewall:
```bash
# In .env file, add:
AUTH_STORAGE=sqlite

# Restart:
docker compose restart backend
```

### 4. DNS Resolution Issues

**Symptoms:**
- DNS resolution errors in logs
- Can't resolve `*.supabase.co`

**Solution:**

Docker Compose already has DNS configured (Google DNS: 8.8.8.8), but if still failing:

```bash
# Test DNS resolution from inside container
docker compose exec backend nslookup qgbofecjkmihqgfcrdyg.supabase.co

# If it fails, you can add IP mapping in docker-compose.yml:
# (Uncomment the extra_hosts section)
extra_hosts:
  - "qgbofecjkmihqgfcrdyg.supabase.co:104.28.194.15"  # Get IP from nslookup
```

### 5. Increase Timeout (Workaround)

If connection is slow but working, increase timeout:

Edit `backend/src/config/supabase.service.ts`:
- Change `setTimeout(() => controller.abort(), 5000)` to `10000` (10 seconds)
- Restart: `docker compose restart backend`

## Recommended Solutions by Scenario

### Scenario 1: Corporate Network

```bash
# 1. Get proxy settings from IT
# 2. Add to .env:
HTTP_PROXY=http://proxy:port
HTTPS_PROXY=http://proxy:port
NO_PROXY=localhost,127.0.0.1

# 3. Restart
docker compose restart backend
```

### Scenario 2: Home/Personal Network

```bash
# 1. Check Supabase dashboard - is project paused?
# 2. If paused, resume it
# 3. If not paused, check firewall/router settings
# 4. Alternative: Use SQLite for local dev
```

### Scenario 3: Can't Fix Network

```bash
# Use SQLite instead - no external dependencies
# Add to .env:
AUTH_STORAGE=sqlite

# Restart
docker compose restart backend
```

## Verification Steps

After applying fixes:

1. **Check logs:**
   ```bash
   docker compose logs backend | grep -i supabase
   ```

2. **Look for success message:**
   ```
   ✅ Supabase health check passed - connection is working
   ```

3. **Test API connection:**
   ```bash
   docker compose exec backend node scripts/diagnose-supabase.js
   ```

4. **Verify in app:**
   - Login should work with Supabase
   - No more "falling back to SQLite" messages in logs

## Database Tables Required

If connection works but you get errors, you may need to create tables:

```bash
# Run seed script (creates tables and demo data)
docker compose exec backend npm run seed
```

Or manually in Supabase SQL Editor:
```sql
-- See SUPABASE_CONFIG.md for table schemas
```

## Still Not Working?

1. **Run diagnostic:**
   ```bash
   docker compose exec backend node scripts/diagnose-supabase.js
   ```

2. **Check Supabase dashboard:**
   - Is project active?
   - Are credentials correct?
   - Check project settings

3. **Check network from host:**
   ```bash
   curl -I https://qgbofecjkmihqgfcrdyg.supabase.co/rest/v1/
   ```

4. **Use SQLite as fallback:**
   ```bash
   # In .env:
   AUTH_STORAGE=sqlite
   docker compose restart backend
   ```

## Summary

**Most Likely Fix:** Configure proxy settings in `.env` file

**Quick Test:** Run `docker compose exec backend node scripts/diagnose-supabase.js`

**Fallback:** Use SQLite (`AUTH_STORAGE=sqlite`) if Supabase can't be reached

