# Production Deployment Guide

## Overview

This guide will help you deploy the Library Management System to production with full Supabase integration inside Docker.

---

## 🔧 DNS and Network Fixes Applied

### What Was Fixed

1. **Added DNS Servers to Docker Compose**
   - Google DNS: 8.8.8.8, 8.8.4.4
   - Cloudflare DNS: 1.1.1.1
   - Ensures containers can resolve external domain names

2. **Updated Backend Dockerfile**
   - Added `ca-certificates` and `openssl` packages
   - Enables proper SSL/TLS connections to Supabase
   - Updates certificate authority list

3. **Added Environment Variables**
   - `NODE_EXTRA_CA_CERTS` - Points to system certificates
   - All Supabase credentials passed to containers

---

## 📋 Prerequisites

### 1. Supabase Account Setup

✅ **Already Done:**
- Supabase project created
- Environment variables in `.env`
- Users manually created in dashboard

⚠️ **Still Needed:**
- Database tables creation (see schema below)
- Row Level Security policies

### 2. Environment Files

**Development:** `.env` (current)
**Production:** `.env.production` (template created)

---

## 🗄️ Required Supabase Database Schema

### Step 1: Create Members Table

Run this SQL in Supabase SQL Editor:

```sql
-- Members table (syncs with auth.users)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'LIBRARIAN')),
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON members FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Trigger to sync auth.users with members
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    'MEMBER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 2: Create Books Table

```sql
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE NOT NULL,
  publisher TEXT,
  published_year INTEGER,
  genre TEXT,
  description TEXT,
  cover_image_url TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE')),
  owner_id UUID REFERENCES members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view books
CREATE POLICY "Anyone can view books"
  ON books FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/librarians can add books
CREATE POLICY "Admins can insert books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

-- Only admins/librarians can update books
CREATE POLICY "Admins can update books"
  ON books FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_title ON books USING GIN(to_tsvector('english', title));
CREATE INDEX idx_books_status ON books(status);
```

### Step 3: Create Loans Table

```sql
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  loan_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST')),
  fine_amount DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Members can view their own loans
CREATE POLICY "Members can view own loans"
  ON loans FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

-- Admins can view all loans
CREATE POLICY "Admins can view all loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

-- Only admins/librarians can create loans
CREATE POLICY "Admins can create loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update book availability when loan is created
CREATE OR REPLACE FUNCTION update_book_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books
    SET available_copies = available_copies - 1,
        status = CASE WHEN available_copies - 1 = 0 THEN 'BORROWED' ELSE 'AVAILABLE' END
    WHERE id = NEW.book_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'RETURNED' AND OLD.status != 'RETURNED' THEN
    UPDATE books
    SET available_copies = available_copies + 1,
        status = 'AVAILABLE'
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_loan_change
  AFTER INSERT OR UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_book_availability();

CREATE INDEX idx_loans_member ON loans(member_id);
CREATE INDEX idx_loans_book ON loans(book_id);
CREATE INDEX idx_loans_status ON loans(status);
```

### Step 4: Create Reservations Table

```sql
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reservation_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED')),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

CREATE POLICY "Admins can view all reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

CREATE POLICY "Members can create reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_reservations_member ON reservations(member_id);
CREATE INDEX idx_reservations_book ON reservations(book_id);
CREATE INDEX idx_reservations_status ON reservations(status);
```

---

## 🚀 Deployment Steps

### Option 1: Development with Fixed DNS (Recommended First)

```bash
# 1. Stop current containers
docker compose down

# 2. Rebuild with new DNS config
docker compose build --no-cache

# 3. Start containers
docker compose up -d

# 4. Check backend logs
docker compose logs backend --tail=50

# Look for:
# ✅ "Supabase client initialized successfully"
# ✅ "Login successful for: <email>" (without "falling back to mock")
```

### Option 2: Production Deployment

```bash
# 1. Copy environment template
cp .env.production .env.prod
# Edit .env.prod with production values

# 2. Build production images
docker compose -f docker-compose.prod.yml build --no-cache

# 3. Start production stack
docker compose -f docker-compose.prod.yml up -d

# 4. Monitor logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🧪 Testing Supabase Connection

### Test 1: DNS Resolution from Container

```bash
# Enter backend container
docker compose exec backend sh

# Test DNS resolution
nslookup qgbofecjkmihqgfcrdyg.supabase.co

# Should show IP addresses like:
# 104.26.x.x
# 172.67.x.x

# Test HTTPS connection
wget -O- https://qgbofecjkmihqgfcrdyg.supabase.co/auth/v1/health

# Exit container
exit
```

