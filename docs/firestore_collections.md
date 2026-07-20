# Firestore collections — Library Management

Collection names use the workspace prefix: `{APP_FIRESTORE_PREFIX}__{name}`.

With `APP_FIRESTORE_PREFIX=library`, documents live under `library__*`.

**Access:** NestJS backend only (Firebase Admin SDK). Client SDK access is denied by [identity-platform/firestore/firestore.rules](../../identity-platform/firestore/firestore.rules).

---

## `library__profiles`

User profile (mirrors legacy `users` / Supabase `profiles`).

| Field | Type | Notes |
|-------|------|-------|
| `email` | string | Unique |
| `name` | string | Display name |
| `role` | string | `admin` \| `member` \| `librarian` |
| `keycloakSub` | string | Keycloak subject (Phase 3+) |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `library__books`

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Required |
| `author` | string | Required |
| `isbn` | string | Optional |
| `owner_id` | string | Profile / user id |
| `count` | number | **Total copies** (default 1). Borrowing allowed while active loans &lt; count |
| `status` | string | `Available` / `Borrowed` synced from remaining copies; `Damaged` / `Reserved` are manual |
| `forSale` | boolean | Marketplace flag |
| `price` | number | Optional |
| `genre` | string | Optional |
| `tags` | string[] | Optional |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `library__transactions`

| Field | Type | Notes |
|-------|------|-------|
| `bookId` | string | |
| `memberId` | string | |
| `type` | string | `borrow` \| `return` |
| `status` | string | `active`, `pending_return_approval`, `completed` |
| `dueDate` | timestamp | Optional |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `library__ratings`

| Field | Type | Notes |
|-------|------|-------|
| `bookId` | string | |
| `memberId` | string | |
| `rating` | number | 1–5 |
| `createdAt` | timestamp | |

---

## `library__reviews`

| Field | Type | Notes |
|-------|------|-------|
| `bookId` | string | |
| `memberId` | string | |
| `content` | string | |
| `status` | string | `pending` \| `approved` \| `rejected` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `library__groups`

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | |
| `description` | string | Optional |
| `permissions` | string[] | App permission labels (e.g. `admin`, `librarian`). Always store as an **array** — migrated SQLite rows may have been JSON strings; API normalizes on read. |
| `createdBy` | string | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Not Keycloak groups.** These are library-domain groupings for the Settings UI. Identity roles live in the Keycloak realm (`admin` / `librarian` / `member`).

---

## `library__groupMembers`

| Field | Type | Notes |
|-------|------|-------|
| `groupId` | string | |
| `memberId` | string | |
| `role` | string | `owner` \| `member` |
| `joinedAt` | timestamp | |

---

## `library__reservations`

| Field | Type | Notes |
|-------|------|-------|
| `bookId` | string | |
| `memberId` | string | |
| `status` | string | `pending` \| `fulfilled` \| `cancelled` |
| `createdAt` | timestamp | |

---

## `library__notifications`

| Field | Type | Notes |
|-------|------|-------|
| `memberId` | string | |
| `type` | string | |
| `message` | string | |
| `read` | boolean | |
| `createdAt` | timestamp | |

---

## `library__bookRequests`

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | |
| `author` | string | Optional |
| `requestedBy` | string | |
| `status` | string | `pending` \| `approved` \| `rejected` |
| `createdAt` | timestamp | |

---

## `library__subscriptions`

| Field | Type | Notes |
|-------|------|-------|
| `memberId` | string | |
| `plan` | string | |
| `status` | string | `active` \| `cancelled` |
| `expiresAt` | timestamp | Optional |
| `createdAt` | timestamp | |

---

## Phase 3 scope

All **`library__*`** collections are populated by the migration script. Books CRUD via NestJS when `DATA_STORAGE=firebase` uses the same collections.

Only **`groupMembers`** tied to demo-only users may be skipped — recreate after demo users exist in Keycloak or via seed.
