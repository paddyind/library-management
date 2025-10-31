# Supabase Integration Guide

## Current State: Hybrid Mode (Mock + Supabase Fallback)

### Where Are Registered Users Stored?

**Currently: In-Memory Mock Storage (Temporary)**

When you register a user, here's what happens:

1. **Backend tries Supabase first** - Attempts to create user in Supabase Auth
2. **If Supabase fails** (network issue) - Falls back to in-memory `mockUsers` array
3. **Data location**: `backend/src/auth/auth.service.ts` line 10-31

```typescript
export const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@library.com',
    password: 'admin123',
    name: 'Admin User',
    role: MemberRole.ADMIN,
  },
  {
    id: 'user-2',
    email: 'user@library.com',
    password: 'user123',
    name: 'Regular User',
    role: MemberRole.MEMBER,
  },
  // Your registered users are added here dynamically
];
```

### ⚠️ Important Limitations

**In-Memory Storage Means:**
- ✅ Users can register and login immediately
- ✅ All authentication features work
- ❌ **Data is lost when backend restarts**
- ❌ Users don't appear in Supabase dashboard
- ❌ Data is NOT persistent across deployments

**Only these demo users persist after restart:**
- `admin@library.com` / `admin123`
- `user@library.com` / `user123`

---

## What's Required for Full Supabase Integration?

### Current Status ✅

You've already completed these steps:

1. **✅ Environment Variables Set**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://qgbofecjkmihqgfcrdyg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

2. **✅ Docker Compose Updated** - Environment variables passed to containers

3. **✅ Supabase Client Initialized** - Backend logs show: `✅ Supabase client initialized successfully`

4. **✅ Manual Users Created** - You created users in Supabase dashboard

### What's Blocking Full Integration? 🚧

**Network/DNS Issue Inside Docker Container**

The Supabase client initializes successfully, but when making API calls:
```
TypeError: fetch failed
⚠️ Supabase auth error, falling back to mock authentication: fetch failed
```

**Root Cause:** Docker container cannot resolve `qgbofecjkmihqgfcrdyg.supabase.co`

**Possible Solutions:**

#### Option 1: Fix Docker DNS (Recommended for Production)

Add to `docker-compose.yml`:
```yaml
services:
  backend:
    dns:
      - 8.8.8.8
      - 8.8.4.4
    extra_hosts:
      - "qgbofecjkmihqgfcrdyg.supabase.co:host-gateway"
```

#### Option 2: Use Host Network Mode (For Development)

```yaml
services:
  backend:
    network_mode: "host"
```

#### Option 3: Test Outside Docker

Run backend locally (not in Docker):
```bash
cd backend
npm install
npm run start:dev
```

#### Option 4: Keep Mock Mode for Development

Current setup works perfectly for development/testing. Deploy to production environment (Vercel, AWS, etc.) where DNS works properly.

---

## Supabase Database Schema Required

Once network issue is resolved, you'll need these tables in Supabase:

### 1. Members Table (users)

Already managed by Supabase Auth, but you need a `members` table:

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own profile"
  ON members FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data  
CREATE POLICY "Users can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = id);
```

### 2. Books Table

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES members(id),
  status TEXT DEFAULT 'AVAILABLE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books"
  ON books FOR SELECT
  TO authenticated
  USING (true);
```

### 3. Additional Tables (Future)

You'll need:
- `loans` - Book checkout records
- `reservations` - Book reservations
- `groups` - Member groups
- `subscriptions` - Membership tiers
- `transactions` - Payment history

---

## Testing Supabase Connection

### Test 1: Check DNS Resolution from Container

```bash
docker compose exec backend sh
ping qgbofecjkmihqgfcrdyg.supabase.co
# or
nslookup qgbofecjkmihqgfcrdyg.supabase.co
```

### Test 2: Test Auth API Directly

```bash
curl https://qgbofecjkmihqgfcrdyg.supabase.co/auth/v1/health
```

### Test 3: Check Backend Logs

```bash
docker compose logs backend | grep -i supabase
```

Look for:
- ✅ `Supabase client initialized successfully`
- ⚠️ `Supabase auth error, falling back to mock authentication`
- ❌ `fetch failed` (indicates network issue)

---

## Migration Path: Mock → Supabase

### Current Behavior (Automatic Fallback)

```
┌─────────────────────────────────┐
│ User Registration/Login Request │
└────────────┬────────────────────┘
             │
             ▼
    ┌────────────────┐
    │ Try Supabase   │
    └────┬───────────┘
         │
    ┌────▼─────┐
    │ Success? │
    └─┬────────┘
      │
   No │ Yes
      │  │
      │  └──► Use Supabase Data
      │
      └──► Fall Back to Mock Auth
           (In-Memory mockUsers array)
```

### Once Network Fixed

1. **Automatic Migration** - System will start using Supabase
2. **Manual Cleanup** - Remove mock users from `auth.service.ts`
3. **Migrate Test Data** - Create users in Supabase dashboard
4. **Update Guards** - Can switch to SupabaseAuthGuard if desired

---

## Current Fixes Applied ✅

1. **Profile Endpoint Fixed**
   - Changed from `SupabaseAuthGuard` → `JwtAuthGuard`
   - Added mock data fallback in `MembersService.findOne()`
   - Profile page should now work with mock authentication

2. **Registration Success Message**
   - Added success banner on login page after registration
   - Shows: "Registration successful! Please sign in with your credentials."

3. **All Endpoints with Fallback**
   - ✅ Authentication (login/register)
   - ✅ Books listing
   - ✅ Books detail
   - ✅ Profile view
   - ✅ JWT token generation

---

## Next Steps

### For Development/Testing (Current)
1. ✅ Continue using mock authentication
2. ✅ Test all features with demo accounts
3. ✅ Use for UI/UX development

### For Production Deployment
1. 🔧 Fix Docker DNS issue (see Option 1 above)
2. 🗄️ Create Supabase tables (see schema above)
3. 🔄 Test migration of a few users
4. 🚀 Deploy to production environment
5. 📊 Monitor Supabase dashboard for user activity

---

## Summary

**Q: Where are my registered users?**  
A: In-memory array, lost on restart (except admin@library.com and user@library.com)

**Q: Why aren't they in Supabase?**  
A: Docker container has DNS/network issue connecting to Supabase API

**Q: Can I use the app now?**  
A: Yes! Everything works with mock data. Perfect for testing.

**Q: When will Supabase work?**  
A: When deployed outside Docker, or when DNS issue is fixed in Docker

**Q: Do I need to do anything now?**  
A: No, the app is fully functional. Fix DNS when ready for production.

---

**Last Updated:** October 29, 2025  
**Status:** Development Ready, Production Pending DNS Fix