### Test 2: Register New User (Should Go to Supabase)

```bash
# Register via API
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123456"
  }'

# Check backend logs - should see:
# ✅ "Supabase registration successful for: test@example.com"
# (NOT "Mock registration")

# Verify in Supabase dashboard:
# 1. Go to Authentication > Users
# 2. Should see test@example.com
# 3. Go to Table Editor > members
# 4. Should see the user record
```

### Test 3: Login with Supabase User

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@library.com",
    "password": "your-actual-supabase-password"
  }'

# Should return:
# {
#   "session": { ... },
#   "user": { ... }
# }

# Check logs - should see:
# ✅ "Supabase authentication successful for: admin@library.com"
```

---

## 📊 Monitoring and Debugging

### Check Supabase Connection Status

```bash
# View recent backend logs
docker compose logs backend --tail=100 | grep -i "supabase\|mock"

# ✅ Good signs:
# "Supabase client initialized successfully"
# "Supabase authentication successful"
# "Supabase registration successful"

# ⚠️ Still falling back:
# "⚠️ Supabase auth error, falling back to mock"
# "fetch failed"
```

### Common Issues and Solutions

#### Issue 1: Still Getting "fetch failed"

**Solution A: Verify DNS in container**
```bash
docker compose exec backend cat /etc/resolv.conf
# Should show:
# nameserver 8.8.8.8
# nameserver 8.8.4.4
# nameserver 1.1.1.1
```

**Solution B: Test from host vs container**
```bash
# From host (should work)
curl -I https://qgbofecjkmihqgfcrdyg.supabase.co/auth/v1/health

# From container (should also work now)
docker compose exec backend wget -O- https://qgbofecjkmihqgfcrdyg.supabase.co/auth/v1/health
```

#### Issue 2: SSL Certificate Errors

**Solution: Already handled in Dockerfile**
- Added ca-certificates package
- Added NODE_EXTRA_CA_CERTS environment variable
- Certificates automatically updated

#### Issue 3: Corporate Proxy/Firewall

If behind corporate firewall:

**Add proxy to docker-compose.yml:**
```yaml
backend:
  environment:
    - HTTP_PROXY=http://your-proxy:port
    - HTTPS_PROXY=http://your-proxy:port
    - NO_PROXY=localhost,127.0.0.1
```

---

## 🔄 Migration: Mock → Supabase

### What Happens Automatically

1. **First Request After Deploy**
   - System tries Supabase
   - If successful: Uses Supabase (no more mock)
   - If failed: Falls back to mock (temporary)

2. **No Data Loss**
   - Mock users still in code
   - Can still use admin@library.com for testing
   - New registrations go to Supabase when working

### Manual Migration of Test Data

Once Supabase is working, you can migrate mock users:

```bash
# Register each mock user via API (will go to Supabase)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@library.com",
    "password": "your-new-secure-password"
  }'
```

Then update the role in Supabase dashboard:
1. Go to Table Editor > members
2. Find the user
3. Change role to 'ADMIN'

---

## ✅ Production Checklist

### Security

- [ ] Change JWT_SECRET to strong random value (32+ characters)
- [ ] Update Supabase RLS policies
- [ ] Enable HTTPS (use nginx with SSL certificates)
- [ ] Set NODE_ENV=production
- [ ] Remove mock users from code (optional, they're harmless)
- [ ] Set up rate limiting
- [ ] Configure CORS for production domain

### Supabase

- [ ] All database tables created
- [ ] RLS policies configured
- [ ] Triggers and functions created
- [ ] Indexes created for performance
- [ ] Test user registration
- [ ] Test authentication
- [ ] Verify users appear in dashboard

### Docker

- [ ] DNS servers configured
- [ ] SSL certificates updated
- [ ] Health checks enabled
- [ ] Volume backups configured
- [ ] Logging configured
- [ ] Restart policies set

### Monitoring

- [ ] Set up logging aggregation
- [ ] Configure alerts for failures
- [ ] Monitor Supabase usage/quotas
- [ ] Set up application metrics

---

## 📈 Next Steps

1. **Wait for current build to complete**
2. **Test DNS resolution in container**
3. **Create Supabase tables using provided SQL**
4. **Test user registration (should go to Supabase)**
5. **Verify in Supabase dashboard**
6. **Deploy to production when ready**

---

## 🆘 Support

If issues persist after these fixes:

1. Share backend logs: `docker compose logs backend > backend.log`
2. Check Supabase project status
3. Verify network connectivity from container
4. Check for corporate firewall/proxy

---

**Last Updated:** October 29, 2025  
**Status:** DNS fixes applied, awaiting rebuild
