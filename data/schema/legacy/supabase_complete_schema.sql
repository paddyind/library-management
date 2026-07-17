-- Complete Supabase Database Schema
-- Library Management System - Supabase (PostgreSQL) Version
-- Version: 2.0.0
-- Date: 2025-12-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'librarian', 'member')),
    phone TEXT,
    "dateOfBirth" TIMESTAMPTZ,
    address TEXT,
    preferences JSONB,
    is_demo BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================
-- BOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'with_me')),
    count INTEGER DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_title ON public.books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON public.books(author);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.groups (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);

-- ============================================
-- GROUP_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    UNIQUE(group_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_member_id ON public.group_members(member_id);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'reserve', 'cancel', 'buy')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'pending_return_approval')),
    "borrowedDate" TIMESTAMPTZ,
    "dueDate" TIMESTAMPTZ,
    "returnDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_book_id ON public.transactions("bookId");
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON public.transactions("memberId");
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- ============================================
-- RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("bookId", "memberId", status) WHERE status = 'pending'
);

CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON public.reservations("bookId");
CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON public.reservations("memberId");
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);

-- ============================================
-- RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "transactionId" UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    "rejectionReason" TEXT,
    "approvedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    "approvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("bookId", "memberId")
);

CREATE INDEX IF NOT EXISTS idx_ratings_book_id ON public.ratings("bookId");
CREATE INDEX IF NOT EXISTS idx_ratings_member_id ON public.ratings("memberId");
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON public.ratings(rating);
CREATE INDEX IF NOT EXISTS idx_ratings_status ON public.ratings(status);
CREATE INDEX IF NOT EXISTS idx_ratings_transaction_id ON public.ratings("transactionId");

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookId" UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "transactionId" UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    review TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    "rejectionReason" TEXT,
    "approvedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    "approvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("bookId", "memberId")
);

CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON public.reviews("bookId");
CREATE INDEX IF NOT EXISTS idx_reviews_member_id ON public.reviews("memberId");
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction_id ON public.reviews("transactionId");

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications("readAt");
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications("createdAt");

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: Readable by all authenticated users, updatable by owner
CREATE POLICY "Users are viewable by authenticated users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Books: Readable by all, writable by authenticated users
CREATE POLICY "Books are viewable by all" ON public.books
    FOR SELECT USING (true);

CREATE POLICY "Books are insertable by authenticated users" ON public.books
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Books are updatable by authenticated users" ON public.books
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Transactions: Users can only view their own
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid()::text = "memberId"::text);

CREATE POLICY "Users can create own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid()::text = "memberId"::text);

-- Reservations: Users can only view their own
CREATE POLICY "Users can view own reservations" ON public.reservations
    FOR SELECT USING (auth.uid()::text = "memberId"::text);

CREATE POLICY "Users can create own reservations" ON public.reservations
    FOR INSERT WITH CHECK (auth.uid()::text = "memberId"::text);

-- Ratings: Readable by all, writable by owner
CREATE POLICY "Ratings are viewable by all" ON public.ratings
    FOR SELECT USING (true);

CREATE POLICY "Users can create own ratings" ON public.ratings
    FOR INSERT WITH CHECK (auth.uid()::text = "memberId"::text);

-- Reviews: Readable by all, writable by owner
CREATE POLICY "Reviews are viewable by all" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid()::text = "memberId"::text);

-- Notifications: Users can only view their own
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid()::text = "userId"::text);

