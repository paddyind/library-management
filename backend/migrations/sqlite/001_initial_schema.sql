-- =====================================================
-- Library Management System - SQLite Schema
-- Version: 1.0.0
-- Description: Initial database schema for SQLite
-- =====================================================

-- =====================================================
-- USERS TABLE
-- Stores user information (self-contained auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'librarian', 'member')),
    "notificationPreferences" TEXT DEFAULT '{}',
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT "UQ_users_email" UNIQUE (email)
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS "idx_users_email" ON users(email);
CREATE INDEX IF NOT EXISTS "idx_users_role" ON users(role);

-- =====================================================
-- BOOKS TABLE
-- Stores book catalog information
-- =====================================================
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    "owner_id" TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'reserved')),
    genre TEXT,
    tags TEXT DEFAULT '[]',
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for books
CREATE INDEX IF NOT EXISTS "idx_books_title" ON books(title);
CREATE INDEX IF NOT EXISTS "idx_books_author" ON books(author);
CREATE INDEX IF NOT EXISTS "idx_books_isbn" ON books(isbn);
CREATE INDEX IF NOT EXISTS "idx_books_status" ON books(status);
CREATE INDEX IF NOT EXISTS "idx_books_owner_id" ON books("owner_id");

-- =====================================================
-- GROUPS TABLE
-- Stores user groups for RBAC
-- =====================================================
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS "idx_groups_name" ON groups(name);

-- =====================================================
-- GROUP_MEMBERS TABLE
-- Junction table for groups and users (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT "UQ_group_members" UNIQUE (group_id, member_id)
);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS "idx_group_members_group_id" ON group_members(group_id);
CREATE INDEX IF NOT EXISTS "idx_group_members_member_id" ON group_members(member_id);

-- =====================================================
-- TRANSACTIONS TABLE
-- Stores book borrowing/returning transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    "bookId" TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    "memberId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'reserve', 'cancel')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    "borrowedDate" TEXT,
    "dueDate" TEXT,
    "returnDate" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS "idx_transactions_book_id" ON transactions("bookId");
CREATE INDEX IF NOT EXISTS "idx_transactions_member_id" ON transactions("memberId");
CREATE INDEX IF NOT EXISTS "idx_transactions_status" ON transactions(status);
CREATE INDEX IF NOT EXISTS "idx_transactions_type" ON transactions(type);

-- =====================================================
-- RESERVATIONS TABLE
-- Stores book reservations
-- =====================================================
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    "bookId" TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    "memberId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    priority INTEGER DEFAULT 0,
    "notifiedAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT "UQ_reservation_book_member" UNIQUE ("bookId", "memberId", status)
);

-- Indexes for reservations
CREATE INDEX IF NOT EXISTS "idx_reservations_book_id" ON reservations("bookId");
CREATE INDEX IF NOT EXISTS "idx_reservations_member_id" ON reservations("memberId");
CREATE INDEX IF NOT EXISTS "idx_reservations_status" ON reservations(status);

-- =====================================================
-- NOTIFICATIONS TABLE
-- Stores user notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    "readAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON notifications("userId");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON notifications("readAt");
CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON notifications("createdAt");

