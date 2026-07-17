-- Complete SQLite Database Schema
-- Library Management System - SQLite Version
-- Version: 2.0.0
-- Date: 2025-12-20

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'librarian', 'member')),
    phone TEXT,
    dateOfBirth TEXT,
    address TEXT,
    preferences TEXT,
    is_demo INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- BOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'with_me')),
    count INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- ============================================
-- GROUP_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_member_id ON group_members(member_id);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'reserve', 'cancel', 'buy')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'pending_return_approval')),
    borrowedDate TEXT,
    dueDate TEXT,
    returnDate TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_book_id ON transactions(bookId);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(memberId);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ============================================
-- RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(bookId, memberId, status)
);

CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON reservations(bookId);
CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON reservations(memberId);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- ============================================
-- RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transactionId TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejectionReason TEXT,
    approvedBy TEXT REFERENCES users(id) ON DELETE SET NULL,
    approvedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(bookId, memberId)
);

CREATE INDEX IF NOT EXISTS idx_ratings_book_id ON ratings(bookId);
CREATE INDEX IF NOT EXISTS idx_ratings_member_id ON ratings(memberId);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating);
CREATE INDEX IF NOT EXISTS idx_ratings_status ON ratings(status);
CREATE INDEX IF NOT EXISTS idx_ratings_transaction_id ON ratings(transactionId);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    memberId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transactionId TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    review TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejectionReason TEXT,
    approvedBy TEXT REFERENCES users(id) ON DELETE SET NULL,
    approvedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(bookId, memberId)
);

CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(bookId);
CREATE INDEX IF NOT EXISTS idx_reviews_member_id ON reviews(memberId);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction_id ON reviews(transactionId);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    readAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(readAt);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt);

