# Testing Guide - Library Management System

## Current Setup Status

✅ **Backend**: Running locally on port 4001 with Supabase client initialized  
✅ **Frontend**: Running in Docker on port 3100  
✅ **Supabase**: Configured with credentials from `.env` file  
✅ **Corporate Proxy**: System proxy automatically used when running outside Docker

---

## Quick Test - Backend Running Locally (CURRENT)

### 1. Start Services

```bash
# Terminal 1: Frontend in Docker
docker compose up -d frontend

# Terminal 2: Backend locally (uses system proxy automatically)
cd backend
PORT=4001 npm run start:dev
```

You should see:
```
✅ Supabase client initialized successfully
🚀 Application is running on: http://localhost:4001
```

### 2. Test Registration with Supabase

**Via Browser:**
1. Open http://localhost:3100
2. Click "Register"
3. Fill in:
   - Email: your_email@gmail.com
   - Password: Test123456 (min 8 chars)
   - Name: Your Name
4. Submit

**Via Command Line:**
```bash
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456","name":"Test User"}'
```

### 3. Check Backend Logs

Look for one of these messages:

**SUCCESS (Supabase Working):**
```
✅ Supabase registration successful for: test@example.com
```

**FALLBACK (Supabase Failed):**
```
⚠️ Supabase signup error, falling back to mock registration: fetch failed
📝 Mock registration: test@example.com
```

### 4. Verify in Supabase Dashboard

If registration succeeded:
1. Go to https://supabase.com/dashboard
2. Open your project: qgbofecjkmihqgfcrdyg
3. Navigate to **Authentication** → **Users**
4. You should see the newly registered user

---

## Frontend Port Update (If Needed)

If frontend needs to connect to backend on port 4001 instead of 4000:

```bash
# Update frontend environment
docker compose exec frontend sh -c 'echo "NEXT_PUBLIC_API_URL=http://localhost:4001/api" >> .env.local'
docker compose restart frontend
```

Or edit `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

---

## Test Scenarios

### Scenario 1: Registration
- **Expected**: User registered in Supabase
- **Verify**: Check Supabase Dashboard → Authentication → Users

### Scenario 2: Login
```bash
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

**Success Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "test@example.com"
  }
}
```

### Scenario 3: View Profile (With Token)
```bash
# First login to get token
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Then get profile
curl -X GET http://localhost:4001/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Scenario 4: Browse Books (No Auth Required)
```bash
curl http://localhost:4001/api/books
```

Should return list of books (mock data or Supabase data).

---

## Troubleshooting

### Issue: "fetch failed" or "EAI_AGAIN"

**Problem**: Corporate proxy not working  
**Solution**: Backend running locally should automatically use system proxy

**Verify system proxy is set:**
```bash
echo $HTTP_PROXY
echo $HTTPS_PROXY
# Should show: http://genproxy.amdocs.com:8080
```

If not set:
```bash
export HTTP_PROXY=http://genproxy.amdocs.com:8080
export HTTPS_PROXY=http://genproxy.amdocs.com:8080
```

### Issue: Port 4000 already in use

**Problem**: Docker backend still running  
**Solution**:
```bash
docker compose stop backend
# Or kill all node processes
pkill -f "nest start"
```

### Issue: Frontend can't connect to backend

**Problem**: Frontend configured for port 4000, backend on 4001  
**Solution**: Update frontend environment variable (see "Frontend Port Update" above)

### Issue: "Supabase credentials not configured"

**Problem**: `.env` file not found or empty  
**Solution**:
```bash
# Check if .env exists
cat backend/.env

# Should contain:
# NEXT_PUBLIC_SUPABASE_URL=https://qgbofecjkmihqgfcrdyg.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Moving to Production (Docker)

Once you confirm Supabase works locally, you have two options for Docker:

### Option A: Run Backend Outside Docker (Recommended for Corporate Network)

```bash
# Start only frontend in Docker
docker compose up -d frontend

# Run backend locally
cd backend
npm run start:dev
```

**Pros:**
- ✅ Uses system proxy automatically
- ✅ No Docker networking issues
- ✅ Works with corporate proxy

**Cons:**
- ❌ Not fully containerized
- ❌ Need two terminal windows

### Option B: Use Host Network Mode in Docker

Edit `docker-compose.override.yml`:
```yaml
services:
  backend:
    network_mode: "host"
    environment:
      - HTTP_PROXY=http://genproxy.amdocs.com:8080
      - HTTPS_PROXY=http://genproxy.amdocs.com:8080
```

Then:
```bash
docker compose down
docker compose up -d
```

**Pros:**
- ✅ Fully containerized
- ✅ Uses host network stack

**Cons:**
- ❌ Less network isolation
- ❌ Port conflicts possible

---

## Expected Log Messages

### Successful Supabase Integration

```
✅ Supabase client initialized successfully
✅ Supabase registration successful for: user@example.com
✅ Supabase authentication successful
```

### Fallback to Mock Data

```
⚠️  Supabase credentials not configured. Using mock data mode.
📝 Mock registration: user@example.com
⚠️ Supabase signup error, falling back to mock registration
```

---

## Next Steps After Testing

1. **If Supabase Works**: 
   - Create database tables using SQL from `PRODUCTION_DEPLOYMENT.md`
   - Test full CRUD operations
   - Deploy to production

2. **If Supabase Still Fails**:
   - Check corporate firewall logs
   - Contact IT to whitelist `*.supabase.co`
   - Consider VPN or alternative deployment

3. **For Production Deployment**:
   - See `PRODUCTION_DEPLOYMENT.md`
   - Set up proper environment variables
   - Configure database tables and RLS policies

---

## Quick Commands Reference

```bash
# Start frontend only
docker compose up -d frontend

# Start backend locally
cd backend && npm run start:dev

# Check backend status
curl http://localhost:4001/api/books

# Register new user
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","name":"Test"}'

# Login
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}'

# Check logs
# (View the terminal where backend is running)

# Stop services
docker compose stop
pkill -f "nest start"
```

---

## Support

- **Documentation**: `PRODUCTION_DEPLOYMENT.md`, `CORPORATE_NETWORK.md`
- **API Docs**: http://localhost:4001/api-docs (when backend running)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/qgbofecjkmihqgfcrdyg
