-- =====================================================
-- Library Management System - Supabase Schema
-- Version: 1.0.0
-- Description: Initial database schema for Supabase (PostgreSQL)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- Stores user profile information (linked to auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'librarian', 'member')),
    "notificationPreferences" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_users_email" UNIQUE (email)
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS "idx_users_email" ON public.users(email);
CREATE INDEX IF NOT EXISTS "idx_users_role" ON public.users(role);

-- =====================================================
-- BOOKS TABLE
-- Stores book catalog information
-- =====================================================
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    "owner_id" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'reserved')),
    genre TEXT,
    tags JSONB DEFAULT '[]',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for books
CREATE INDEX IF NOT EXISTS "idx_books_title" ON public.books(title);
CREATE INDEX IF NOT EXISTS "idx_books_author" ON public.books(author);
CREATE INDEX IF NOT EXISTS "idx_books_isbn" ON public.books(isbn);
CREATE INDEX IF NOT EXISTS "idx_books_status" ON public.books(status);
CREATE INDEX IF NOT EXISTS "idx_books_owner_id" ON public.books("owner_id");

-- =====================================================
-- GROUPS TABLE
-- Stores user groups for RBAC
-- =====================================================
CREATE TABLE IF NOT EXISTS public.groups (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS "idx_groups_name" ON public.groups(name);

-- =====================================================
-- GROUP_MEMBERS TABLE
-- Junction table for groups and users (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_group_members" UNIQUE (group_id, member_id)
);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS "idx_group_members_group_id" ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS "idx_group_members_member_id" ON public.group_members(member_id);

-- =====================================================
-- TRANSACTIONS TABLE
-- Stores book borrowing/returning transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'reserve', 'cancel')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    "borrowedDate" TIMESTAMPTZ,
    "dueDate" TIMESTAMPTZ,
    "returnDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS "idx_transactions_book_id" ON public.transactions("bookId");
CREATE INDEX IF NOT EXISTS "idx_transactions_member_id" ON public.transactions("memberId");
CREATE INDEX IF NOT EXISTS "idx_transactions_status" ON public.transactions(status);
CREATE INDEX IF NOT EXISTS "idx_transactions_type" ON public.transactions(type);

-- =====================================================
-- RESERVATIONS TABLE
-- Stores book reservations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    priority INTEGER DEFAULT 0,
    "notifiedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_reservation_book_member" UNIQUE ("bookId", "memberId", status)
);

-- Indexes for reservations
CREATE INDEX IF NOT EXISTS "idx_reservations_book_id" ON public.reservations("bookId");
CREATE INDEX IF NOT EXISTS "idx_reservations_member_id" ON public.reservations("memberId");
CREATE INDEX IF NOT EXISTS "idx_reservations_status" ON public.reservations(status);

-- =====================================================
-- NOTIFICATIONS TABLE
-- Stores user notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON public.notifications("userId");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON public.notifications("readAt");
CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON public.notifications("createdAt");

-- =====================================================
-- UPDATE TIMESTAMP TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables for security
-- =====================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: Allow read access to all, write to own record
CREATE POLICY "Users are viewable by everyone" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Books: Public read, authenticated write
CREATE POLICY "Books are viewable by everyone" ON public.books
    FOR SELECT USING (true);

CREATE POLICY "Books are insertable by authenticated users" ON public.books
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Books are updatable by authenticated users" ON public.books
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Groups: Read for authenticated, write for admin (handled by service role)
CREATE POLICY "Groups are viewable by authenticated users" ON public.groups
    FOR SELECT USING (auth.role() = 'authenticated');

-- Transactions: Users can view own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = "memberId");

CREATE POLICY "Users can create own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = "memberId");

-- Reservations: Users can view own reservations
CREATE POLICY "Users can view own reservations" ON public.reservations
    FOR SELECT USING (auth.uid() = "memberId");

CREATE POLICY "Users can create own reservations" ON public.reservations
    FOR INSERT WITH CHECK (auth.uid() = "memberId");

-- Notifications: Users can view own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = "userId");

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.users IS 'User profiles linked to auth.users';
COMMENT ON TABLE public.books IS 'Library book catalog';
COMMENT ON TABLE public.groups IS 'User groups for role-based access control';
COMMENT ON TABLE public.group_members IS 'Junction table for groups and users';
COMMENT ON TABLE public.transactions IS 'Book borrowing and returning transactions';
COMMENT ON TABLE public.reservations IS 'Book reservation queue';
COMMENT ON TABLE public.notifications IS 'User notifications';

