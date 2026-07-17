# Changelog

All notable changes to the Library Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — v3.0.0 Platform Migration

### Planned

- **IAM:** Keycloak (OIDC, self-service registration) replacing custom JWT + Supabase Auth
- **Data:** Firebase Firestore (SaaS, separate dev/prod projects) replacing Supabase Postgres + SQLite runtime
- **Migration:** Import from `backend/backups/*.json` into Keycloak + Firestore; force password reset for imported users
- **Transition:** `IAM_PROVIDER` / `DATA_STORAGE` feature flags; Supabase/SQLite remain fallback until Phase 6 cutover
- **Documentation:** [TECH-MIGRATION.md](TECH-MIGRATION.md) master runbook; architecture banner in [ARCHITECTURE.md](ARCHITECTURE.md)

### Phase 0 (completed)

- Added `TECH-MIGRATION.md` with decisions, phased plan, Firebase dev/prod guidance, and decommission checklist
- Updated `ARCHITECTURE.md`, `.env.example`, `README.md` with migration pointers
- No runtime or Docker changes in Phase 0

### Phase 1 (superseded by 1.5)

- Keycloak was briefly embedded in library compose (port 3310); moved to workspace platform

### Phase 5 (completed)

- **Frontend OIDC** — `keycloak-js`, Keycloak login/register/logout when `NEXT_PUBLIC_IAM_PROVIDER=keycloak`

### Phase 4 (completed)

- **`KeycloakAuthGuard`** + **`AppAuthGuard`** — JWKS validation, unified auth across all controllers
- **Firestore paths** for profiles, books, transactions when `DATA_STORAGE=firebase`
- Legacy auth endpoints return 410 when `IAM_PROVIDER=keycloak`

### Phase 3 (completed)

- **`export-backup.ts`** + **`migrate-to-keycloak-firestore.ts`** — SQLite/Supabase JSON → Keycloak realm `library` + `library__*` Firestore
- Idempotent upserts, `--dry-run`, migration reports under `backend/backups/`
- Demo users excluded from Keycloak; legacy `idMap` in report for FK remapping

### Phase 2 (completed)

- **`FirebaseModule`** + **`FirestoreService`** — Admin SDK, prefixed collections (`library__*`)
- **`docs/firestore_collections.md`** — field definitions for all library collections
- **`npm run db:seed:firestore`** — demo books into `personal-apps-dev`
- **`GET /api/platform/status`** — migration flags + Firestore ping
- Books CRUD on `/api/books` when `DATA_STORAGE=firebase` (default remains `legacy`)

### Phase 1.5 (completed)

- **`identity-platform`** repo: shared Keycloak on **3510**, realm-per-app, Firestore conventions
- Library compose no longer runs Keycloak; canonical realm at `identity-platform/realms/library-realm.json`
- Docs: `identity-platform/docs/ARCHITECTURE.md`, `DATA-PLATFORM.md`

## [2.0.1] - 2025-12-20

### Changed
- **Ratings Workflow**: Ratings are now published immediately (no approval required)
- **Reviews Workflow**: Only reviews require admin approval before being visible
- **Error Handling**: Improved frontend error handling for 400 validation errors (shows user-friendly alerts instead of error overlays)
- **Admin Approvals Page**: Removed ratings tab (ratings are immediate), shows only pending reviews

### Fixed
- **400 Error Display**: Fixed runtime error overlay when validation fails - now shows friendly alert messages
- **404 on Approve/Reject**: Fixed "Review not found or already processed" error by checking review existence before processing
- **Foreign Key Constraints**: Fixed SQLite foreign key constraint errors by validating transactionId before insert/update
- **React Hooks Error**: Fixed "Rendered more hooks than during the previous render" error on transactions page
- **Type Mismatch**: Fixed Supabase migration - changed transactionId and approvedBy from TEXT to UUID to match table types
- **Documentation**: Consolidated database documentation into single DATABASE.md file

## [2.0.0] - 2025-12-19

### Added

#### Ratings and Reviews Enhancement
- **Approval Workflow**: Reviews require admin approval before being visible (ratings are immediate)
- **Return Validation**: Ratings and reviews can only be submitted after a book has been returned
- **Duplicate Prevention**: Users can only submit one rating and one review per book
- **Transaction Linking**: Ratings and reviews are now linked to the transaction that enabled them
- **Rejection Reasons**: Admins can provide reasons when rejecting reviews
- **Email Notifications**: Automatic email notifications sent when reviews are approved or rejected

#### Admin Features
- **Pending Approvals Page**: New admin-only page (`/admin/approvals`) to view and manage pending reviews
- **Approve/Reject Actions**: Admins can approve or reject pending reviews with reason
- **Approval History**: Track which admin approved/rejected and when

#### Frontend Enhancements
- **Borrow Button Validation**: Book details page now shows loan limit before attempting to borrow
- **Rating/Review Prompt**: Modal prompt appears after book return is approved, asking if user wants to rate/review
- **Admin Navigation**: Added "Pending Approvals" menu item to admin sidebar
- **Improved UX**: Better error messages and validation feedback

#### Backend Enhancements
- **JWT Authentication for Ratings/Reviews**: Fixed 401 errors by switching from SupabaseAuthGuard to JwtAuthGuard
- **Email Service**: New email service for sending approval/rejection notifications
- **Enhanced Database Schema**: Added approval workflow fields to ratings and reviews tables
- **API Endpoints**: New endpoints for pending approvals and approve/reject actions

### Changed

- **Authentication**: Ratings and reviews endpoints now use JwtAuthGuard instead of SupabaseAuthGuard for better compatibility
- **Database Schema**: Enhanced ratings and reviews tables with approval workflow fields (status, approvedBy, approvedAt, rejectionReason, transactionId)
- **Average Rating Calculation**: All ratings are included (ratings are immediate)
- **Review Display**: Only approved reviews are displayed to users

### Fixed

- **401 Unauthorized Error**: Fixed authentication issues with ratings/reviews APIs when using SQLite
- **Borrow Button**: Added proper loan limit checking on book details page
- **Duplicate Submissions**: Prevented users from submitting multiple ratings/reviews for the same book
- **React Hooks**: Fixed conditional hook execution errors
- **Foreign Key Constraints**: Fixed SQLite foreign key validation
- **Type Mismatches**: Fixed UUID vs TEXT type mismatches in Supabase

### Security

- **Admin-Only Actions**: Approve/reject actions are restricted to admin role only
- **Return Validation**: Server-side validation ensures users can only rate/review books they've returned
- **Email Security**: Email service requires proper SMTP configuration

## [1.0.0] - Previous Release

### Initial Features
- User authentication and authorization
- Book catalog management
- Transaction management (borrow/return)
- Basic ratings and reviews (no approval workflow)
- Multi-role support (Admin, Librarian, Member)
- Dual database support (Supabase/SQLite)
